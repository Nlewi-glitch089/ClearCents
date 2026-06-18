"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bot, Shield, Wallet, Heart, AlertTriangle, Zap } from 'lucide-react';

const fadeIn = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.2, 0.9, 0.3, 1] } } };

export default function Why() {
  return (
    <div className="why-page">
      {/* Opening statement */}
      <motion.section
        className="why-opening"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
      >
        <motion.div variants={fadeIn}>
          <span className="why-eyebrow">The honest answer</span>
        </motion.div>
        <motion.h2 className="why-headline" variants={fadeIn}>
          Most budgeting apps weren't built for you.
        </motion.h2>
        <motion.p className="why-subhead" variants={fadeIn}>
          They assume a steady paycheck, a bank account worth syncing, and a spare hour each month to decode charts. If that's not your life — you've been stuck using tools that weren't designed with you in mind.
        </motion.p>
      </motion.section>

      {/* Problem section */}
      <motion.section
        className="why-problems"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.44 }}
      >
        <div className="why-problems-label">
          <AlertTriangle size={14} strokeWidth={2} />
          What traditional apps get wrong
        </div>
        <div className="why-problem-grid">
          {[
            { title: "They require a fixed income", desc: "Budgets built around monthly paychecks fail the moment your income is gig-based, part-time, or irregular." },
            { title: "They give everyone the same tips", desc: "Generic advice like \"cut Starbucks\" ignores what you actually spend on — and doesn't help you build real habits." },
            { title: "They monetize your data", desc: "Free apps often sell your financial behavior to advertisers. Your spending becomes someone else's product." },
            { title: "They overwhelm instead of guide", desc: "Too many charts, categories, and dashboards. Not enough clear answers to the question: am I doing okay?" },
          ].map((p, i) => (
            <motion.div
              key={i}
              className="why-problem-item"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.36, delay: i * 0.06 }}
            >
              <div className="why-problem-dot" />
              <div>
                <strong>{p.title}</strong>
                <p>{p.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Mission divider */}
      <motion.section
        className="why-mission"
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="why-mission-inner">
          <Heart size={22} style={{ color: 'var(--accent)', flexShrink: 0 }} strokeWidth={2} />
          <blockquote>
            ClearCents exists to give everyone the financial clarity that used to require an accountant, a spreadsheet habit, or a degree.
          </blockquote>
        </div>
      </motion.section>

      {/* Three pillars — story format, each in a card */}
      <div className="why-story-sections">
        {[
          {
            icon: <Wallet size={22} strokeWidth={1.75} />,
            iconBg: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            iconShadow: '0 4px 18px rgba(16,192,138,0.28)',
            cardBorder: 'rgba(16,192,138,0.14)',
            cardGlow: 'rgba(16,192,138,0.04)',
            eyebrow: 'Flexible by design',
            title: 'Built for how you actually earn',
            body: [
              "Part-time job this week? Gig work last month? Allowance? Side hustle? ClearCents doesn't force you into a paycheck-based structure.",
              "Log income and expenses whenever they happen — no calendar required. Your financial picture updates in real time, and the AI coach adjusts its guidance to your actual rhythm.",
            ],
            accent: 'var(--accent)',
          },
          {
            icon: <Bot size={22} strokeWidth={1.75} />,
            iconBg: 'linear-gradient(135deg, #3ea6ff, #1a7fd1)',
            iconShadow: '0 4px 18px rgba(62,166,255,0.28)',
            cardBorder: 'rgba(62,166,255,0.14)',
            cardGlow: 'rgba(62,166,255,0.04)',
            eyebrow: 'Personalized coaching',
            title: "An AI that knows your numbers, not a stranger's",
            body: [
              "Most financial advice is written for someone a decade ahead of you with a completely different income, goals, and lifestyle.",
              "ClearCents reads your actual transactions, compares them to your stated goals, and gives you guidance that's specific — not scripted. It can tell you whether you're on pace, where you're drifting, and what to do about it.",
            ],
            accent: '#3ea6ff',
          },
          {
            icon: <Shield size={22} strokeWidth={1.75} />,
            iconBg: 'linear-gradient(135deg, #a78bfa, #7c5fc4)',
            iconShadow: '0 4px 18px rgba(167,139,250,0.28)',
            cardBorder: 'rgba(167,139,250,0.14)',
            cardGlow: 'rgba(167,139,250,0.04)',
            eyebrow: 'Privacy-first',
            title: 'Your data is yours. Full stop.',
            body: [
              "No ads. No data selling. No upsells. No linking your bank account.",
              "You enter what you choose to share. Your financial information is used only to help you — never stored for third parties, never used to build an ad profile. What happens in ClearCents stays in ClearCents.",
            ],
            accent: '#a78bfa',
          },
        ].map((section, i) => (
          <motion.div
            key={i}
            className="why-story-card"
            style={{
              borderColor: section.cardBorder,
              background: `linear-gradient(135deg, ${section.cardGlow} 0%, transparent 60%)`,
            }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            <div className="why-story-card-icon" style={{ background: section.iconBg, boxShadow: section.iconShadow }}>
              {section.icon}
            </div>
            <div className="why-story-text">
              <span className="why-story-eyebrow" style={{ color: section.accent }}>{section.eyebrow}</span>
              <h3>{section.title}</h3>
              {section.body.map((para, j) => (
                <p key={j}>{para}</p>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Closing — natural conversion point after full narrative */}
      <motion.section
        className="why-closing"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.44 }}
      >
        <Zap size={28} style={{ color: 'var(--accent)', margin: '0 auto 16px', display: 'block' }} strokeWidth={2} />
        <h3>Start where you actually are</h3>
        <p>
          You don't need a perfect budget or a steady income to start. You just need to see where your money is going — and someone to help you make sense of it.
        </p>
        <Link href="/auth" className="btn" style={{ marginTop: 24 }}>Get Started — It's Free</Link>
      </motion.section>
    </div>
  );
}
