import { Info } from 'lucide-react';

/**
 * AIDisclosure — renders a persistent disclaimer beneath AI-generated content.
 *
 * variant="inline"  — compact single-line note (used inside chat messages)
 * variant="panel"   — slightly larger, used in the chat panel empty state header
 * variant="card"    — used in the AI insight sidebar card
 */
export default function AIDisclosure({ variant = 'inline', showDataNote = false }) {
  if (variant === 'panel') {
    return (
      <div
        role="note"
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--muted)',
          lineHeight: 1.55,
        }}
      >
        <Info size={13} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1, color: 'var(--muted)' }} aria-hidden="true" />
        <span>
          {showDataNote
            ? 'Responses are general guidance — your coach gives personalized analysis once you\'ve logged transactions and signed in.'
            : 'Educational guidance only — not professional financial advice.'}
        </span>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        role="note"
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--border-subtle)',
          fontSize: 11,
          color: 'var(--muted)',
          lineHeight: 1.5,
        }}
      >
        Educational guidance only — not professional financial advice.{' '}
        <a href="/terms#ai" style={{ color: 'var(--muted)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
          Learn more
        </a>
      </div>
    );
  }

  // Default: inline
  return (
    <div
      role="note"
      style={{
        fontSize: 11,
        color: 'var(--muted)',
        lineHeight: 1.5,
        padding: '6px 0 0',
      }}
    >
      Educational guidance only — not professional financial advice.
    </div>
  );
}
