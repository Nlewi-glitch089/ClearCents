"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, X, Upload } from 'lucide-react';
import { getPrimaryGoal } from '../../../lib/goals.js';

// ─── Avatar helpers ──────────────────────────────────────────────────────────

const EMOJI_AVATARS = [
  '🦊','🐧','🦁','🐼','🦄','🦋',
  '🐸','🐬','🌟','🎯','🚀','💎',
  '🌈','⚡','🏆','🐯','🦝','🎭',
];
const COLOR_BG = [
  '#3ea6ff','#10c08a','#a78bfa','#f87171',
  '#ffd166','#06b6d4','#e040fb','#ff8c42',
];

function getInitials(name, email) {
  if (name?.trim()) return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (email?.[0] || '?').toUpperCase();
}

function resizeImage(file, maxSize = 256) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function AvatarDisp({ av, name, email, size = 72 }) {
  const ini = getInitials(name, email);
  const base = {
    width: size, height: size, borderRadius: 999, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  if (av?.type === 'image') return (
    <div style={{ ...base, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
      <img src={av.src} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
  if (av?.type === 'emoji') return (
    <div style={{ ...base, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', fontSize: size * 0.5 }}>
      {av.value}
    </div>
  );
  if (av?.type === 'color') return (
    <div style={{ ...base, background: av.bg, fontSize: size * 0.38, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
      {ini}
    </div>
  );
  return (
    <div style={{ ...base, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', fontSize: size * 0.38, fontWeight: 800, color: 'var(--muted)' }}>
      {ini}
    </div>
  );
}

// ─── Edit Name Modal ─────────────────────────────────────────────────────────

function EditNameModal({ initial, onSave, onClose }) {
  const [val, setVal] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/auth/update', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: val }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Failed to save'); setSaving(false); return; }
      onSave(data.user?.name || val);
    } catch {
      setErr('Something went wrong. Try again.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Edit Display Name</h3>
          <button type="button" className="icon-edit-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Display name
            </label>
            <input
              value={val}
              onChange={e => setVal(e.target.value)}
              className="form-control"
              placeholder="Your name"
              autoFocus
            />
          </div>
          {err && <div style={{ fontSize: 12, color: 'var(--error)', marginBottom: 12 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [user, setUser]             = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [totals, setTotals]         = useState({ income: 0, expenses: 0 });
  const [goals, setGoals]           = useState([]);
  const [activity, setActivity]     = useState({ transactions: 0, categories: 0, daysActive: 0 });
  const [goalProgress, setGoalProgress] = useState({ percent: 0, current: 0, target: 0 });

  const [showEditName, setShowEditName] = useState(false);
  const [av, setAv]                     = useState(null);
  const uploadRef = useRef(null);

  const router = useRouter();

  function loadAvatar(uid) {
    try {
      const s = localStorage.getItem(`cc:av:${uid}`);
      if (s) setAv(JSON.parse(s));
    } catch {}
  }

  function pickAvatar(newAv) {
    setAv(newAv);
    if (user?.id) {
      try { localStorage.setItem(`cc:av:${user.id}`, JSON.stringify(newAv)); } catch {}
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const src = await resizeImage(file);
      pickAvatar({ type: 'image', src });
    } catch {}
    e.target.value = '';
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const r1 = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
      const d1 = await r1.json();
      if (!d1.user) { router.push('/auth'); return; }
      setUser(d1.user);
      loadAvatar(d1.user.id);

      const r2 = await fetch('/api/onboarding', { credentials: 'same-origin', cache: 'no-store' });
      if (r2.ok) {
        const d2 = await r2.json();
        if (!d2.error) setOnboarding(d2.onboarding || null);
      }

      try {
        const rt = await fetch('/api/transactions', { credentials: 'same-origin', cache: 'no-store' });
        if (rt.ok) {
          const td = await rt.json();
          setTotals(td.totals || { income: 0, expenses: 0 });
          if (Array.isArray(td.transactions)) {
            const txs    = td.transactions;
            const catIds = new Set(txs.map(t => t.categoryId).filter(Boolean));
            const days   = new Set(txs.map(t => { try { return new Date(t.occurredAt).toISOString().slice(0, 10); } catch { return null; } }).filter(Boolean));
            setActivity({ transactions: txs.length, categories: catIds.size, daysActive: days.size });
          }
        }
      } catch {}

      try {
        const rg = await fetch('/api/goals', { credentials: 'same-origin', cache: 'no-store' });
        if (rg.ok) {
          const gd = await rg.json();
          if (!gd.error && Array.isArray(gd.goals)) setGoals(gd.goals);
        }
      } catch {}

      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    function onUpdate() {
      Promise.all([
        fetch('/api/onboarding', { credentials: 'same-origin', cache: 'no-store' }).then(r => r.json()),
        fetch('/api/goals',      { credentials: 'same-origin', cache: 'no-store' }).then(r => r.json()),
      ]).then(([od, gd]) => {
        if (!od.error) setOnboarding(od.onboarding || null);
        if (!gd.error && Array.isArray(gd.goals)) setGoals(gd.goals);
      }).catch(() => {});
    }
    window.addEventListener('onboarding:updated', onUpdate);
    return () => window.removeEventListener('onboarding:updated', onUpdate);
  }, []);

  useEffect(() => {
    if (goals.length > 0) {
      const g = goals[0];
      setGoalProgress({ percent: Number(g.progressPercent || 0), current: Number(g.currentSaved || 0), target: Number(g.targetAmount || 0) });
      return;
    }
    if (onboarding?.goal) {
      const m = String(onboarding.goal).match(/\$?\s*(\d{1,3}(?:[,\d]*))(?:\.\d{1,2})?/);
      if (m) {
        const target  = Number(m[1].replace(/,/g, '')) || 0;
        const current = Math.max(0, (totals.income || 0) - (totals.expenses || 0));
        setGoalProgress({ percent: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0, current, target });
        return;
      }
    }
    setGoalProgress({ percent: 0, current: 0, target: 0 });
  }, [goals, onboarding, totals]);

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ maxWidth: 980, margin: '28px auto' }}>
      <div className="card page-hero" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="skeleton" style={{ width: 72, height: 72, borderRadius: 999, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 24, width: '38%', marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 14, width: '52%' }} />
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 18 }}>
        {[0, 1].map(i => (
          <div key={i} className="card" style={{ padding: '20px 24px' }}>
            <div className="skeleton" style={{ height: 18, width: '50%', marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 100, borderRadius: 10 }} />
          </div>
        ))}
      </div>
    </div>
  );

  // ── Derived values ─────────────────────────────────────────────────────────

  const displayName    = user?.name || user?.email?.split('@')[0] || 'User';
  const primaryGoal    = getPrimaryGoal(goals, onboarding);
  const goalLabel      = primaryGoal?.title || null;
  const coachingFocus  = onboarding?.coachingFocus || (Array.isArray(onboarding?.reasons) ? onboarding.reasons[0] : null) || null;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const net            = (totals.income || 0) - (totals.expenses || 0);

  const activityStats = [
    { emoji: '📝', value: activity.transactions, label: 'Transactions' },
    { emoji: '🏷',  value: activity.categories,  label: 'Categories'   },
    { emoji: '📅', value: activity.daysActive,   label: 'Days active'  },
    { emoji: '🎯', value: completedGoals,         label: 'Goals done'   },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 980, margin: '28px auto' }}>

      {showEditName && (
        <EditNameModal
          initial={user?.name || ''}
          onSave={(name) => {
            setUser(prev => ({ ...prev, name }));
            setShowEditName(false);
          }}
          onClose={() => setShowEditName(false)}
        />
      )}

      {/* ── Profile header ── */}
      <div className="card page-hero" style={{ padding: '22px 26px', marginBottom: 0 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <AvatarDisp av={av} name={user?.name} email={user?.email} size={68} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, lineHeight: 1.2 }}>{displayName}</h2>
              <button
                type="button"
                onClick={() => setShowEditName(true)}
                className="icon-edit-btn"
                title="Edit display name"
              >
                <Pencil size={13} strokeWidth={2} />
              </button>
            </div>
            <div style={{ marginTop: 5, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {(user?.role === 'coach' || user?.role === 'instructor') && (
                <span className="badge">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
              )}
              <span className="muted-note" style={{ marginBottom: 0 }}>{user?.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2-column body ── */}
      <div className="profile-body-grid" style={{ marginTop: 16 }}>

        {/* Left: Profile Customization */}
        <div className="card" style={{ padding: '22px' }}>
          <h3 style={{ margin: '0 0 16px' }}>Customize Profile</h3>

          {/* Current avatar preview */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 14px', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 10, marginBottom: 20 }}>
            <AvatarDisp av={av} name={user?.name} email={user?.email} size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{user?.email}</div>
            </div>
            {av && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => pickAvatar(null)}
                style={{ fontSize: 12, padding: '4px 10px', minWidth: 0, flexShrink: 0 }}
              >
                Reset
              </button>
            )}
          </div>

          {/* Upload photo */}
          <div className="avatar-section-label">Upload Photo</div>
          <div style={{ marginBottom: 16 }}>
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            <button
              type="button"
              className="btn ghost"
              onClick={() => uploadRef.current?.click()}
              style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Upload size={13} />
              {av?.type === 'image' ? 'Replace photo' : 'Choose photo'}
            </button>
            <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 10 }}>JPG, PNG, GIF</span>
          </div>

          {/* Emoji avatars */}
          <div className="avatar-section-label" style={{ marginTop: 4 }}>Emoji</div>
          <div className="avatar-emoji-grid">
            {EMOJI_AVATARS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => pickAvatar({ type: 'emoji', value: e })}
                className={`avatar-opt${av?.type === 'emoji' && av.value === e ? ' selected' : ''}`}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Color + initials */}
          <div className="avatar-section-label" style={{ marginTop: 14 }}>Color + Initials</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {COLOR_BG.map(bg => {
              const isSelected = av?.type === 'color' && av.bg === bg;
              return (
                <button
                  key={bg}
                  type="button"
                  onClick={() => pickAvatar({ type: 'color', bg })}
                  style={{
                    width: 36, height: 36, borderRadius: 999, background: bg, border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, color: '#fff',
                    outline: isSelected ? `3px solid #fff` : '3px solid transparent',
                    outlineOffset: 2,
                    transition: 'outline 0.12s',
                  }}
                  title={bg}
                >
                  {getInitials(user?.name, user?.email)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Financial snapshot + Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Financial snapshot */}
          <div className="card" style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 14px' }}>Financial Snapshot</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { emoji: '💰', label: 'Income logged',   value: `$${(totals.income || 0).toFixed(2)}`,   color: 'var(--heading-blue)',  border: 'rgba(62,166,255,0.14)'  },
                { emoji: '💸', label: 'Spending logged', value: `$${(totals.expenses || 0).toFixed(2)}`, color: 'var(--error)',         border: 'rgba(248,113,113,0.14)' },
                { emoji: net >= 0 ? '📈' : '📉', label: 'Net balance', value: `$${net.toFixed(2)}`, color: net >= 0 ? 'var(--accent)' : 'var(--error)', border: net >= 0 ? 'rgba(16,192,138,0.18)' : 'rgba(248,113,113,0.14)' },
              ].map(({ emoji, label, value, color, border }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--surface-1)', border: `1px solid ${border}`, borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>{emoji}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="card" style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 14px' }}>Activity</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {activityStats.map(({ emoji, value, label }) => (
                <div key={label} style={{ padding: '12px', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 18 }}>{emoji}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{value}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Goals ── */}
      {(goalLabel || goalProgress.target > 0) && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ margin: '0 0 14px' }}>Your Goals</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="goal-card">
              <div style={{ fontWeight: 700 }}>Primary Goal</div>
              <div style={{ marginTop: 6 }}>
                {goalLabel || <span className="muted-note" style={{ marginBottom: 0 }}>No goal set — configure in Settings.</span>}
              </div>
            </div>
            <div className="goal-card">
              <div style={{ fontWeight: 700 }}>Monthly Savings Target</div>
              <div style={{ marginTop: 6 }}>
                {goals[0]?.monthlyTarget
                  ? `$${goals[0].monthlyTarget}/month`
                  : onboarding?.monthly
                    ? `$${onboarding.monthly}/month`
                    : <span className="muted-note" style={{ marginBottom: 0 }}>Not set</span>}
              </div>
            </div>
            {goalProgress.target > 0 && (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Goal Progress</div>
                <div className="progress-wrap">
                  <div className="progress-bar"><div style={{ width: `${goalProgress.percent}%` }} /></div>
                  <div className="muted-note" style={{ marginTop: 8, marginBottom: 0 }}>
                    ${Number(goalProgress.current || 0).toFixed(2)} of ${Number(goalProgress.target || 0).toFixed(2)} saved
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Coaching context (read-only) ── */}
      {(goalLabel || coachingFocus) && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ margin: '0 0 12px' }}>Coaching Context</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {goalLabel && (
              <div style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 10, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)', fontWeight: 600, flexShrink: 0 }}>Saving for:</span>
                <span>{goalLabel}</span>
              </div>
            )}
            {coachingFocus && (
              <div style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 10, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)', fontWeight: 600, flexShrink: 0 }}>Focus:</span>
                <span>{coachingFocus}</span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
