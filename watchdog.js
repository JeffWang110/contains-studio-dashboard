import { appendFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const WATCH_URL = process.env.WATCHDOG_URL || 'http://localhost:55566/health';
const CHECK_INTERVAL = parseInt(process.env.WATCHDOG_INTERVAL, 10) || 30000;
const MAX_FAILURES = parseInt(process.env.WATCHDOG_MAX_FAILURES, 10) || 3;
const PM2_APP_NAME = process.env.WATCHDOG_PM2_NAME || 'contains-studio-api';
const LOG_FILE = path.join(__dirname, 'watchdog.log');
const RESTART_COOLDOWN = 2 * 60 * 1000; // 2 分鐘

// 驗證 PM2 app 名稱，防止命令注入
if (!/^[a-zA-Z0-9_-]+$/.test(PM2_APP_NAME)) {
  console.error(`無效的 PM2 app 名稱: ${PM2_APP_NAME}`);
  process.exit(1);
}

let consecutiveFailures = 0;
let lastRestartAt = 0;

async function log(level, message) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  console.log(line);
  await appendFile(LOG_FILE, line + '\n').catch(() => {});
}

async function checkHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(WATCH_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      if (consecutiveFailures > 0) {
        await log('INFO', `服務恢復正常 (之前連續失敗 ${consecutiveFailures} 次)`);
      }
      consecutiveFailures = 0;
      return true;
    }

    consecutiveFailures++;
    await log('WARN', `健康檢查失敗 (HTTP ${response.status}) [${consecutiveFailures}/${MAX_FAILURES}]`);
    return false;

  } catch (err) {
    consecutiveFailures++;
    await log('WARN', `健康檢查失敗 (${err.message}) [${consecutiveFailures}/${MAX_FAILURES}]`);
    return false;
  }
}

async function restartService() {
  const now = Date.now();
  if (now - lastRestartAt < RESTART_COOLDOWN) {
    const remaining = Math.ceil((RESTART_COOLDOWN - (now - lastRestartAt)) / 1000);
    await log('WARN', `重啟冷卻中，${remaining}s 後再嘗試`);
    return;
  }

  await log('ERROR', `連續 ${MAX_FAILURES} 次健康檢查失敗，嘗試重啟 ${PM2_APP_NAME}`);
  lastRestartAt = now;

  try {
    const { execFile } = await import('child_process');
    await new Promise((resolve, reject) => {
      execFile('pm2', ['restart', PM2_APP_NAME], (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout);
      });
    });
    await log('INFO', `pm2 restart ${PM2_APP_NAME} 執行成功，等待下次健康檢查確認`);
  } catch (err) {
    await log('ERROR', `pm2 restart 失敗: ${err.message}`);
  }
}

async function tick() {
  const healthy = await checkHealth();

  if (!healthy && consecutiveFailures >= MAX_FAILURES) {
    await restartService();
  }
}

// 啟動
await log('INFO', `Watchdog 啟動 — 監控 ${WATCH_URL}，每 ${CHECK_INTERVAL / 1000}s 檢查一次`);
await tick(); // 立即檢查一次
setInterval(tick, CHECK_INTERVAL);
