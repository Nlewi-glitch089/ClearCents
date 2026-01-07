"use client";
import React, { useState, useEffect } from 'react';

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [isStaff, setIsStaff] = useState(false);
  // only persist history for non-staff users
  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/me', { credentials: 'same-origin' }).then(r=>r.json()).then(d=>{
      if (!mounted) return;
      const role = d?.user?.role || null;
      const staff = role === 'coach' || role === 'instructor';
      setIsStaff(staff);
      if (!staff) {
        try { const stored = JSON.parse(localStorage.getItem('aiChatHistory') || '[]'); setMessages(stored); } catch(e) { console.error('Silent failure detected [ai-chat:localstorage-parse]', e); setMessages([]); }
      } else {
        setMessages([]);
      }
    }).catch(e=>{ console.error('Silent failure detected [ai-chat:fetch-me]', e); setIsStaff(false); try { const stored = JSON.parse(localStorage.getItem('aiChatHistory') || '[]'); setMessages(stored); } catch(e) { console.error('Silent failure detected [ai-chat:localstorage-parse]', e); setMessages([]); } });
    return () => mounted = false;
  }, []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isStaff) {
      try { localStorage.setItem('aiChatHistory', JSON.stringify(messages)); } catch (e) { console.error('Silent failure detected [ai-chat:localstorage-save]', e); }
    }
  }, [messages, isStaff]);

  const scrollRef = React.useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  // Suggestions when a transaction is added by staff
  const [suggestions, setSuggestions] = useState([]);
  useEffect(() => {
    function onTx(e) {
      const tx = e?.detail || {};
      const sugg = [];
      const amt = tx.amount ? `$${Number(tx.amount).toFixed(2)}` : '';
      const desc = tx.description || '';
      sugg.push(`What category should I assign this ${tx.type || 'transaction'} (${amt} ${desc}) to?`);
      sugg.push(`Is this a recurring ${tx.type || 'expense'}? How can I track recurring payments?`);
      sugg.push(`Is ${amt} likely tax-deductible or related to school expenses?`);
      sugg.push(`How will this ${tx.type || 'transaction'} affect my savings rate this month?`);
      sugg.push(`Any tips to reduce similar ${tx.type === 'income' ? 'missed income opportunities' : 'expenses'} in the future?`);
      setSuggestions(sugg);
      setOpen(true);
    }
    window.addEventListener('transaction:added', onTx);
    return () => window.removeEventListener('transaction:added', onTx);
  }, []);

  function renderAiText(text) {
    if (!text) return null;
    // Instead of linking out to third-party budgeting apps, point budgeting
    // suggestions to a single neutral educational resource.
    const replacementBudgetingResource = 'https://www.consumerfinance.gov/consumer-tools/budgeting/';

    function findUrlInText(t) {
      if (!t) return null;
      const m = t.match(/https?:\/\/[\w\-._~:\/\?#\[\]@!$&'()*+,;=%]+/i);
      return m ? m[0] : null;
    }

    function linkify(t, title) {
      if (!t) return null;
      const parts = t.split(/(https?:\/\/[\w\-._~:\/?#\[\]@!$&'()*+,;=%]+)/g);
      return parts.map((p, idx) => {
        if (/^https?:\/\//.test(p)) {
          // determine label: prefer the suggestion title when it looks like a budgeting suggestion
          let label = null;
          if (title && /budget/i.test(title)) label = 'Budgeting Resources';
          if (!label) {
            try {
              const u = new URL(p);
              label = u.hostname.replace(/^www\./, '');
            } catch (e) {
              label = p;
            }
          }
          return <a key={`a-${idx}`} href={p} target="_blank" rel="noopener noreferrer" style={{color:'var(--accent)', textDecoration:'underline'}}>{label}</a>;
        }
        return <span key={`t-${idx}`}>{p}</span>;
      });
    }
    const lines = text.split(/\r?\n/);
    const nodes = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      // match numbered suggestions like: 1. **Title**: description
      const numMatch = line.match(/^\s*\d+\.\s*\*\*(.+?)\*\*[:\-]?\s*(.*)$/);
      const boldMatch = line.match(/^\s*\*\*(.+?)\*\*[:\-]?\s*(.*)$/);
      if (numMatch) {
        const title = numMatch[1];
        const desc = numMatch[2] || '';
          const rawTitleKey = title.toLowerCase().replace(/\s*\(.*\)/, '').trim();
          // If the title looks like a budgeting app or mentions budget, don't link to the app.
          const isBudgetAppName = /^(mint|ynab|pocketguard|everydollar)$/.test(rawTitleKey) || /budget/i.test(rawTitleKey);
          const href = findUrlInText(desc) || (isBudgetAppName ? replacementBudgetingResource : null);
        const titleNode = href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" style={{color:'var(--accent)', textDecoration:'underline', fontWeight:700, display:'inline-block'}} className="ai-link">{title}</a>
        ) : (
          <span style={{fontWeight:700, display:'inline-block'}}>{title}</span>
        );
        nodes.push(
          <div key={`s-${i}`} style={{marginBottom:10}}>
            <div style={{padding:'6px 10px', background:'#fff3e6', borderRadius:8, display:'inline-block'}}>{titleNode}</div>
            {desc ? <div style={{marginTop:6, color:'#222'}}>{linkify(desc, title)}</div> : null}
          </div>
        );
        i++;
        continue;
      } else if (boldMatch) {
        const title = boldMatch[1];
        const desc = boldMatch[2] || '';
        const rawTitleKey = title.toLowerCase().replace(/\s*\(.*\)/, '').trim();
        const isBudgetAppName = /^(mint|ynab|pocketguard|everydollar)$/.test(rawTitleKey) || /budget/i.test(rawTitleKey);
        const href = findUrlInText(desc) || (isBudgetAppName ? replacementBudgetingResource : null);
        const titleNode = href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" style={{color:'var(--accent)', textDecoration:'underline', fontWeight:700, display:'inline-block'}} className="ai-link">{title}</a>
        ) : (
          <span style={{fontWeight:700, display:'inline-block'}}>{title}</span>
        );
        nodes.push(
          <div key={`b-${i}`} style={{marginBottom:10}}>
            <div style={{padding:'6px 10px', background:'#e8f6ff', borderRadius:8, display:'inline-block'}}>{titleNode}</div>
            {desc ? <div style={{marginTop:6, color:'#222'}}>{linkify(desc, title)}</div> : null}
          </div>
        );
        i++;
        continue;
      }

      if (line === '') {
        nodes.push(<div key={`p-${i}`} style={{height:8}} />);
        i++;
        continue;
      }

      // regular paragraph: collect consecutive non-empty lines into a paragraph
      const paraLines = [line];
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        paraLines.push(lines[i]);
        i++;
      }
      nodes.push(<div key={`pwrap-${i}`} style={{marginBottom:10, color:'#222', whiteSpace:'pre-wrap'}}>{linkify(paraLines.join('\n'), '')}</div>);
    }
    return nodes;
  }

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
      // clear suggestions after sending one question
      setSuggestions([]);
    } catch (e) {
      console.error('Error contacting AI [ai-chat:send]', e);
      setMessages(m => [...m, { role: 'ai', text: 'Error contacting AI', ts: Date.now() }]);
    } finally { setLoading(false); }
  }

  return (
    <div>
      <button aria-label="Open AI Chat (Ctrl/Cmd+K)" title="Ask AI (Ctrl/Cmd+K)" className="ai-chat-button large" onClick={() => setOpen(true)} style={{fontSize:16,padding:'10px 14px',borderRadius:10}}>
        <span className="ai-icon" style={{fontSize:18}}>💬</span>
        <span style={{marginLeft:8}}>Ask AI</span>
      </button>

      {open && (
        <div className="ai-chat-modal-overlay" onClick={() => setOpen(false)}>
          <div className="ai-chat-panel" role="dialog" aria-modal="true" aria-label="AI Chat" onClick={e=>e.stopPropagation()} style={{width:600, maxWidth:'96vw', height:'76vh', display:'flex', flexDirection:'column', fontSize:16, position:'relative'}}>
              <div className="ai-chat-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderBottom:'1px solid #eee'}}>
                <strong style={{fontSize:18}}>AI Chat</strong>
              <div>
                <button className="btn secondary" onClick={()=>setOpen(false)}>Close</button>
              </div>
            </div>

            <div className="ai-chat-history" ref={scrollRef} style={{padding:14, overflow:'auto', flex:1, fontSize:15, lineHeight:1.6, position:'relative'}}>
              {suggestions.length > 0 && (
                <div style={{marginBottom:12}}>
                  <div style={{marginBottom:8,fontWeight:700}}>Suggested questions</div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {suggestions.map((s,i) => (
                      <button key={i} type="button" onClick={() => { setQuery(s); }} className="btn ghost" style={{textAlign:'left'}}>{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.length===0 && <div style={{color:'#556'}}>Ask a question about your finances, e.g. "How much did I spend on food last month?"</div>}
              {messages.map((m, i) => (
                <div className="ai-chat-message" key={i} style={{marginBottom:14, display:'flex', gap:12, alignItems:'flex-start'}}>
                  <div style={{minWidth:56, fontSize:13, color:'#444', textTransform:'uppercase', opacity:0.9}}>{m.role === 'ai' ? 'AI' : 'You'}</div>
                  <div style={{background: m.role==='user' ? '#dafbe6' : '#ffffff', padding:14, borderRadius:10, flex:1, whiteSpace:'pre-wrap', color:'#111', boxShadow:'0 1px 0 rgba(0,0,0,0.03)'}} className={m.role==='user' ? 'ai-chat-message-user' : 'ai-chat-message-ai'}>{m.role==='ai' ? renderAiText(m.text) : m.text}</div>
                </div>
              ))}
            </div>

            <div className="ai-chat-controls" style={{padding:12, borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:10}}>
              <input aria-label="AI question" style={{flex:1, padding:'12px 14px', borderRadius:10, border:'1px solid #ddd', fontSize:16, height:46}} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault(); send();}}} placeholder="Ask a question..." />
              <button className="btn" onClick={send} disabled={loading} style={{padding:'10px 16px', fontSize:16}}>Send</button>
            </div>
            {loading && (
              <div className="ai-loading-overlay">
                <div style={{textAlign:'center', color:'#fff'}}>
                  <div className="spinner" style={{width:28,height:28,borderWidth:3,margin:'0 auto 10px'}} />
                  <div style={{fontWeight:700}}>Thinking...</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
