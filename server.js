import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// 載入環境變數
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 55566;

// 簡易速率限制（記憶體內，每個實例獨立）
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 分鐘
const RATE_LIMIT_MAX = 20; // 每分鐘最多 20 次請求

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.startTime > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { startTime: now, count: 1 });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

// 輸入驗證常數
const MAX_MESSAGE_LENGTH = 5000;
const MAX_FIELD_LENGTH = 200;
const VALID_AGENT_NAME_PATTERN = /^[a-z0-9-]+$/;

// ============================================================
// API Key 輪換管理器
// ============================================================
const KEY_COOLDOWN_MS = 5 * 60 * 1000; // 5 分鐘冷卻

const apiKeyManager = {
  keys: [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean),
  currentIndex: 0,
  failedKeys: new Map(), // key -> failedAt timestamp

  getCurrent() {
    if (this.keys.length === 0) return null;
    // 如果當前 key 在冷卻中，嘗試找下一個可用的
    const now = Date.now();
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.currentIndex + i) % this.keys.length;
      const key = this.keys[idx];
      const failedAt = this.failedKeys.get(key);
      if (!failedAt || now - failedAt > KEY_COOLDOWN_MS) {
        this.failedKeys.delete(key);
        this.currentIndex = idx;
        return key;
      }
    }
    // 所有 key 都在冷卻中，回傳第一個（最早失敗的）
    this.currentIndex = 0;
    this.failedKeys.clear();
    return this.keys[0];
  },

  markFailed(key) {
    this.failedKeys.set(key, Date.now());
    console.warn(`[API Key] Key #${this.keys.indexOf(key) + 1} 標記失敗，冷卻 5 分鐘`);
    // 切換到下一個
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
  },

  getStatus() {
    const now = Date.now();
    return {
      totalKeys: this.keys.length,
      currentKeyIndex: this.currentIndex + 1,
      failedKeys: Array.from(this.failedKeys.entries()).map(([key, failedAt]) => ({
        keyIndex: this.keys.indexOf(key) + 1,
        cooldownRemaining: Math.max(0, Math.ceil((KEY_COOLDOWN_MS - (now - failedAt)) / 1000)) + 's',
      })),
    };
  },
};

// ============================================================
// 模型自動降級管理器
// ============================================================
const MODEL_RECOVERY_MS = 5 * 60 * 1000; // 5 分鐘後嘗試恢復

const modelFallback = {
  fallbackOrder: [
    'gemini-3.1-pro-preview',
    'gemini-3.1-pro-preview-customtools',
    'models/gemini-3-pro-image-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ],
  preferredModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  currentModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  degradedAt: null,

  getModel(requestedModel) {
    // 如果有降級且還在恢復期內，使用降級後的模型
    if (this.degradedAt && Date.now() - this.degradedAt < MODEL_RECOVERY_MS) {
      return this.currentModel;
    }
    // 恢復期過了，嘗試恢復原模型
    if (this.degradedAt && Date.now() - this.degradedAt >= MODEL_RECOVERY_MS) {
      console.log(`[Model] 嘗試恢復原模型: ${this.preferredModel}`);
      this.currentModel = this.preferredModel;
      this.degradedAt = null;
    }
    // 如果前端指定了合法模型，使用它
    if (requestedModel && this.fallbackOrder.includes(requestedModel)) {
      return requestedModel;
    }
    return this.currentModel;
  },

  degrade(failedModel) {
    const idx = this.fallbackOrder.indexOf(failedModel);
    if (idx === -1 || idx >= this.fallbackOrder.length - 1) {
      console.error(`[Model] 已經是最低級別模型，無法再降級: ${failedModel}`);
      return null;
    }
    const nextModel = this.fallbackOrder[idx + 1];
    this.currentModel = nextModel;
    this.degradedAt = Date.now();
    console.warn(`[Model] 降級: ${failedModel} → ${nextModel}`);
    return nextModel;
  },

  getStatus() {
    return {
      preferredModel: this.preferredModel,
      currentModel: this.currentModel,
      isDegraded: this.currentModel !== this.preferredModel,
      degradedAt: this.degradedAt ? new Date(this.degradedAt).toISOString() : null,
      recoveryIn: this.degradedAt
        ? Math.max(0, Math.ceil((MODEL_RECOVERY_MS - (Date.now() - this.degradedAt)) / 1000)) + 's'
        : null,
    };
  },
};

// ============================================================
// Gemini API 呼叫（含 retry + fallback）
// ============================================================
const MAX_RETRIES = 2;

async function callGeminiAPI(apiKey, model, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function callWithRetry(requestBody, requestedModel) {
  let currentModel = modelFallback.getModel(requestedModel);
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const apiKey = apiKeyManager.getCurrent();
    if (!apiKey) {
      return { error: '沒有可用的 API Key', status: 500 };
    }

    try {
      const response = await callGeminiAPI(apiKey, currentModel, requestBody);

      if (response.ok) {
        const data = await response.json();
        return { data, model: currentModel };
      }

      const errorData = await response.json().catch(() => ({}));
      const status = response.status;
      console.error(`[Retry ${attempt + 1}/${MAX_RETRIES + 1}] Gemini API Error (${status}):`, errorData);

      // 400/401/403: API Key 問題 → 換 key 重試
      // Gemini API 用 400 INVALID_ARGUMENT 回報無效 key
      const isKeyError = status === 401 || status === 403 ||
        (status === 400 && errorData?.error?.message?.toLowerCase().includes('api key'));
      if (isKeyError) {
        apiKeyManager.markFailed(apiKey);
        lastError = { error: 'API Key 驗證失敗', status };
        continue;
      }

      // 429: 速率限制 → 換 key 重試（不是模型問題）
      if (status === 429) {
        apiKeyManager.markFailed(apiKey);
        lastError = { error: 'API Key 速率限制，切換 Key 重試', status };
        continue;
      }

      // 404: 模型不存在 → 降級重試
      if (status === 404) {
        const failedModel = currentModel;
        const nextModel = modelFallback.degrade(failedModel);
        if (nextModel) {
          currentModel = nextModel;
          lastError = { error: `模型 ${failedModel} 不可用，已降級至 ${nextModel}`, status };
          continue;
        }
      }

      // 其他錯誤，不重試
      return { error: 'AI 服務暫時無法回應，請稍後再試', status };

    } catch (err) {
      console.error(`[Retry ${attempt + 1}/${MAX_RETRIES + 1}] Network error:`, err.message);
      lastError = { error: '網路連線錯誤', status: 502 };
    }
  }

  return lastError || { error: 'AI 服務暫時無法回應，請稍後再試', status: 500 };
}

// 定期清理過期的速率限制記錄，防止記憶體洩漏
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap) {
    if (now - record.startTime > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

// Middleware
app.use(express.json({ limit: '16kb' }));
app.use(cors({
  origin: [
    'http://localhost:55566',
    'http://127.0.0.1:55566',
    'http://localhost:5173',
    'http://localhost:8080',
    process.env.CORS_ORIGIN || 'http://localhost:55566'
  ],
  credentials: true
}));

// 健康檢查端點（公開，僅回傳最小資訊）
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 狀態端點 — 需要 ADMIN_TOKEN 認證
app.get('/status', (req, res) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return res.status(503).json({ error: 'ADMIN_TOKEN 未設定，/status 端點已停用' });
  }
  const token = req.headers['x-admin-token'];
  if (!token || token !== adminToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    apiKeys: apiKeyManager.getStatus(),
    model: modelFallback.getStatus(),
  });
});

