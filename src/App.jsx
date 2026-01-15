import React, { useState, useEffect } from 'react';

// Stripe 付費牆組件
const StripePaymentLink = ({ url }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
    <div className="bg-white/10 backdrop-blur rounded-3xl p-8 max-w-md text-center border border-white/20">
      <div className="text-6xl mb-4">🔒</div>
      <h2 className="text-2xl font-bold text-white mb-3">免費額度已用完</h2>
      <p className="text-gray-400 mb-6">
        您已使用 3 次免費分析。升級至專業版以獲得無限次分析功能！
      </p>
      <a
        href={url || "https://buy.stripe.com/your-payment-link"}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-bold hover:opacity-90 transition shadow-lg"
      >
        升級專業版 💎
      </a>
      <p className="text-gray-500 text-sm mt-4">
        支援信用卡、Apple Pay、Google Pay
      </p>
    </div>
  </div>
);

// 用戶狀態管理（模擬）
const useUser = () => {
  const [analysisCount, setAnalysisCount] = useState(() => {
    const saved = localStorage.getItem('analysisCount');
    return saved ? parseInt(saved) : 0;
  });

  const [isPaid, setIsPaid] = useState(() => {
    return localStorage.getItem('isPaid') === 'true';
  });

  const incrementAnalysis = () => {
    const newCount = analysisCount + 1;
    setAnalysisCount(newCount);
    localStorage.setItem('analysisCount', newCount.toString());
  };

  return { analysisCount, isPaid, incrementAnalysis, setIsPaid };
};

