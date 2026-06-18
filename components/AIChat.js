"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, Bot, Sparkles, Trash2, Plus, ChevronLeft, Clock } from 'lucide-react';
import AIDisclosure from './AIDisclosure';

const STARTER_QUESTIONS = [
  'Am I saving enough each month?',
  'Where is most of my money going?',
  'Will I reach my goal on time?',
  "What's one thing I should change?",
];

const BEHIND_PACE_QUESTIONS = [
  'How can I save more this month?',
  "What's slowing my progress?",
  'Where am I overspending?',
];

const ON_TRACK_QUESTIONS = [
  'How can I reach my goal sooner?',
  "What's my strongest spending habit?",
  'Can I increase my savings rate?',
];

const CONSISTENCY_QUESTIONS = [
  'How consistent have I been?',
  'Am I building good money habits?',
  'What pattern do you see in my spending?',
];

const CATEGORY_QUESTIONS = [
  'Where am I spending the most money?',
  'Which category should I reduce first?',
  'What spending pattern stands out?',
];

const TREND_QUESTIONS = [
  'What changed from last month?',
  'Why did my spending increase?',
  'Which trend should I pay attention to?',
  'Is my savings rate improving?',
];

const NO_DATA_QUESTIONS = [
  'How should I start tracking my money?',
  'What is a good savings rate to aim for?',
  'How does saving toward a goal work?',
  'What should I track first — income or expenses?',
];

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function titleFromMessage(text) {
  const clean = text.trim().replace(/[?!.]+$/, '');
  return clean.length > 40 ? clean.slice(0, 38) + '…' : clean;
}

const STORAGE_KEY = 'aiConversations';

function loadConversations() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveConversations(convos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convos));
  } catch { /* ignore */ }
}