// Chat API 端點
app.post('/api/chat', async (req, res) => {
  // 速率限制檢查
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: '請求過於頻繁，請稍後再試' });
  }

  try {
    const { message, agentName, agentTitle, agentDesc, model } = req.body;

    // 輸入驗證
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: '訊息為必填欄位' });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `訊息長度不可超過 ${MAX_MESSAGE_LENGTH} 字元` });
    }

    if (agentName && (typeof agentName !== 'string' || !VALID_AGENT_NAME_PATTERN.test(agentName))) {
      return res.status(400).json({ error: '無效的 Agent 名稱' });
    }

    if (agentTitle && (typeof agentTitle !== 'string' || agentTitle.length > MAX_FIELD_LENGTH)) {
      return res.status(400).json({ error: '無效的 Agent 標題' });
    }

    if (agentDesc && (typeof agentDesc !== 'string' || agentDesc.length > MAX_FIELD_LENGTH)) {
      return res.status(400).json({ error: '無效的 Agent 描述' });
    }

    // 驗證模型參數
    const allowedModels = modelFallback.fallbackOrder;
    const requestedModel = model && allowedModels.includes(model) ? model : null;

    if (apiKeyManager.keys.length === 0) {
      console.error('No GEMINI_API_KEY configured');
      return res.status(500).json({ error: '服務暫時無法使用' });
    }

    // 建立 Agent 專屬的 System Prompt
    const systemPrompt = buildAgentPrompt(agentName, agentTitle, agentDesc);

    // 建立請求 body
    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n使用者問題：${message}` }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ]
    };

    // 呼叫 Gemini API（含自動重試與降級）
    const result = await callWithRetry(requestBody, requestedModel);

    if (result.error) {
      return res.status(result.status || 500).json({ error: result.error });
    }

    // 提取回應文字
    const reply = result.data.candidates?.[0]?.content?.parts?.[0]?.text || '抱歉，我無法產生回應。';

    return res.status(200).json({
      reply,
      _meta: { model: result.model },
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: '伺服器發生錯誤，請稍後再試' });
  }
});

// 根據 Agent 類型建立專屬 System Prompt
function buildAgentPrompt(agentName, agentTitle, agentDesc) {
  if (agentDesc) {
    return `你是「${agentTitle || agentName}」。\n${agentDesc}`;
  }

  const agentPrompts = {
    // 簡化版本 - 實務上應該保持原有的詳細提示
    'default': '你是一個有幫助的 AI 助手，請用繁體中文回答。'
  };

  return agentPrompts[agentName] || agentPrompts['default'];
}

// 錯誤處理
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: '伺服器發生預期外的錯誤' });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`\n✅ Contains Studio API Server running on http://localhost:${PORT}`);
  console.log(`📍 Chat endpoint: POST http://localhost:${PORT}/api/chat`);
  console.log(`❤️  Health check: GET http://localhost:${PORT}/health`);
  console.log(`📊 Status: GET http://localhost:${PORT}/status`);
  console.log(`🔑 API Keys loaded: ${apiKeyManager.keys.length}`);
  console.log(`🤖 Current model: ${modelFallback.currentModel}`);
  console.log(`\nDOC: openclaw 可以呼叫 http://localhost:${PORT}/api/chat\n`);
});
