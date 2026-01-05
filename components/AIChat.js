"use client";
import React, { useState, useEffect } from 'react';

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aiChatHistory') || '[]'); } catch (e) { return []; }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => { localStorage.setItem('aiChatHistory', JSON.stringify(messages)); }, [messages]);

  // Keyboard shortcut: Ctrl/Cmd+K to open chat
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function send() {
    if (!query.trim()) return;
    const userMsg = { role: 'user', text: query, ts: Date.now() };
    setMessages(m => [...m, userMsg]);
    setQuery('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: userMsg.text }) });
      const data = await res.json();
      const aiMsg = { role: 'ai', text: data.answer || data.insight || data.error || 'No response', ts: Date.now() };
      setMessages(m => [...m, aiMsg]);
    } catch (e) {
      setMessages(m => [...m, { role: 'ai', text: 'Error contacting AI', ts: Date.now() }]);
    } finally { setLoading(false); }
  }

  return (
    <div>
      <button aria-label="Open AI Chat (Ctrl/Cmd+K)" title="Ask AI (Ctrl/Cmd+K)" className="ai-chat-button large" onClick={() => setOpen(true)}>
        <span className="ai-icon">💬</span>
        <span>Ask AI</span>
      </button>

      {open && (
        <div className="ai-chat-modal-overlay" onClick={() => setOpen(false)}>
          <div className="ai-chat-panel" role="dialog" aria-modal="true" aria-label="AI Chat" onClick={e=>e.stopPropagation()}>
            <div className="ai-chat-header">
              <strong>AI Chat</strong>
              <div>
                <button className="btn secondary" onClick={()=>setOpen(false)}>Close</button>
              </div>
            </div>

            <div className="ai-chat-history">
              {messages.length===0 && <div style={{color:'#556'}}>Ask a question about your finances, e.g. "How much did I spend on food last month?"</div>}
              {messages.map((m, i) => (
                <div className="ai-chat-message" key={i}>
                  <div className="role">{m.role}</div>
                  <div className={m.role==='user' ? 'ai-chat-message-user' : 'ai-chat-message-ai'}>{m.text}</div>
                </div>
              ))}
            </div>

            <div className="ai-chat-controls">
              <input className="ai-chat-input" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault(); send();}}} placeholder="Ask a question..." />
              <button className="btn" onClick={send} disabled={loading}>{loading? '...' : 'Send'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