const departments = [
  {
    id: 'engineering',
    name: '工程部',
    nameEn: 'Engineering',
    icon: '💻',
    color: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    border: 'border-blue-200',
    textColor: 'text-blue-600',
    agents: [
      { name: 'rapid-prototyper', title: '快速原型師', desc: '在幾天內建立 MVP，而非幾週' },
      { name: 'ai-engineer', title: 'AI 工程師', desc: '整合可落地的 AI/ML 功能' },
      { name: 'backend-architect', title: '後端架構師', desc: '設計可擴展的 API 與伺服器系統' },
      { name: 'frontend-developer', title: '前端開發者', desc: '建構高效能使用者介面' },
      { name: 'mobile-app-builder', title: '行動應用開發', desc: '打造原生 iOS/Android 體驗' },
      { name: 'devops-automator', title: 'DevOps 自動化', desc: '持續部署不中斷服務' },
      { name: 'test-writer-fixer', title: '測試撰寫修復', desc: '撰寫能抓到真正 bug 的測試' },
    ]
  },
  {
    id: 'design',
    name: '設計部',
    nameEn: 'Design',
    icon: '🎨',
    color: 'from-purple-500 to-purple-600',
    bgLight: 'bg-purple-50',
    border: 'border-purple-200',
    textColor: 'text-purple-600',
    agents: [
      { name: 'ui-designer', title: 'UI 設計師', desc: '設計開發者能實際建構的介面' },
      { name: 'ux-researcher', title: 'UX 研究員', desc: '將使用者洞察轉化為產品改進' },
      { name: 'brand-guardian', title: '品牌守護者', desc: '確保視覺識別一致性' },
      { name: 'visual-storyteller', title: '視覺敘事師', desc: '創造能轉換與分享的視覺內容' },
      { name: 'whimsy-injector', title: '驚喜注入師', desc: '為每個互動添加愉悅感' },
    ]
  },
  {
    id: 'marketing',
    name: '行銷部',
    nameEn: 'Marketing',
    icon: '📣',
    color: 'from-orange-500 to-orange-600',
    bgLight: 'bg-orange-50',
    border: 'border-orange-200',
    textColor: 'text-orange-600',
    agents: [
      { name: 'growth-hacker', title: '成長駭客', desc: '發現並利用病毒式成長迴圈' },
      { name: 'content-creator', title: '內容創作者', desc: '跨平台生成內容' },
      { name: 'tiktok-strategist', title: 'TikTok 策略師', desc: '創造可分享的行銷時刻' },
      { name: 'twitter-engager', title: 'Twitter 互動師', desc: '搭上趨勢達成病毒式傳播' },
      { name: 'reddit-community-builder', title: 'Reddit 社群建立者', desc: '在 Reddit 贏得關注而不被封禁' },
      { name: 'app-store-optimizer', title: '應用商店優化師', desc: '主宰應用商店搜尋結果' },
    ]
  },
  {
    id: 'product',
    name: '產品部',
    nameEn: 'Product',
    icon: '📦',
    color: 'from-green-500 to-green-600',
    bgLight: 'bg-green-50',
    border: 'border-green-200',
    textColor: 'text-green-600',
    agents: [
      { name: 'trend-researcher', title: '趨勢研究員', desc: '識別病毒式機會' },
      { name: 'feedback-synthesizer', title: '回饋整合師', desc: '將抱怨轉化為功能' },
      { name: 'sprint-prioritizer', title: 'Sprint 排序師', desc: '在 6 天內交付最大價值' },
    ]
  },
  {
    id: 'project-management',
    name: '專案管理',
    nameEn: 'Project Management',
    icon: '📋',
    color: 'from-indigo-500 to-indigo-600',
    bgLight: 'bg-indigo-50',
    border: 'border-indigo-200',
    textColor: 'text-indigo-600',
    agents: [
      { name: 'project-shipper', title: '專案交付師', desc: '確保產品順利上線不崩潰' },
      { name: 'studio-producer', title: '工作室製作人', desc: '讓團隊專注交付而非開會' },
      { name: 'experiment-tracker', title: '實驗追蹤師', desc: '數據驅動的功能驗證' },
    ]
  },
  {
    id: 'studio-operations',
    name: '營運部',
    nameEn: 'Studio Operations',
    icon: '⚙️',
    color: 'from-gray-500 to-gray-600',
    bgLight: 'bg-gray-50',
    border: 'border-gray-200',
    textColor: 'text-gray-600',
    agents: [
      { name: 'analytics-reporter', title: '數據分析報告', desc: '將數據轉化為可行動的洞察' },
      { name: 'finance-tracker', title: '財務追蹤師', desc: '保持工作室獲利' },
      { name: 'infrastructure-maintainer', title: '基礎設施維護', desc: '擴展規模而不超支' },
      { name: 'legal-compliance-checker', title: '法規合規檢查', desc: '快速行動同時保持合法' },
      { name: 'support-responder', title: '客服回應師', desc: '將憤怒用戶轉化為擁護者' },
    ]
  },
  {
    id: 'testing',
    name: '測試部',
    nameEn: 'Testing',
    icon: '🧪',
    color: 'from-red-500 to-red-600',
    bgLight: 'bg-red-50',
    border: 'border-red-200',
    textColor: 'text-red-600',
    agents: [
      { name: 'api-tester', title: 'API 測試師', desc: '確保 API 在壓力下正常運作' },
      { name: 'performance-benchmarker', title: '效能評測師', desc: '讓一切變得更快' },
      { name: 'test-results-analyzer', title: '測試結果分析', desc: '在測試失敗中找出規律' },
      { name: 'tool-evaluator', title: '工具評估師', desc: '選擇真正有幫助的工具' },
      { name: 'workflow-optimizer', title: '流程優化師', desc: '消除工作流程瓶頸' },
    ]
  },
  {
    id: 'bonus',
    name: '特別組',
    nameEn: 'Bonus',
    icon: '✨',
    color: 'from-pink-500 to-pink-600',
    bgLight: 'bg-pink-50',
    border: 'border-pink-200',
    textColor: 'text-pink-600',
    agents: [
      { name: 'studio-coach', title: '工作室教練', desc: '召集 AI 團隊達成卓越' },
      { name: 'joker', title: '開心果', desc: '用科技幽默緩和氣氛' },
    ]
  },
  {
    id: 'health',
    name: '健康部',
    nameEn: 'Health & Fitness',
    icon: '🏃',
    color: 'from-teal-500 to-teal-600',
    bgLight: 'bg-teal-50',
    border: 'border-teal-200',
    textColor: 'text-teal-600',
    agents: [
      {
        name: 'health-coach',
        title: '動作分析教練',
        desc: '專業的身體動作分析，提供姿勢矯正與訓練計畫',
        features: ['video-analysis', 'posture-check', 'training-plan'],
        systemPrompt: '你是一位專業的身體動作分析教練，能夠分析用戶的運動姿勢、提供姿勢矯正建議、制定個人化訓練計畫。'
      },
      { name: 'nutrition-advisor', title: '營養顧問', desc: '制定個人化飲食與營養計畫' },
      { name: 'fitness-tracker', title: '健身追蹤師', desc: '追蹤運動數據並分析進步趨勢' },
    ]
  },
];

