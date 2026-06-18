"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import DeleteAccount from '../../../components/DeleteAccount';
import { getPrimaryGoal } from '../../../lib/goals.js';

// ─── Sub-components ──────────────────────────────────────────────────────────

function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '11px 0', borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}

function CoachRow({ emoji, label, value, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      background: 'var(--surface-1)', border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
        {emoji}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontWeight: 600, color: value ? 'var(--text-primary)' : 'var(--muted)', fontStyle: value ? 'normal' : 'italic' }}>
          {value || 'Not set'}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '13px 0', borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        style={{
          width: 44, height: 24, borderRadius: 999, border: 'none', flexShrink: 0,
          background: checked ? 'var(--accent)' : 'var(--surface-3)',
          cursor: 'pointer', transition: 'background 0.18s', position: 'relative',
          outline: 'none', marginLeft: 16,
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: 999, background: '#fff',
          position: 'absolute', top: 3, left: checked ? 23 : 3,
          transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
        }} />
      </button>
    </div>
  );
}

// ─── Preferences Modal ────────────────────────────────────────────────────────

const INCOME_TYPES = ['Full-time employee', 'Part-time employee', 'Freelance / gig work', 'Student', 'Business owner', 'Unemployed', 'Other'];
const GOAL_TYPES   = ['Emergency fund', 'Pay off debt', 'Save for a purchase', 'Build an investment', 'Budget better', 'Build better habits', 'Other'];
const FOCUS_TYPES  = ['Spending awareness', 'Saving consistency', 'Debt reduction', 'Income growth', 'Long-term planning', 'General wellness'];

function FieldLabel({ children }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
      {children}
    </label>
  );
}

