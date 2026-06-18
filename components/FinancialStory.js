'use client';

export default function FinancialStory({ memory }) {
  if (!memory) return null;

  const sentences = [];

  for (const p of (memory.improvingPatterns || [])) {
    if (p === 'savings_rate') {
      sentences.push('Your savings rate has been improving.');
    } else {
      const label = p.replace(/_spend$/, '').replace(/_/g, ' ');
      sentences.push(`Your ${label} spending is trending in the right direction.`);
    }
  }

  for (const p of (memory.worseningPatterns || [])) {
    if (p === 'savings_rate') {
      sentences.push('Your savings rate has been declining over recent periods.');
    } else {
      const label = p.replace(/_spend$/, '').replace(/_/g, ' ');
      sentences.push(`Your ${label} spending has been elevated for multiple periods.`);
    }
  }

  for (const id of (memory.resolvedAlerts || [])) {
    const label = id.replace(/_/g, ' ');
    sentences.push(`A recent ${label} has resolved.`);
  }

  for (const [signalId, count] of Object.entries(memory.streaks || {})) {
    if (count >= 3) {
      const label = signalId.replace(/_/g, ' ');
      sentences.push(`${label} has continued for ${count} consecutive periods.`);
    }
  }

  if (sentences.length === 0) return null;

  return (
    <div className="card card--static" style={{ borderColor: 'rgba(62,166,255,0.18)', background: 'linear-gradient(135deg, rgba(62,166,255,0.04), transparent)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--heading-blue)', marginBottom: 10 }}>
        Financial Story
      </div>
      <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.65 }}>
        {sentences.map((s, i) => (
          <li key={i} style={{ marginBottom: i < sentences.length - 1 ? 6 : 0 }}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