export default function AIChat({ paceContext = null, activeDaysMonth = 0, hasSpendingData = false, hasTrendData = false, hasTransactions = false }) {
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [query, setQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(false);
  const [txSuggestions, setTxSuggestions] = useState([]);
  const [hasPendingSuggestion, setHasPendingSuggestion] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const activeConvo = conversations.find(c => c.id === activeId) || null;
  const messages = activeConvo?.messages || [];

  /* Load conversations from localStorage */
  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(d => {
        if (!mounted) return;
        const role = d?.user?.role || null;
        const staff = role === 'coach' || role === 'instructor';
        setIsStaff(staff);
        if (!staff) {
          const stored = loadConversations();
          setConversations(stored);
          if (stored.length > 0) setActiveId(stored[0].id);
        }
      })
      .catch(() => {
        if (!mounted) return;
        const stored = loadConversations();
        setConversations(stored);
        if (stored.length > 0) setActiveId(stored[0].id);
      });
    return () => { mounted = false; };
  }, []);

  /* Persist conversations */
  useEffect(() => {
    if (!isStaff) saveConversations(conversations);
  }, [conversations, isStaff]);

  /* Scroll to bottom on new messages */
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open, activeId]);

  /* Focus input on open */
  useEffect(() => {
    if (open && !showHistory && inputRef.current) inputRef.current.focus();
  }, [open, showHistory]);

  /* Focus trap */
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    function trapFocus(e) {
      if (e.key !== 'Tab') return;
      const focusable = Array.from(panel.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    panel.addEventListener('keydown', trapFocus);
    return () => panel.removeEventListener('keydown', trapFocus);
  }, [open]);

  /* Transaction suggestions */
  useEffect(() => {
    function onTx(e) {
      const tx = e?.detail || {};
      const amt = tx.amount ? `$${Number(tx.amount).toFixed(2)}` : '';
      const desc = tx.description || '';
      setTxSuggestions([
        `What category should I assign this ${tx.type || 'transaction'} (${amt} ${desc}) to?`,
        `Is this a recurring ${tx.type || 'expense'}? How can I track recurring payments?`,
        `How will this ${tx.type || 'transaction'} affect my savings rate this month?`,
        `Any tips to reduce similar ${tx.type === 'income' ? 'missed income opportunities' : 'expenses'} in the future?`,
      ]);
      setHasPendingSuggestion(true);
    }
    window.addEventListener('transaction:added', onTx);
    return () => window.removeEventListener('transaction:added', onTx);
  }, []);

  /* Keyboard shortcut */
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape' && open) setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  /* Declared here so the aicoach:open effect below can reference it without a TDZ error.
     useCallback with [activeId] ensures each render produces a stable reference unless
     the active conversation changes. */
  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    let targetId = activeId;

    /* Create a conversation if none exists */
    if (!targetId) {
      targetId = makeId();
      const newConvo = { id: targetId, title: titleFromMessage(text), messages: [], createdAt: Date.now() };
      setConversations(prev => [newConvo, ...prev]);
      setActiveId(targetId);
    }

    const userMsg = { role: 'user', text, ts: Date.now() };

    setConversations(prev => prev.map(c => {
      if (c.id !== targetId) return c;
      const updatedMessages = [...c.messages, userMsg];
      return {
        ...c,
        messages: updatedMessages,
        title: c.messages.length === 0 ? titleFromMessage(text) : c.title,
      };
    }));

    setQuery('');
    setLoading(true);
    setTxSuggestions([]);

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });
      const data = await res.json();
      const aiMsg = { role: 'ai', text: data.answer || data.insight || data.error || 'No response', ts: Date.now() };
      setConversations(prev => prev.map(c =>
        c.id === targetId ? { ...c, messages: [...c.messages, aiMsg] } : c
      ));
    } catch (e) {
      console.error('Error contacting AI [ai-chat:send]', e);
      setConversations(prev => prev.map(c =>
        c.id === targetId ? { ...c, messages: [...c.messages, { role: 'ai', text: 'Error contacting AI. Please try again.', ts: Date.now() }] } : c
      ));
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  /* Open panel and optionally send a message — triggered by the AI Coach dashboard card */
  useEffect(() => {
    function onOpenRequest(e) {
      setOpen(true);
      setShowHistory(false);
      const question = e?.detail?.query;
      if (question) sendMessage(question);
    }
    window.addEventListener('aicoach:open', onOpenRequest);
    return () => window.removeEventListener('aicoach:open', onOpenRequest);
  }, [sendMessage]);

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
        let label = null;
        if (title && /budget/i.test(title)) label = 'Budgeting Resources';
        if (!label) {
          try { const u = new URL(p); label = u.hostname.replace(/^www\./, ''); }
          catch { label = p; }
        }
        return <a key={`a-${idx}`} href={p} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{label}</a>;
      }
      return <span key={`t-${idx}`}>{p}</span>;
    });
  }

  const replacementBudgetingResource = 'https://www.consumerfinance.gov/consumer-tools/budgeting/';

  function renderAiText(text) {
    if (!text) return null;
    const lines = text.split(/\r?\n/);
    const nodes = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      const numMatch = line.match(/^\s*\d+\.\s*\*\*(.+?)\*\*[:\-]?\s*(.*)$/);
      const boldMatch = line.match(/^\s*\*\*(.+?)\*\*[:\-]?\s*(.*)$/);

      if (numMatch || boldMatch) {
        const m = numMatch || boldMatch;
        const title = m[1];
        const desc = m[2] || '';
        const rawTitleKey = title.toLowerCase().replace(/\s*\(.*\)/, '').trim();
        const isBudgetApp = /^(mint|ynab|pocketguard|everydollar)$/.test(rawTitleKey) || /budget/i.test(rawTitleKey);
        const href = findUrlInText(desc) || (isBudgetApp ? replacementBudgetingResource : null);
        const titleNode = href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline', fontWeight: 700 }}>{title}</a>
        ) : (
          <span style={{ fontWeight: 700, color: 'var(--heading-blue)' }}>{title}</span>
        );
        nodes.push(
          <div key={`s-${i}`} style={{ marginBottom: 10 }}>
            <div style={{ marginBottom: 4 }}>{titleNode}</div>
            {desc ? <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{linkify(desc, title)}</div> : null}
          </div>
        );
        i++;
        continue;
      }

      if (line === '') {
        nodes.push(<div key={`p-${i}`} style={{ height: 6 }} />);
        i++;
        continue;
      }

      const paraLines = [line];
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        paraLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <div key={`pw-${i}`} style={{ marginBottom: 8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>
          {linkify(paraLines.join('\n'), '')}
        </div>
      );
    }
    return nodes;
  }

  function startNewChat() {
    const id = makeId();
    const newConvo = { id, title: 'New Chat', messages: [], createdAt: Date.now() };
    setConversations(prev => [newConvo, ...prev]);
    setActiveId(id);
    setShowHistory(false);
    setTxSuggestions([]);
    setQuery('');
  }

  function switchConversation(id) {
    setActiveId(id);
    setShowHistory(false);
    setQuery('');
  }

  function deleteConversation(id, e) {
    e.stopPropagation();
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id);
      if (activeId === id) {
        setActiveId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  }

  async function send() {
    await sendMessage(query);
  }

  async function sendSuggestion(text) {
    setHasPendingSuggestion(false);
    await sendMessage(text);
  }

  const contextSuggestions = !hasTransactions
    ? NO_DATA_QUESTIONS
    : paceContext === 'behind'
      ? BEHIND_PACE_QUESTIONS
      : paceContext === 'onTrack'
        ? ON_TRACK_QUESTIONS
        : hasTrendData
          ? TREND_QUESTIONS
          : hasSpendingData
            ? CATEGORY_QUESTIONS
            : activeDaysMonth > 0
              ? CONSISTENCY_QUESTIONS
              : STARTER_QUESTIONS;

  const contextLabel = !hasTransactions
    ? 'New to ClearCents? Start here:'
    : paceContext === 'behind'
      ? "You're behind pace — try one of these:"
      : paceContext === 'onTrack'
        ? "You're on track — keep the momentum:"
        : hasTrendData
          ? "Here's what changed since last month:"
          : hasSpendingData
            ? 'Here are some questions about your spending:'
            : activeDaysMonth > 0
              ? "You're building a habit — keep going:"
              : 'Try one of these to get started:';

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="overlay"
              className="ai-panel-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              key="panel"
              ref={panelRef}
              className="ai-panel"
              role="dialog"
              aria-modal="true"
              aria-label="AI Financial Coach"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              {/* Panel header */}
              <div className="ai-panel-header">
                <div className="ai-panel-title">
                  {showHistory ? (
                    <button
                      onClick={() => setShowHistory(false)}
                      aria-label="Back to chat"
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 8px 4px 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}
                    >
                      <ChevronLeft size={18} strokeWidth={2} />
                      History
                    </button>
                  ) : (
                    <>
                      <div className="coach-avatar" style={{ width: 34, height: 34 }}>
                        <Bot size={18} strokeWidth={2} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>AI Coach</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.2px' }}>Educational guidance · not financial advice</div>
                      </div>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {/* History — always visible; disabled when no saved conversations */}
                  {!showHistory && (
                    <button
                      onClick={() => conversations.length > 0 && setShowHistory(true)}
                      aria-label="View conversation history"
                      title={conversations.length > 0 ? 'Conversation history' : 'No conversations yet'}
                      disabled={conversations.length === 0}
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: conversations.length > 0 ? 'pointer' : 'default', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.12s ease', opacity: conversations.length === 0 ? 0.35 : 1 }}
                      onMouseEnter={e => { if (conversations.length > 0) e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                    >
                      <Clock size={16} strokeWidth={2} />
                    </button>
                  )}
                  {/* New Chat — always visible */}
                  {!showHistory && (
                    <button
                      onClick={startNewChat}
                      aria-label="New conversation"
                      title="New chat"
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.12s ease' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                    >
                      <Plus size={18} strokeWidth={2} />
                    </button>
                  )}
                  {/* Clear — always visible; disabled when no messages */}
                  {!showHistory && (
                    <button
                      onClick={() => {
                        if (!messages.length) return;
                        setConversations(prev => prev.map(c =>
                          c.id === activeId ? { ...c, messages: [] } : c
                        ));
                        setTxSuggestions([]);
                      }}
                      aria-label="Clear conversation"
                      title={messages.length > 0 ? 'Clear conversation' : 'No messages to clear'}
                      disabled={messages.length === 0}
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: messages.length > 0 ? 'pointer' : 'default', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.12s ease', opacity: messages.length === 0 ? 0.35 : 1 }}
                      onMouseEnter={e => { if (messages.length > 0) e.currentTarget.style.color = 'var(--error)'; }}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                    >
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                  )}
                  {/* Close — always visible */}
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close AI Coach"
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.12s ease' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Conversation history view */}
              {showHistory ? (
                <div className="ai-history-list">
                  <button
                    onClick={startNewChat}
                    className="ai-new-chat-btn"
                  >
                    <Plus size={16} strokeWidth={2} />
                    New Chat
                  </button>
                  {conversations.length === 0 ? (
                    <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
                      No conversations yet
                    </div>
                  ) : (
                    conversations.map(c => (
                      <div
                        key={c.id}
                        className={`ai-history-item${c.id === activeId ? ' active' : ''}`}
                        onClick={() => switchConversation(c.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') switchConversation(c.id); }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.title}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            {c.messages.length} message{c.messages.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <button
                          onClick={e => deleteConversation(c.id, e)}
                          aria-label={`Delete conversation: ${c.title}`}
                          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', opacity: 0.6 }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.opacity = '1'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.opacity = '0.6'; }}
                        >
                          <X size={14} strokeWidth={2} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <>
                  {/* Chat messages */}
                  <div className="ai-panel-history" ref={scrollRef} style={{ position: 'relative' }}>
                    {txSuggestions.length > 0 && messages.length === 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 8 }}>
                          Suggested questions
                        </div>
                        <div className="ai-suggestions">
                          {txSuggestions.map((s, idx) => (
                            <button key={idx} type="button" className="ai-suggestion-btn" onClick={() => sendSuggestion(s)}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {messages.length === 0 && txSuggestions.length === 0 && (
                      <div style={{ padding: '16px 4px 8px', color: 'var(--muted)' }}>
                        <div style={{ textAlign: 'center', marginBottom: 14 }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-subtle)', border: '1px solid rgba(16,192,138,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: 'var(--accent)' }}>
                            <Sparkles size={18} />
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 3, fontSize: 14 }}>Your financial coach is ready</div>
                          <div style={{ fontSize: 12, lineHeight: 1.5 }}>{contextLabel}</div>
                        </div>
                        <div className="ai-suggestions">
                          {contextSuggestions.map((q, idx) => (
                            <button key={idx} type="button" className="ai-suggestion-btn" onClick={() => sendSuggestion(q)}>
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {messages.map((m, idx) => (
                      <div key={idx} className={`ai-msg ai-msg--${m.role}`}>
                        {m.role === 'ai' && <div className="ai-msg-label" aria-hidden="true">AI</div>}
                        <div
                          className={`ai-msg-bubble ${m.role === 'user' ? 'ai-msg-bubble--user' : 'ai-msg-bubble--ai'}`}
                          aria-label={m.role === 'ai' ? `AI Coach: ${m.text}` : undefined}
                        >
                          {m.role === 'ai' ? renderAiText(m.text) : m.text}
                        </div>
                        {m.role === 'ai' && idx === messages.length - 1 && (
                          <AIDisclosure variant="inline" />
                        )}
                      </div>
                    ))}

                    {loading && (
                      <div className="ai-msg ai-msg--ai">
                        <div className="ai-msg-label" aria-hidden="true">AI</div>
                        <div className="ai-msg-bubble ai-msg-bubble--ai" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, margin: 0 }} />
                          <span style={{ color: 'var(--muted)', fontSize: 13 }}>Thinking…</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="ai-panel-controls">
                    <input
                      ref={inputRef}
                      className="ai-panel-input"
                      aria-label="AI question"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
                      placeholder="Ask about your finances…"
                      disabled={loading}
                    />
                    <button
                      className="btn"
                      onClick={send}
                      disabled={loading || !query.trim()}
                      style={{ padding: '10px 16px', minWidth: 'auto', flexShrink: 0 }}
                      aria-label="Send message"
                    >
                      <Send size={16} strokeWidth={2} />
                    </button>
                  </div>
                </>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
