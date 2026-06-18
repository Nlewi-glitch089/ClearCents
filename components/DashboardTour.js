'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const STEPS = [
  {
    title: 'Welcome to your Dashboard',
    body: 'This is your financial command center. Your balance, spending trends, and AI-powered insights all live here.',
  },
  {
    title: 'Log Transactions',
    body: 'Use the "Add" button in Recent Activity to log income or expenses. The more you track, the smarter your coaching gets.',
  },
  {
    title: 'Track Your Goals',
    body: 'Your savings goal and progress ring are in the right panel. Set a target and watch your coach keep you on pace.',
  },
  {
    title: 'Meet Your AI Coach',
    body: 'Tap "Ask AI" anytime to chat with your coach. It knows your spending patterns and gives you personalized advice.',
  },
  {
    title: "You're all set!",
    body: 'Start by logging your first transaction. Your coach will start generating insights once you have some activity.',
  },
];

export default function DashboardTour({ onComplete }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  function next() {
    if (isLast) { onComplete(); } else { setStep(s => s + 1); }
  }

  return (
    <div className="tour-overlay" onClick={e => { if (e.target === e.currentTarget) onComplete(); }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="tour-card"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.26, ease: [0.2, 0.9, 0.3, 1] }}
        >
          {/* Progress bar */}
          <div className="tour-progress-bar">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`tour-progress-segment${i <= step ? ' active' : ''}`}
              />
            ))}
          </div>

          {/* Step counter */}
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--accent)', marginBottom: 10 }}>
            Step {step + 1} of {STEPS.length}
          </div>

          <h3 style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>{STEPS[step].title}</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, fontSize: 14, margin: '0 0 26px' }}>
            {STEPS[step].body}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {!isLast ? (
              <button
                type="button"
                onClick={onComplete}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', padding: '8px 0' }}
              >
                Skip tour
              </button>
            ) : <span />}
            <button type="button" className="btn" style={{ fontSize: 14, padding: '10px 24px' }} onClick={next}>
              {isLast ? 'Get started' : 'Next →'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
