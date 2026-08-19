import React, { useState, useRef, useEffect } from 'react';

const API_BASE = 'http://localhost:5001/api/ai';

// ---------------------------------------------------------------------------
// Markdown-lite renderer (bold + line breaks — no external deps needed)
// ---------------------------------------------------------------------------
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Heading
    if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-bold text-white mt-3 mb-1">{line.slice(4)}</h3>;
    if (line.startsWith('## '))  return <h2 key={i} className="text-base font-bold text-white mt-3 mb-1">{line.slice(3)}</h2>;
    if (line.startsWith('# '))   return <h1 key={i} className="text-lg font-bold text-white mt-3 mb-1">{line.slice(2)}</h1>;
    // Bold inline
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((p, j) =>
      p.startsWith('**') ? <strong key={j} className="text-white font-semibold">{p.slice(2, -2)}</strong> : p
    );
    if (line.trim() === '') return <br key={i} />;
    return <p key={i} className="leading-relaxed text-gray-300 text-xs">{rendered}</p>;
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Message {
  role: 'user' | 'ai';
  content: string;
  cached?: boolean;
}

// ---------------------------------------------------------------------------
// AI Copilot Component
// ---------------------------------------------------------------------------
const AICopilot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const analyze = async () => {
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'ai', content: '🔍 Analyzing your portfolio...' }]);
    try {
      const res = await fetch(`${API_BASE}/analyze`, { method: 'POST' });
      const data = await res.json();
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'ai', content: data.response || data.error, cached: data.cached },
      ]);
      setHasAnalyzed(true);
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'ai', content: '❌ Failed to reach AI service. Make sure all containers are running.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const ask = async () => {
    if (!input.trim() || isLoading) return;
    const question = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.response || data.error, cached: data.cached }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: '❌ Failed to reach AI service.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([{
        role: 'ai',
        content: "👋 Hi! I'm your **AI Portfolio Copilot**, powered by Gemini.\n\nClick **Analyze Portfolio** to get a full AI-driven analysis of your holdings, or ask me anything about your portfolio below!",
      }]);
    }
  };

  const suggestedQuestions = [
    'What is my most volatile holding?',
    'Am I over-concentrated in any sector?',
    'What is my total unrealized gain?',
    'Which holding has the best performance?',
  ];

  return (
    <>
      {/* ----------------------------------------------------------------- */}
      {/* Floating Trigger Button                                            */}
      {/* ----------------------------------------------------------------- */}
      {!isOpen && (
        <button
          id="ai-copilot-trigger"
          onClick={handleOpen}
          className="fixed bottom-8 right-8 z-50 group"
          title="Open AI Copilot"
        >
          {/* Pulsing ring */}
          <span className="absolute inset-0 rounded-full animate-ping bg-violet-500 opacity-30" />
          <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:shadow-[0_0_40px_rgba(139,92,246,0.7)] transition-all duration-300 hover:scale-110">
            {/* Sparkle / AI icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
          </span>
          {/* Label */}
          <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-gray-900 border border-violet-500/30 text-violet-300 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg">
            AI Copilot
          </span>
        </button>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Drawer Panel                                                        */}
      {/* ----------------------------------------------------------------- */}
      <div
        id="ai-copilot-drawer"
        className={`fixed bottom-0 right-0 z-50 h-[92vh] w-[420px] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          background: 'linear-gradient(180deg, rgba(15,13,30,0.98) 0%, rgba(10,8,25,0.99) 100%)',
          borderLeft: '1px solid rgba(139,92,246,0.2)',
          borderTop: '1px solid rgba(139,92,246,0.2)',
          borderTopLeftRadius: '20px',
          backdropFilter: 'blur(24px)',
          boxShadow: '-8px 0 40px rgba(139,92,246,0.15)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-violet-500/15">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-[0_0_12px_rgba(139,92,246,0.5)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">AI Portfolio Copilot</h2>
              <p className="text-xs text-violet-400">Powered by Gemini 1.5 Flash</p>
            </div>
          </div>
          <button
            id="ai-copilot-close"
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Analyze Button */}
        <div className="px-5 pt-4 pb-2">
          <button
            id="ai-analyze-btn"
            onClick={analyze}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: isLoading
                ? 'rgba(139,92,246,0.3)'
                : 'linear-gradient(135deg, rgba(139,92,246,0.8) 0%, rgba(99,102,241,0.8) 100%)',
              border: '1px solid rgba(139,92,246,0.4)',
              boxShadow: isLoading ? 'none' : '0 4px 20px rgba(139,92,246,0.3)',
            }}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                {hasAnalyzed ? 'Re-Analyze Portfolio' : 'Analyze My Portfolio'}
              </>
            )}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4 scrollbar-thin">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'rounded-tr-sm text-white'
                    : 'rounded-tl-sm'
                }`}
                style={
                  msg.role === 'user'
                    ? { background: 'linear-gradient(135deg, rgba(139,92,246,0.6), rgba(99,102,241,0.6))', border: '1px solid rgba(139,92,246,0.3)' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
                }
              >
                {msg.role === 'ai' ? renderMarkdown(msg.content) : <span className="text-white">{msg.content}</span>}
                {msg.cached && (
                  <span className="inline-block mt-2 text-[10px] text-violet-400/60 border border-violet-400/20 rounded-full px-2 py-0.5">
                    ⚡ cached
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Loading skeleton */}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested questions */}
        {messages.length <= 1 && (
          <div className="px-5 pb-2">
            <p className="text-[10px] text-gray-600 mb-2 uppercase tracking-wider">Suggested</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(q); }}
                  className="text-[10px] text-violet-300 border border-violet-500/20 rounded-full px-2.5 py-1 hover:bg-violet-500/10 hover:border-violet-400/40 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-5 pt-3 pb-5 border-t border-violet-500/10">
          <div className="flex gap-2 items-end">
            <textarea
              id="ai-copilot-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
              placeholder="Ask about your portfolio..."
              rows={1}
              className="flex-1 resize-none rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(139,92,246,0.2)',
                maxHeight: '100px',
              }}
              onInput={e => {
                const el = e.target as HTMLTextAreaElement;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 100) + 'px';
              }}
            />
            <button
              id="ai-copilot-send"
              onClick={ask}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-30"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.8), rgba(99,102,241,0.8))',
                border: '1px solid rgba(139,92,246,0.3)',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-gray-700 text-center mt-2">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </>
  );
};

export default AICopilot;