function App() {
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');

  // 付費牆相關狀態
  const { analysisCount, isPaid, incrementAnalysis } = useUser();

  // 檢查是否需要顯示付費牆（health-coach 專用）
  const isHealthCoach = selectedAgent?.name === 'health-coach';
  const showPaywall = isHealthCoach && !isPaid && analysisCount >= 3;

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMsg = inputValue;
    setInputValue('');

    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    // 如果是 health-coach，增加分析次數
    if (isHealthCoach) {
      incrementAnalysis();
    }

    // 模擬 AI 回應
    setTimeout(() => {
      let response = `[${selectedAgent.title}] 收到您的訊息！\n\n`;

      if (isHealthCoach) {
        response += `🏃 身體動作分析報告\n\n`;
        response += `在實際部署環境中，這裡會分析您上傳的影片或描述的動作問題。\n\n`;
        response += `功能包含：\n`;
        response += `• 📹 影片動作分析\n`;
        response += `• 🧘 姿勢矯正建議\n`;
        response += `• 📋 個人化訓練計畫\n\n`;
        response += `（本次為第 ${analysisCount + 1}/3 次免費分析）`;
      } else {
        response += `在實際部署環境中，這裡會連接 Claude API 並使用對應的 agent system prompt 來回應您的需求。\n\n`;
        response += `您可以嘗試詢問與「${selectedAgent.desc}」相關的問題。`;
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response
      }]);
    }, 500);
  };

  // 付費牆檢查 - 顯示 Stripe 付款連結
  if (showPaywall) {
    return <StripePaymentLink url="https://buy.stripe.com/your-payment-link" />;
  }

  // 對話介面
  if (selectedAgent) {
    const dept = departments.find(d => d.id === selectedDept);
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* Header */}
        <div className={`bg-gradient-to-r ${dept.color} text-white p-4 shadow-lg`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button 
              onClick={() => { setSelectedAgent(null); setMessages([]); }}
              className="p-2 hover:bg-white/20 rounded-lg transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              返回
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">
                {isHealthCoach ? '🏃' : '🤖'}
              </div>
              <div>
                <h1 className="font-bold text-lg">{selectedAgent.title}</h1>
                <p className="text-sm opacity-80 font-mono">{selectedAgent.name}</p>
              </div>
            </div>
            {/* 顯示剩餘免費分析次數（僅 health-coach） */}
            {isHealthCoach && !isPaid && (
              <div className="ml-auto bg-white/20 px-3 py-1 rounded-full text-sm">
                剩餘 {Math.max(0, 3 - analysisCount)} 次免費分析
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400">
              <div className="text-6xl mb-4">🤖</div>
              <p className="text-lg font-medium text-gray-600">{selectedAgent.title}</p>
              <p className="text-sm text-gray-500">{selectedAgent.desc}</p>
              <p className="mt-6 text-sm bg-white px-4 py-2 rounded-full shadow">
                👋 開始對話來體驗此 Agent
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? `bg-gradient-to-r ${dept.color} text-white rounded-br-sm` 
                      : 'bg-white shadow-md rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t bg-white p-4">
          <div className="max-w-4xl mx-auto flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={`詢問 ${selectedAgent.title}...`}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition"
            />
            <button
              onClick={handleSendMessage}
              className={`px-6 py-3 bg-gradient-to-r ${dept.color} text-white rounded-xl hover:opacity-90 transition font-medium flex items-center gap-2`}
            >
              發送
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Agent 列表
  if (selectedDept) {
    const dept = departments.find(d => d.id === selectedDept);
    
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className={`bg-gradient-to-r ${dept.color} text-white p-6 shadow-lg`}>
          <div className="max-w-6xl mx-auto">
            <button 
              onClick={() => setSelectedDept(null)}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              返回部門選擇
            </button>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
                {dept.icon}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{dept.name}</h1>
                <p className="opacity-80">{dept.nameEn} · {dept.agents.length} 位 Agents</p>
              </div>
            </div>
          </div>
        </div>

        {/* Agent Grid */}
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dept.agents.map((agent) => (
              <button
                key={agent.name}
                onClick={() => setSelectedAgent(agent)}
                className={`p-5 rounded-xl bg-white border-2 ${dept.border} text-left hover:shadow-xl hover:scale-[1.02] transition-all duration-200 group`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${dept.color} flex items-center justify-center text-white text-xl flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    💬
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-800 text-lg">{agent.title}</h3>
                    <p className="text-xs text-gray-400 font-mono truncate">{agent.name}</p>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{agent.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 部門選擇首頁
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="text-center py-12 px-4">
        <div className="text-6xl mb-4">🏢</div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
          Contains Studio
        </h1>
        <p className="text-xl text-gray-400">AI Agents 部門介面</p>
        <p className="text-gray-500 mt-2">選擇部門以檢視可用的 AI Agents</p>
      </div>

      {/* Stats */}
      <div className="max-w-2xl mx-auto px-6 mb-8">
        <div className="bg-white/5 backdrop-blur rounded-2xl p-4 flex justify-around text-center">
          <div>
            <div className="text-3xl font-bold text-white">{departments.length}</div>
            <div className="text-gray-400 text-sm">部門</div>
          </div>
          <div className="border-l border-white/10" />
          <div>
            <div className="text-3xl font-bold text-white">
              {departments.reduce((sum, d) => sum + d.agents.length, 0)}
            </div>
            <div className="text-gray-400 text-sm">AI Agents</div>
          </div>
          <div className="border-l border-white/10" />
          <div>
            <div className="text-3xl font-bold text-white">6天</div>
            <div className="text-gray-400 text-sm">Sprint 週期</div>
          </div>
        </div>
      </div>

      {/* Department Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setSelectedDept(dept.id)}
              className="group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur border border-white/10 hover:border-white/30 p-6 text-left transition-all duration-300 hover:scale-[1.03] hover:bg-white/10"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${dept.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                {dept.icon}
              </div>
              
              <h2 className="text-xl font-bold text-white mb-1">{dept.name}</h2>
              <p className="text-gray-400 text-sm mb-3">{dept.nameEn}</p>
              
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-sm">👥 {dept.agents.length} Agents</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-gray-500 text-sm border-t border-white/5">
        <p>基於 Contains Studio Agents 專案</p>
        <p className="mt-1">⚡ 6 天 Sprint 快速開發流程</p>
      </div>
    </div>
  );
}

export default App;