function PreferencesModal({ initial, onSave, onClose }) {
  const [vals, setVals]     = useState({ incomeType: initial.incomeType || '', goal: initial.goal || '', coachingFocus: initial.coachingFocus || '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState(null);
  const [saved, setSaved]   = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incomeType:    vals.incomeType,
          goal:          vals.goal,
          coachingFocus: vals.coachingFocus,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Failed to save'); setSaving(false); return; }
      window.dispatchEvent(new Event('onboarding:updated'));
      setSaved(true);
      onSave(data.onboarding || { ...initial, ...vals });
      setTimeout(() => { setSaved(false); onClose(); }, 900);
    } catch {
      setErr('Something went wrong. Try again.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card--lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Edit Coaching Profile</h3>
          <button type="button" className="icon-edit-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <p style={{ margin: '10px 0 20px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          This helps the AI Coach tailor guidance to your situation.
        </p>
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <FieldLabel>Income type</FieldLabel>
              <select
                className="form-control"
                value={vals.incomeType}
                onChange={e => setVals(v => ({ ...v, incomeType: e.target.value }))}
              >
                <option value="">Select…</option>
                {INCOME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Primary saving goal</FieldLabel>
              <select
                className="form-control"
                value={vals.goal}
                onChange={e => setVals(v => ({ ...v, goal: e.target.value }))}
              >
                <option value="">Select…</option>
                {GOAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Coaching focus</FieldLabel>
              <select
                className="form-control"
                value={vals.coachingFocus}
                onChange={e => setVals(v => ({ ...v, coachingFocus: e.target.value }))}
              >
                <option value="">Select…</option>
                {FOCUS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {err  && <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 14 }}>{err}</div>}
          {saved && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 14 }}>Saved!</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="button" className="btn ghost" onClick={onClose} style={{ fontSize: 13 }}>Cancel</button>
            <button type="submit" className="btn" disabled={saving} style={{ fontSize: 13, minWidth: 72 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Appearance controls ──────────────────────────────────────────────────────

const THEMES = [
  { value: 'midnight', label: 'Midnight', accent: '#10c08a', bg: '#130120' },
  { value: 'neon',     label: 'Neon',     accent: '#00ffa3', bg: '#040c14' },
  { value: 'sunset',   label: 'Sunset',   accent: '#f59e0b', bg: '#1c0900' },
  { value: 'rose',     label: 'Rose',     accent: '#f43f5e', bg: '#160408' },
  { value: 'ocean',    label: 'Ocean',    accent: '#06b6d4', bg: '#04101e' },
  { value: 'forest',   label: 'Forest',   accent: '#22c55e', bg: '#041208' },
];

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('cc:theme', t); } catch {}
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show:   (i) => ({ opacity: 1, y: 0, transition: { duration: 0.32, delay: i * 0.06 } }),
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [user, setUser]             = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [goals, setGoals]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showPrefModal, setShowPrefModal] = useState(false);

  // Server-backed accounts
  const [accounts, setAccounts] = useState([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', type: 'checking', balance: '' });
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountError, setAccountError] = useState('');

  // Appearance
  const [reducedMotion, setReducedMotion] = useState(false);
  const [largerText, setLargerText]       = useState(false);
  const [theme, setTheme]                 = useState('midnight');

  const router = useRouter();

  // Sync appearance state from localStorage
  useEffect(() => {
    try {
      setReducedMotion(localStorage.getItem('cc:reducedMotion') === '1');
      setLargerText(localStorage.getItem('cc:largerText') === '1');
      const LEGACY = new Set(['dark', 'dim', 'light']);
      const saved = localStorage.getItem('cc:theme') || 'midnight';
      const active = LEGACY.has(saved) ? 'midnight' : saved;
      setTheme(active);
    } catch {}
  }, []);

  function toggleReducedMotion() {
    const next = !reducedMotion;
    setReducedMotion(next);
    try {
      localStorage.setItem('cc:reducedMotion', next ? '1' : '0');
      document.documentElement.setAttribute('data-reduced-motion', next ? '1' : '0');
    } catch {}
  }

  function toggleLargerText() {
    const next = !largerText;
    setLargerText(next);
    try {
      localStorage.setItem('cc:largerText', next ? '1' : '0');
      document.documentElement.setAttribute('data-larger-text', next ? '1' : '0');
      document.documentElement.style.fontSize = next ? '18px' : '16px';
    } catch {}
  }

  function handleThemeChange(t) {
    setTheme(t);
    applyTheme(t);
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [meRes, obRes, goalsRes, accountsRes] = await Promise.all([
          fetch('/api/auth/me',      { credentials: 'same-origin', cache: 'no-store' }),
          fetch('/api/onboarding',   { credentials: 'same-origin', cache: 'no-store' }),
          fetch('/api/goals',        { credentials: 'same-origin', cache: 'no-store' }),
          fetch('/api/accounts',     { credentials: 'same-origin', cache: 'no-store' }),
        ]);
        const [meData, obData, goalsData, accountsData] = await Promise.all([
          meRes.json(), obRes.json(), goalsRes.json(), accountsRes.json(),
        ]);
        if (!mounted) return;
        if (!meData.user) { router.push('/auth'); return; }
        setUser(meData.user);
        if (!obData.error) setOnboarding(obData.onboarding || null);
        if (!goalsData.error && Array.isArray(goalsData.goals)) setGoals(goalsData.goals);
        if (!accountsData.error && Array.isArray(accountsData.accounts)) setAccounts(accountsData.accounts);
      } catch (e) {
        console.error('[settings:load]', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();

    function onAuthChanged() { load(); }
    window.addEventListener('auth:changed', onAuthChanged);
    return () => { mounted = false; window.removeEventListener('auth:changed', onAuthChanged); };
  }, []);

  useEffect(() => {
    function onObUpdated() {
      Promise.all([
        fetch('/api/onboarding', { credentials: 'same-origin', cache: 'no-store' }).then(r => r.json()),
        fetch('/api/goals',      { credentials: 'same-origin', cache: 'no-store' }).then(r => r.json()),
      ]).then(([od, gd]) => {
        if (!od.error) setOnboarding(od.onboarding || null);
        if (!gd.error && Array.isArray(gd.goals)) setGoals(gd.goals);
      }).catch(() => {});
    }
    window.addEventListener('onboarding:updated', onObUpdated);
    return () => window.removeEventListener('onboarding:updated', onObUpdated);
  }, []);

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ maxWidth: 680, margin: '28px auto' }}>
      <div className="card page-hero" style={{ padding: '22px 24px' }}>
        <div className="skeleton" style={{ height: 26, width: '40%', marginBottom: 10 }} />
        <div className="skeleton" style={{ height: 15, width: '68%' }} />
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="card" style={{ marginTop: 18, padding: '20px 24px' }}>
          <div className="skeleton" style={{ height: 18, width: '30%', marginBottom: 14 }} />
          <div className="skeleton" style={{ height: 14, width: '90%', marginBottom: 6 }} />
          <div className="skeleton" style={{ height: 14, width: '70%' }} />
        </div>
      ))}
    </div>
  );

  // ── Derived values ─────────────────────────────────────────────────────────

  const memberSince   = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null;
  const incomeType    = onboarding?.incomeType || (onboarding?.why ? onboarding.why.replace('Income type: ', '') : null) || null;
  const goalType      = getPrimaryGoal(goals, onboarding)?.title || null;
  const coachingFocus = onboarding?.coachingFocus || (Array.isArray(onboarding?.reasons) ? onboarding.reasons[0] : null) || null;
  const hasCoachCtx   = incomeType || goalType || coachingFocus;

  const prefInitial = {
    incomeType:    incomeType    || '',
    goal:          onboarding?.goal || goalType || '',
    coachingFocus: coachingFocus || '',
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 680, margin: '28px auto' }}>

      {showPrefModal && (
        <PreferencesModal
          initial={prefInitial}
          onSave={(updated) => setOnboarding(prev => ({ ...(prev || {}), ...updated }))}
          onClose={() => setShowPrefModal(false)}
        />
      )}

      {/* Hero */}
      <motion.div className="page-hero card" initial="hidden" animate="show" custom={0} variants={fadeUp}>
        <h2>Settings</h2>
        <p className="lead" style={{ marginTop: 8, marginBottom: 0 }}>
          Manage how ClearCents works for you.
        </p>
      </motion.div>

      {/* ── Account ── */}
      <motion.div className="card" style={{ marginTop: 18 }} initial="hidden" animate="show" custom={1} variants={fadeUp}>
        <h3 style={{ margin: '0 0 4px' }}>Account</h3>
        <InfoRow label="Email" value={user?.email} />
        {memberSince && <InfoRow label="Member since" value={memberSince} />}
        {user?.role && user.role !== 'member' && user.role !== 'student' && (
          <InfoRow label="Role" value={user.role.charAt(0).toUpperCase() + user.role.slice(1)} />
        )}
      </motion.div>

      {/* ── Coaching Profile ── */}
      <motion.div className="card" style={{ marginTop: 18 }} initial="hidden" animate="show" custom={2} variants={fadeUp}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ margin: 0 }}>Coaching Profile</h3>
          <button
            type="button"
            className="btn ghost"
            style={{ fontSize: 13 }}
            onClick={() => setShowPrefModal(true)}
          >
            {hasCoachCtx ? 'Edit preferences' : 'Complete setup'}
          </button>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Your coaching profile tells the AI Coach about your income, goals, and what you want to focus on.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <CoachRow emoji="💼" label="Income type"    value={incomeType}    color="linear-gradient(135deg, var(--accent), var(--accent-2))" />
          <CoachRow emoji="🎯" label="Saving for"     value={goalType}      color="linear-gradient(135deg, #3ea6ff, #1a7fd1)"               />
          <CoachRow emoji="🤖" label="Coaching focus" value={coachingFocus} color="linear-gradient(135deg, #a78bfa, #7c5fc4)"               />
        </div>
        {!hasCoachCtx && (
          <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--accent-subtle)', border: '1px solid var(--accent-glow)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)' }}>
            Complete your coaching setup so the AI Coach knows what to focus on.{' '}
            <button type="button" onClick={() => setShowPrefModal(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, padding: 0 }}>Get started →</button>
          </div>
        )}
      </motion.div>

      {/* ── Appearance ── */}
      <motion.div className="card" style={{ marginTop: 18 }} initial="hidden" animate="show" custom={3} variants={fadeUp}>
        <h3 style={{ margin: '0 0 4px' }}>Appearance</h3>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Adjust how ClearCents looks and feels.
        </p>

        {/* Theme */}
        <div style={{ paddingBottom: 16, marginBottom: 2, borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Theme</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {THEMES.map(t => {
              const active = theme === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleThemeChange(t.value)}
                  style={{
                    border: active ? `2px solid ${t.accent}` : '2px solid var(--border-subtle)',
                    borderRadius: 10, overflow: 'hidden', cursor: 'pointer', padding: 0,
                    background: 'none', transition: 'border-color 0.15s',
                    boxShadow: active ? `0 0 12px ${t.accent}44` : 'none',
                  }}
                  title={t.label}
                >
                  {/* Color swatch */}
                  <div style={{ height: 36, background: `linear-gradient(135deg, ${t.bg} 0%, #000 100%)`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 999, background: t.accent, boxShadow: `0 0 6px ${t.accent}` }} />
                    {active && <div style={{ position: 'absolute', top: 4, right: 5, width: 8, height: 8, borderRadius: 999, background: t.accent }} />}
                  </div>
                  {/* Label */}
                  <div style={{
                    padding: '5px 6px', fontSize: 11, fontWeight: active ? 700 : 500,
                    color: active ? t.accent : 'var(--text-secondary)',
                    background: 'var(--surface-2)', textAlign: 'center', lineHeight: 1,
                  }}>
                    {t.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <ToggleRow
          label="Reduced motion"
          description="Fewer animations throughout the app"
          checked={reducedMotion}
          onChange={toggleReducedMotion}
        />
        <ToggleRow
          label="Larger text"
          description="Scales body text, labels, and UI elements for easier reading"
          checked={largerText}
          onChange={toggleLargerText}
        />
      </motion.div>

      {/* ── Dashboard Tour ── */}
      <motion.div className="card" style={{ marginTop: 18 }} initial="hidden" animate="show" custom={4} variants={fadeUp}>
        <h3 style={{ margin: '0 0 8px' }}>Dashboard Tour</h3>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          New to ClearCents? Retake the quick tour to revisit the key features of your dashboard.
        </p>
        <button
          type="button"
          className="btn secondary"
          style={{ fontSize: 13, padding: '9px 18px' }}
          onClick={() => {
            try { localStorage.removeItem('clearcents:tour:completed'); } catch {}
            router.push('/product');
          }}
        >
          Retake Dashboard Tour
        </button>
      </motion.div>

      {/* ── Financial Accounts ── */}
      {(() => {
        const TYPE_LABELS = {
          checking: 'Checking', savings: 'Savings', cash: 'Cash',
          credit_card: 'Credit Card', investment: 'Investment', other: 'Other',
        };
        const netAssets = accounts.reduce((sum, a) => {
          const b = Number(a.balance) || 0;
          return a.type === 'credit_card' ? sum - b : sum + b;
        }, 0);

        async function handleAddAccount(e) {
          e.preventDefault();
          setAccountError('');
          const { name, type, balance } = addForm;
          if (!name.trim()) { setAccountError('Account name is required.'); return; }
          try {
            const res = await fetch('/api/accounts', {
              method: 'POST', credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: name.trim(), type, balance: Number(balance) || 0 }),
            });
            const data = await res.json();
            if (!res.ok) { setAccountError(data.error || 'Failed to add account.'); return; }
            setAccounts(prev => [...prev, data.account]);
            setAddForm({ name: '', type: 'checking', balance: '' });
            setShowAddAccount(false);
            window.dispatchEvent(new Event('accounts:updated'));
          } catch { setAccountError('Something went wrong.'); }
        }

        async function handleUpdateAccount(e) {
          e.preventDefault();
          if (!editingAccount) return;
          setAccountError('');
          try {
            const res = await fetch(`/api/accounts/${editingAccount.id}`, {
              method: 'PATCH', credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: editingAccount.name,
                type: editingAccount.type,
                balance: Number(editingAccount.balance) || 0,
              }),
            });
            const data = await res.json();
            if (!res.ok) { setAccountError(data.error || 'Failed to update account.'); return; }
            setAccounts(prev => prev.map(a => a.id === data.account.id ? data.account : a));
            setEditingAccount(null);
            window.dispatchEvent(new Event('accounts:updated'));
          } catch { setAccountError('Something went wrong.'); }
        }

        async function handleDeleteAccount(id) {
          setAccountError('');
          try {
            const res = await fetch(`/api/accounts/${id}`, {
              method: 'DELETE', credentials: 'same-origin',
            });
            if (!res.ok) { const d = await res.json(); setAccountError(d.error || 'Failed to delete.'); return; }
            setAccounts(prev => prev.filter(a => a.id !== id));
            window.dispatchEvent(new Event('accounts:updated'));
          } catch { setAccountError('Something went wrong.'); }
        }

        return (
          <motion.div className="card" style={{ marginTop: 18 }} initial="hidden" animate="show" custom={5} variants={fadeUp}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ margin: 0 }}>Financial Accounts</h3>
              {!showAddAccount && !editingAccount && (
                <button type="button" className="btn ghost" style={{ fontSize: 13 }}
                  onClick={() => { setShowAddAccount(true); setAccountError(''); }}>
                  + Add account
                </button>
              )}
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Track your checking, savings, cash, and credit accounts. Opening balances count toward your goal progress.
            </p>

            {/* Account list */}
            {accounts.length > 0 && !editingAccount && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {accounts.map(a => (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 13px', background: 'var(--surface-1)',
                    border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {TYPE_LABELS[a.type] || a.type}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>
                        ${Number(a.balance).toFixed(2)}
                      </span>
                      <button type="button" className="btn ghost" style={{ fontSize: 11, padding: '4px 9px' }}
                        onClick={() => { setEditingAccount({ ...a, balance: String(a.balance) }); setAccountError(''); }}>
                        Edit
                      </button>
                      <button type="button" className="btn ghost" style={{ fontSize: 11, padding: '4px 9px', color: 'var(--error)' }}
                        onClick={() => handleDeleteAccount(a.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Edit form */}
            {editingAccount && (
              <form onSubmit={handleUpdateAccount} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Editing: {editingAccount.name}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>Name</label>
                    <input className="form-control" value={editingAccount.name}
                      onChange={e => setEditingAccount(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>Type</label>
                    <select className="form-control" value={editingAccount.type}
                      onChange={e => setEditingAccount(p => ({ ...p, type: e.target.value }))}>
                      {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>Balance</label>
                    <input type="number" min="0" step="0.01" className="form-control"
                      value={editingAccount.balance}
                      onChange={e => setEditingAccount(p => ({ ...p, balance: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn" style={{ fontSize: 13 }}>Save</button>
                  <button type="button" className="btn ghost" style={{ fontSize: 13 }}
                    onClick={() => { setEditingAccount(null); setAccountError(''); }}>Cancel</button>
                </div>
              </form>
            )}

            {/* Add account form */}
            {showAddAccount && (
              <form onSubmit={handleAddAccount} style={{ marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>Name</label>
                    <input className="form-control" placeholder="e.g. Chase Checking"
                      value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>Type</label>
                    <select className="form-control" value={addForm.type}
                      onChange={e => setAddForm(p => ({ ...p, type: e.target.value }))}>
                      {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>Opening Balance</label>
                    <input type="number" min="0" step="0.01" className="form-control" placeholder="0.00"
                      value={addForm.balance} onChange={e => setAddForm(p => ({ ...p, balance: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn" style={{ fontSize: 13 }}>Add account</button>
                  <button type="button" className="btn ghost" style={{ fontSize: 13 }}
                    onClick={() => { setShowAddAccount(false); setAddForm({ name: '', type: 'checking', balance: '' }); setAccountError(''); }}>Cancel</button>
                </div>
              </form>
            )}

            {accountError && (
              <div style={{ fontSize: 12, color: 'var(--error)', marginBottom: 10 }}>{accountError}</div>
            )}

            {/* Net assets footer */}
            {accounts.length > 0 && (
              <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-secondary)' }}>
                Net assets:&nbsp;
                <span style={{ fontWeight: 700, color: netAssets >= 0 ? 'var(--accent)' : 'var(--error)' }}>
                  {netAssets >= 0 ? '+' : '−'}${Math.abs(netAssets).toFixed(2)}
                </span>
              </div>
            )}


          </motion.div>
        );
      })()}

      {/* ── Privacy & Data ── */}
      <motion.div className="card danger-zone" style={{ marginTop: 18 }} initial="hidden" animate="show" custom={6} variants={fadeUp}>
        <h3 style={{ margin: '0 0 10px' }}>Privacy &amp; Data</h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          ClearCents stores your transactions, goals, coaching conversations, and account details. Your data is never sold or shared with third parties.
        </p>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 20 }}>
          <div>• Transactions and goals are private to your account</div>
          <div>• AI coaching conversations are stored to improve your experience over time</div>
          <div>• Deleting your account permanently removes all associated data</div>
        </div>
        <div style={{ borderTop: '1px solid rgba(248,113,113,0.15)', paddingTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Danger Zone</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
            Once you delete your account, there is no going back.
          </div>
          <DeleteAccount />
        </div>
      </motion.div>

    </div>
  );
}
