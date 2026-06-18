"use client";
import { motion } from 'framer-motion';
import { Wallet, Target, Bot, BarChart2, Tag, Bell, TrendingUp } from 'lucide-react';

const fadeIn = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.44, ease: [0.2, 0.9, 0.3, 1] } } };

const features = [
  {
    icon: <Wallet size={24} strokeWidth={1.75} />,
    iconBg: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
    iconShadow: '0 4px 18px rgba(16,192,138,0.28)',
    tag: 'Income & Expenses',
    title: 'Track every dollar — income and out',
    desc: 'Log jobs, gigs, allowances, and expenses in seconds. No categories to set up, no accounts to link. Just tap and track.',
    details: ['Part-time, gig, and irregular income supported', 'Expense categories auto-suggested', 'Edit or delete any entry any time'],
    accent: 'var(--accent)',
    previewBg: 'rgba(16,192,138,0.04)',
    previewBorder: 'rgba(16,192,138,0.12)',
  },
  {
    icon: <Tag size={24} strokeWidth={1.75} />,
    iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
    iconShadow: '0 4px 18px rgba(245,158,11,0.28)',
    tag: 'Categories',
    title: 'Spending organized without the effort',
    desc: 'Every transaction lands in a category automatically. See at a glance what food, transport, entertainment, and everything else actually costs you each month.',
    details: ['Custom category support', 'Monthly breakdown by category', 'Color-coded for instant recognition'],
    accent: '#f59e0b',
    previewBg: 'rgba(245,158,11,0.04)',
    previewBorder: 'rgba(245,158,11,0.12)',
  },
  {
    icon: <Target size={24} strokeWidth={1.75} />,
    iconBg: 'linear-gradient(135deg, #3ea6ff, #1a7fd1)',
    iconShadow: '0 4px 18px rgba(62,166,255,0.28)',
    tag: 'Goals',
    title: 'Turn a number in your head into visible progress',
    desc: 'Set a savings goal, log consistently, and watch the ring fill. Your goal tracks against your actual income — not a theoretical budget.',
    details: ['Visual ring progress tracker', 'Target date and milestone tracking', 'Pace calculation: on track or behind'],
    accent: '#3ea6ff',
    previewBg: 'rgba(62,166,255,0.04)',
    previewBorder: 'rgba(62,166,255,0.12)',
  },
  {
    icon: <BarChart2 size={24} strokeWidth={1.75} />,
    iconBg: 'linear-gradient(135deg, #a78bfa, #7c5fc4)',
    iconShadow: '0 4px 18px rgba(167,139,250,0.28)',
    tag: 'Reports',
    title: 'See the full picture, not just a number',
    desc: 'Income vs. expense charts, spending trends, and month-over-month comparisons — all automatically generated from your transactions.',
    details: ['Monthly income vs. expense bar chart', 'Spending trend detection', 'Net balance history'],
    accent: '#a78bfa',
    previewBg: 'rgba(167,139,250,0.04)',
    previewBorder: 'rgba(167,139,250,0.12)',
  },
  {
    icon: <Bell size={24} strokeWidth={1.75} />,
    iconBg: 'linear-gradient(135deg, #f87171, #dc4444)',
    iconShadow: '0 4px 18px rgba(248,113,113,0.28)',
    tag: 'Alerts',
    title: 'Know before it becomes a problem',
    desc: 'Smart alerts surface when your spending spikes, when you\'re falling behind on a goal, or when a pattern puts your budget at risk.',
    details: ['Spending spike detection', 'Goal pace warnings', 'Streak and consistency tracking'],
    accent: '#f87171',
    previewBg: 'rgba(248,113,113,0.04)',
    previewBorder: 'rgba(248,113,113,0.12)',
  },
  {
    icon: <Bot size={24} strokeWidth={1.75} />,
    iconBg: 'linear-gradient(135deg, #10c08a, #3ea6ff)',
    iconShadow: '0 4px 18px rgba(16,192,138,0.28)',
    tag: 'AI Coach',
    title: 'Ask a question. Get a real answer.',
    desc: 'Your AI coach reads your actual transactions and gives personalized guidance — not generic tips. Ask anything about your finances and get an answer based on your numbers.',
    details: ['Knows your spending patterns', 'Goal-aware pacing advice', 'Conversation history saved'],
    accent: 'var(--accent)',
    previewBg: 'rgba(16,192,138,0.04)',
    previewBorder: 'rgba(16,192,138,0.12)',
    highlight: true,
  },
];

export default function Features() {
  return (
    <div className="features-page">
      {/* Hero */}
      <motion.section
        className="features-hero"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.09 } } }}
      >
        <motion.div variants={fadeIn}>
          <span className="why-eyebrow" style={{ color: 'var(--accent)' }}>What's inside</span>
        </motion.div>
        <motion.h2 className="features-headline" variants={fadeIn}>
          Everything you need.<br />Nothing you don't.
        </motion.h2>
        <motion.p className="features-subhead" variants={fadeIn}>
          ClearCents gives you the tools to track, understand, and improve your finances — without the complexity of apps built for someone else's life.
        </motion.p>
      </motion.section>

      {/* Feature showcase grid */}
      <div className="features-showcase">
        {features.map((f, i) => (
          <motion.div
            key={f.tag}
            className={`feature-card${f.highlight ? ' feature-card--highlight' : ''}`}
            style={{
              '--feature-accent': f.accent,
              '--feature-bg': f.previewBg,
              '--feature-border': f.previewBorder,
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.44, delay: (i % 3) * 0.06 }}
          >
            <div className="feature-card-header">
              <div className="feature-card-icon" style={{ background: f.iconBg, boxShadow: f.iconShadow }}>
                {f.icon}
              </div>
              <span className="feature-card-tag" style={{ color: f.accent, background: f.previewBg, borderColor: f.previewBorder }}>
                {f.tag}
              </span>
            </div>
            <h3 className="feature-card-title">{f.title}</h3>
            <p className="feature-card-desc">{f.desc}</p>
            <ul className="feature-card-details">
              {f.details.map((d, j) => (
                <li key={j}>
                  <span className="feature-detail-dot" style={{ background: f.accent }} />
                  {d}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      {/* Bottom callout — no CTA button, just feature summary */}
      <motion.section
        className="features-summary"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.44 }}
      >
        <div className="features-summary-inner">
          <TrendingUp size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} strokeWidth={2} />
          <p>
            All features work together — transactions feed your goals, goals feed the AI coach, and the coach helps you make smarter decisions with your real numbers.
          </p>
        </div>
      </motion.section>
    </div>
  );
}
