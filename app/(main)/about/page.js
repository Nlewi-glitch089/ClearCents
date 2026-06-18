"use client";
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Target } from 'lucide-react';

const audience = [
  {
    icon: <Wallet size={22} strokeWidth={1.75} />,
    title: 'First-Time Earners',
    desc: 'Teens and young adults making their own money for the first time.',
    iconBg: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
    iconShadow: '0 4px 16px rgba(16,192,138,0.22)',
  },
  {
    icon: <TrendingUp size={22} strokeWidth={1.75} />,
    title: 'Irregular Income',
    desc: 'Gig workers, freelancers, and anyone without a steady paycheck.',
    iconBg: 'linear-gradient(135deg, #3ea6ff, #1a7fd1)',
    iconShadow: '0 4px 16px rgba(62,166,255,0.22)',
  },
  {
    icon: <Target size={22} strokeWidth={1.75} />,
    title: 'Building from Zero',
    desc: 'Anyone ready to start managing money but with no system or background to work from.',
    iconBg: 'linear-gradient(135deg, #a78bfa, #7c5fc4)',
    iconShadow: '0 4px 16px rgba(167,139,250,0.22)',
  },
];

export default function About() {
  return (
    <>
      {/* Hero */}
      <motion.div
        className="page-hero card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.2, 0.9, 0.3, 1] }}
      >
        <h2>About ClearCents</h2>
        <p className="lead" style={{ marginTop: 10, marginBottom: 0 }}>
          ClearCents is personal finance for the beginning — when your income is irregular, your
          budget is tight, and no one taught you the rules. Built for teens, young adults, and
          first-time earners who are figuring it out in real time.
        </p>
      </motion.div>

      {/* Challenge + Mission — split columns */}
      <div className="split-row">
        {/* Challenge — blue left-border accent */}
        <motion.div
          className="card compact"
          style={{ borderLeft: '3px solid rgba(62,166,255,0.5)', padding: 22 }}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12, duration: 0.42, ease: [0.2, 0.9, 0.3, 1] }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 12, color: 'var(--heading-blue)' }}>The Challenge</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
            Building financial habits is hardest when your income is unpredictable and your budget
            is tight. Most tools are designed for 9-to-5 salaries — not part-time jobs, side gigs,
            or allowances. And personal finance is rarely taught in a practical, accessible way.
            ClearCents fills that gap: simple tracking, real feedback, and guidance that fits the
            way you actually live.
          </p>
        </motion.div>

        {/* Mission — green gradient centerpiece */}
        <motion.div
          style={{
            background: 'linear-gradient(135deg, rgba(16,192,138,0.08), rgba(7,163,107,0.03))',
            border: '1px solid rgba(16,192,138,0.22)',
            borderRadius: 'var(--radius-lg)',
            padding: '26px 24px',
            boxShadow: '0 4px 20px rgba(16,192,138,0.08)',
          }}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.18, duration: 0.42, ease: [0.2, 0.9, 0.3, 1] }}
        >
          <div style={{
            fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.6px', color: 'var(--accent)', marginBottom: 12,
          }}>
            Our Mission
          </div>
          <h3 style={{ margin: '0 0 14px', color: 'var(--text-primary)', fontSize: '1.125rem', lineHeight: 1.3 }}>
            Give first-time earners a place to start — and a reason to keep going.
          </h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0, fontSize: '0.9375rem' }}>
            Not by simplifying a tool built for someone else, but by building something new for the
            moment before financial literacy becomes a habit: when the numbers feel overwhelming,
            the stakes feel real, and the right guidance makes all the difference.
          </p>
        </motion.div>
      </div>

      {/* Who ClearCents Is For — tile grid */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.42, ease: [0.2, 0.9, 0.3, 1] }}
      >
        <h3 style={{ margin: '0 0 14px', color: 'var(--heading-blue)', fontSize: '1.125rem' }}>
          Who ClearCents Is For
        </h3>
        <div className="audience-grid">
          {audience.map((a, i) => (
            <motion.div
              key={a.title}
              className="audience-tile"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.38, delay: i * 0.08, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <div
                className="audience-tile-icon"
                style={{ background: a.iconBg, boxShadow: a.iconShadow, color: '#021' }}
              >
                {a.icon}
              </div>
              <div className="audience-tile-title">{a.title}</div>
              <div className="audience-tile-desc">{a.desc}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </>
  );
}
