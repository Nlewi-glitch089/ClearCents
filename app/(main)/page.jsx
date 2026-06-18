"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';

const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.2, 0.9, 0.3, 1] } } };
const stagger = { show: { transition: { staggerChildren: 0.09 } } };

const transformations = [
  {
    before: "I check my balance but never know where it actually went",
    after: "I see every dollar categorized the moment I log it",
  },
  {
    before: "I've been 'trying to save' for months with nothing to show",
    after: "I can see exactly how close I am — and it keeps moving forward",
  },
  {
    before: "Finance apps give me charts and generic tips I've heard before",
    after: "My coach spots patterns in my spending and tells me what to change",
  },
];

function MiniGoalRing({ percent = 42 }) {
  const size = 48, stroke = 5, r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ - (percent / 100) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#rg-mini)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off} />
        <defs>
          <linearGradient id="rg-mini" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10c08a" />
            <stop offset="100%" stopColor="#07a36b" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'var(--text-primary)' }}>
        {percent}%
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* ── Hero ── */}
      <motion.div
        className="home-hero"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp}>
          <span className="home-badge">Free to use · No bank linking · No setup required</span>
        </motion.div>

        <motion.h2 className="home-statement" variants={fadeUp} style={{ maxWidth: 700, margin: '0 auto 18px' }}>
          Know where your money goes.<br />
          <em>Finally.</em>
        </motion.h2>

        <motion.p className="home-lead" variants={fadeUp}>
          Track spending, set real goals, and get AI coaching built around your actual habits — not a textbook.
        </motion.p>
      </motion.div>

      {/* ── Dashboard preview window ── */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32, duration: 0.58, ease: [0.2, 0.9, 0.3, 1] }}
      >
        <div className="product-window">
          <div className="product-window-chrome">
            <div className="product-window-dot" />
            <div className="product-window-dot" />
            <div className="product-window-dot" />
            <div style={{ marginLeft: 10, fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>ClearCents · Dashboard</div>
          </div>
          <div className="product-window-body">
            <div className="pw-balance-row">
              <div>
                <div className="pw-balance-label">Net Balance · June</div>
                <div className="pw-balance" style={{ color: 'var(--text-primary)' }}>+$847.50</div>
              </div>
              <div className="pw-stats">
                <div className="pw-stat">
                  <strong style={{ color: 'var(--accent)' }}>+$2,150</strong>
                  Income
                </div>
                <div className="pw-stat">
                  <strong style={{ color: '#f87171' }}>−$1,302</strong>
                  Expenses
                </div>
              </div>
            </div>
            <div className="pw-row">
              <div className="pw-goal">
                <MiniGoalRing percent={42} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: 3 }}>Savings Goal</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Emergency Fund</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>$2,100 of $5,000 saved</div>
                </div>
              </div>
              <div className="pw-coach">
                <div className="pw-coach-label">AI Coach</div>
                <div className="pw-coach-text">
                  Your food spending dropped 18% last month — a strong signal you're building better habits. At this pace, you'll hit your Emergency Fund goal in 7 months.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA cap — visually connects to the bottom of the window */}
        <div className="home-preview-cta">
          <Link href="/auth" className="btn" style={{ fontSize: '0.9375rem' }}>
            Start Tracking Your Finances Free
          </Link>
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
            No credit card · No bank linking · Takes 60 seconds
          </div>
        </div>
      </motion.div>

      {/* ── Before / After ── */}
      <motion.div
        className="transform-section"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.44, ease: [0.2, 0.9, 0.3, 1] }}
      >
        <div className="transform-label">What changes when you use ClearCents</div>
        <div className="before-after-grid">
          {transformations.map((t, i) => (
            <motion.div
              key={i}
              className="before-after-item"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.38, delay: i * 0.07, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <div className="before-after-before">{t.before}</div>
              <div className="before-after-after">{t.after}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </>
  );
}
