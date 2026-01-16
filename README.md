# AI Agents Studio

基於 [Contains Studio Agents](https://github.com/contains-studio/agents) 專案客製化，整合 Google Gemini AI。

## 🚀 功能特色

- 📊 8 個部門分類，37 位專業 AI Agents
- 🎨 現代化深色主題介面
- 💬 Agent 對話互動介面
- 📱 響應式設計，支援行動裝置
- 🇹🇼 繁體中文在地化

## 📦 快速開始

### 安裝依賴
```bash
npm install
```

### 本地開發
```bash
npm run dev
```

### 建構生產版本
```bash
npm run build
```

## 🌐 部署到 Vercel

### 方法一：GitHub 整合（推薦）

1. 將此專案推送到 GitHub
2. 前往 [vercel.com](https://vercel.com)
3. 點擊「New Project」
4. 選擇你的 GitHub repo
5. 點擊「Deploy」

### 方法二：Vercel CLI

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 部署
vercel
```

## 🔧 技術架構

- **框架**: React 18
- **建構工具**: Vite
- **樣式**: Tailwind CSS
- **部署**: Vercel

## 📁 專案結構

```
contains-studio-app/
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx          # 主要元件
│   ├── main.jsx         # 入口點
│   └── index.css        # 全域樣式
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 🔮 未來擴展

- [ ] 串接 Claude API 實現真正的 Agent 對話
- [ ] 從 GitHub 動態載入 agent markdown 檔案
- [ ] 新增使用者認證系統
- [ ] 加入對話歷史紀錄
- [ ] 支援自訂 Agent 配置

## 📄 授權

MIT License
