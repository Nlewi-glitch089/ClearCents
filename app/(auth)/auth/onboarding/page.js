"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const INCOME_TYPES = [
  'Part-time Job',
  'Gig Work',
  'Freelance',
  'Allowance',
  'Multiple Sources',
  'Other',
];

const GOAL_TYPES = [
  'Emergency Fund',
  'New Phone',
  'Laptop',
  'Car',
  'School',
  'Travel',
  'Rent',
  'Other',
];

const COACHING_FOCUS = [
  'Spend Less',
  'Save More',
  'Reach My Goal',
  'Build a Budget',
  'Understand My Money',
];

const TOTAL_STEPS = 4;

function OptionGrid({ options, value, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 14 }}>
      {options.map((opt, i) => (
        <div
          key={opt}
          className={`option-tile${value === opt ? ' selected' : ''}`}
          style={options.length % 2 !== 0 && i === options.length - 1 ? { gridColumn: 'span 2' } : undefined}
          onClick={() => onSelect(opt)}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(opt); }}
        >
          <div className="tile-content">
            <div className="tile-label">{opt}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryRow({ emoji, label, value, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px',
      background: 'var(--surface-1)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, flexShrink: 0,
      }}>{emoji}</div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [incomeType, setIncomeType] = useState('');
  const [goalType, setGoalType] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [coachingFocus, setCoachingFocus] = useState('');
  const [isExisting, setIsExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    fetch('/api/onboarding', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (!mounted || !d.onboarding) return;
        setIsExisting(true);
        const ob = d.onboarding;
        setIncomeType(ob.incomeType || '');
        setGoalType(ob.goalType || ob.goal || '');
        setTargetAmount(ob.targetAmount ? String(ob.targetAmount) : '');
        setCoachingFocus(ob.coachingFocus || (Array.isArray(ob.reasons) ? ob.reasons[0] : '') || '');
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  async function handleSubmit() {
    setLoading(true);
    setError('');
    const parsedTarget = parseFloat(targetAmount.replace(/,/g, '')) || 0;
    const body = {
      incomeType,
      goalType,
      targetAmount: parsedTarget > 0 ? parsedTarget : undefined,
      coachingFocus,
      goal: goalType,
      reasons: coachingFocus ? [coachingFocus] : [],
      why: incomeType ? `Income type: ${incomeType}` : '',
    };
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save'); setLoading(false); return; }
      try { window.dispatchEvent(new CustomEvent('onboarding:updated', { detail: data.onboarding || body })); } catch (_) {}
      router.push(isExisting ? '/settings' : '/product');
    } catch (e) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  const progressPct = (step / TOTAL_STEPS) * 100;

  const stepVariants = {
    hidden: { opacity: 0, x: 16 },
    show: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.2, 0.9, 0.3, 1] } },
    exit: { opacity: 0, x: -16, transition: { duration: 0.18 } },
  };

  return (
    <div className="container app-main">
      <div style={{ maxWidth: 640, margin: '28px auto' }}>

        {/* Hero + progress */}
        <motion.div
          className="page-hero card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.2, 0.9, 0.3, 1] }}
        >
          <h2>{isExisting ? 'Update Your Setup' : 'Welcome to ClearCents'}</h2>
          <p className="lead" style={{ marginTop: 8, marginBottom: 0 }}>
            {isExisting
              ? 'Update your preferences below and save.'
              : "Let's get your coach ready. This takes about 30 seconds."}
          </p>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginTop: 14 }}>
            <div style={{
              width: `${progressPct}%`, height: 4,
              background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
              transition: 'width 0.35s ease', borderRadius: 4,
            }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Step {step} of {TOTAL_STEPS}</div>
        </motion.div>

        <div className="onboarding-card">
          <AnimatePresence mode="wait">

            {/* Step 1 — Income Type */}
            {step === 1 && (
              <motion.div key="step1" variants={stepVariants} initial="hidden" animate="show" exit="exit">
                <h3 style={{ margin: '0 0 4px', color: 'var(--text-primary)', fontSize: '1.0625rem' }}>
                  How do you earn money?
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  Your coach will tailor feedback around your income type.
                </p>
                <OptionGrid options={INCOME_TYPES} value={incomeType} onSelect={setIncomeType} />
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn ghost" onClick={() => router.push('/product')} style={{ minWidth: 120 }}>
                    Skip for now
                  </button>
                  <button
                    type="button" className="btn" style={{ flex: 1 }}
                    onClick={() => setStep(2)}
                    disabled={!incomeType}
                  >
                    Next →
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2 — Primary Goal */}
            {step === 2 && (
              <motion.div key="step2" variants={stepVariants} initial="hidden" animate="show" exit="exit">
                <h3 style={{ margin: '0 0 4px', color: 'var(--text-primary)', fontSize: '1.0625rem' }}>
                  What are you saving for?
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  Your coach will track your progress toward this goal.
                </p>
                <OptionGrid options={GOAL_TYPES} value={goalType} onSelect={setGoalType} />
                {goalType && (
                  <div style={{ marginTop: 16 }}>
                    <label htmlFor="onboarding-target-amount" style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
                      Target amount <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 600, fontSize: 15, pointerEvents: 'none' }}>$</span>
                      <input
                        id="onboarding-target-amount"
                        type="number"
                        min="1"
                        step="1"
                        value={targetAmount}
                        onChange={e => setTargetAmount(e.target.value)}
                        placeholder="e.g. 1200"
                        className="form-control"
                        style={{ paddingLeft: 26 }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      Adding an amount lets your coach track how close you are to your goal.
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn ghost" onClick={() => setStep(1)}>← Back</button>
                  <button
                    type="button" className="btn" style={{ flex: 1 }}
                    onClick={() => setStep(3)}
                    disabled={!goalType}
                  >
                    Next →
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3 — Coaching Focus */}
            {step === 3 && (
              <motion.div key="step3" variants={stepVariants} initial="hidden" animate="show" exit="exit">
                <h3 style={{ margin: '0 0 4px', color: 'var(--text-primary)', fontSize: '1.0625rem' }}>
                  What should your coach focus on?
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  This shapes the suggestions and feedback you receive.
                </p>
                <OptionGrid options={COACHING_FOCUS} value={coachingFocus} onSelect={setCoachingFocus} />
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn ghost" onClick={() => setStep(2)}>← Back</button>
                  <button
                    type="button" className="btn" style={{ flex: 1 }}
                    onClick={() => setStep(4)}
                    disabled={!coachingFocus}
                  >
                    Next →
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4 — Confirmation */}
            {step === 4 && (
              <motion.div key="step4" variants={stepVariants} initial="hidden" animate="show" exit="exit">
                <h3 style={{ margin: '0 0 6px', color: 'var(--text-primary)', fontSize: '1.0625rem' }}>
                  Your coach is ready.
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  Here's what we'll use to personalize your experience:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  <SummaryRow
                    emoji="💼"
                    label="Income type"
                    value={incomeType}
                    color="linear-gradient(135deg, var(--accent), var(--accent-2))"
                  />
                  <SummaryRow
                    emoji="🎯"
                    label="Saving for"
                    value={targetAmount ? `${goalType} · $${Number(targetAmount).toLocaleString()}` : goalType}
                    color="linear-gradient(135deg, #3ea6ff, #1a7fd1)"
                  />
                  <SummaryRow
                    emoji="🤖"
                    label="Coaching focus"
                    value={coachingFocus}
                    color="linear-gradient(135deg, #a78bfa, #7c5fc4)"
                  />
                </div>
                {error && <div style={{ color: '#ffb4b4', marginBottom: 12, fontSize: 13 }}>{error}</div>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn ghost" onClick={() => setStep(3)}>← Back</button>
                  <button
                    type="button" className="btn" style={{ flex: 1 }}
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? 'Setting up…' : (isExisting ? 'Save changes' : 'Start coaching →')}
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
