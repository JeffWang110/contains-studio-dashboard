# API Recover Skill

Clawdbot API 配置修復技能。用於診斷和修復 VPS 上 clawdbot agents 的 API 錯誤，包括模型名稱錯誤、API key 問題、端口衝突等。

## 適用場景

當 Telegram bot 出現以下錯誤時使用此技能：
- `Agent failed before reply: Unknown model: xxx`
- `401 Incorrect API key provided`
- `Gateway failed to start: another gateway instance is already listening`
- `Port xxxx is already in use`

## VPS 連線資訊

```bash
ssh root@68.183.229.181
```

## Bot 配置位置

| Bot | Profile 目錄 | 配置文件 | Gateway Port |
|-----|-------------|---------|--------------|
| Joanna | `/root/.clawdbot-joanna/` | `clawdbot.json` | 55556 |
| Robinson | `/root/.clawdbot-robinson/` | `clawdbot.json` | 55557 |
| Amy | `/root/.clawdbot-amy/` | `clawdbot.json` | 55560 |
| Neo | `/root/.clawdbot-neo/` | `clawdbot.json` | - |

## 診斷步驟

### 1. 檢查 PM2 狀態

```bash
pm2 list
```

### 2. 查看錯誤日誌

```bash
# 查看特定 bot 日誌
pm2 logs <bot-name> --lines 30 --nostream

# 或直接查看日誌文件
tail -30 /root/.pm2/logs/<bot-name>-error.log
tail -30 /root/.pm2/logs/<bot-name>-out.log
```

### 3. 檢查可用模型

```bash
clawdbot models list
```

### 4. 查看當前配置

```bash
cat /root/.clawdbot-<bot-name>/clawdbot.json
```

## 常見問題修復

### 問題 1: Unknown model 錯誤

**症狀**: `Unknown model: google/gemini-3.0-flash-preview-05-14`

**原因**: 配置文件中使用了不存在的模型名稱

**修復**:

```bash
# 1. 查看可用模型
clawdbot models list

# 2. 修復模型名稱 (將錯誤的模型名改為正確的)
sed -i 's/google\/gemini-3.0-flash-preview-05-14/google\/gemini-3-flash-preview/g' /root/.clawdbot-<bot-name>/clawdbot.json

# 3. 驗證修改
grep -A2 primary /root/.clawdbot-<bot-name>/clawdbot.json

# 4. 重啟 bot
pm2 restart <bot-name>
```

**批量修復所有 bot**:

```bash
for bot in robinson joanna amy; do
  sed -i 's/google\/gemini-3.0-flash-preview-05-14/google\/gemini-3-flash-preview/g' /root/.clawdbot-$bot/clawdbot.json
done
pm2 restart robinson joanna amy
```

### 問題 2: 端口衝突

**症狀**: `Port 55560 is already in use` 或 `Gateway failed to start: another gateway instance is already listening`

**修復**:

```bash
# 1. 找出占用端口的進程
fuser 55560/tcp

# 2. 強制終止占用端口的進程
fuser -k 55560/tcp

# 3. 或使用 clawdbot 命令停止
clawdbot --profile <bot-name> gateway stop

# 4. 重啟 bot
pm2 restart <bot-name>
```

### 問題 3: API Key 錯誤

**症狀**: `401 Incorrect API key provided`

**檢查 API Key 配置**:

```bash
# 查看 ecosystem.config.js 中的環境變數
cat /root/ecosystem.config.js

# API Key 應該在 env 區塊中
# GOOGLE_API_KEY: "..."
# GOOGLE_GENERATIVE_AI_API_KEY: "..."
```

**更新 API Key**:

```bash
# 編輯 ecosystem.config.js
nano /root/ecosystem.config.js

# 更新後重新載入 PM2
pm2 reload ecosystem.config.js --update-env
```

## 驗證修復

### 確認 bot 狀態

```bash
pm2 list
```

### 確認模型配置

```bash
# 查看每個 bot 最新的模型設定
grep 'agent model' /root/.pm2/logs/robinson-out.log | tail -1
grep 'agent model' /root/.pm2/logs/joanna-out.log | tail -1
grep 'agent model' /root/.pm2/logs/amy-out.log | tail -1
```

### 確認 gateway 正常啟動

日誌應該顯示：
```
[heartbeat] started
[gateway] agent model: google/gemini-3-flash-preview
[gateway] listening on ws://127.0.0.1:xxxxx
[telegram] [default] starting provider (@bot_name)
```

## 相關文件

- PM2 ecosystem 配置: `/root/ecosystem.config.js`
- Clawdbot 全域配置: `/root/.clawdbot/`
- 日誌目錄: `/root/.pm2/logs/`
- Telegram 配置: `/root/.clawdbot-<bot>/credentials/telegram.json`

## 緊急重啟所有 bot

```bash
# 停止所有 bot
pm2 stop all

# 清理可能的端口占用
fuser -k 55556/tcp 55557/tcp 55560/tcp 2>/dev/null

# 重啟所有 bot
pm2 restart all

# 查看狀態
pm2 list
```
