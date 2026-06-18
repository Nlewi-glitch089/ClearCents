export const metadata = {
  title: 'Contact — ClearCents',
  description: 'Get help, report issues, or request account deletion.',
};

const SUPPORT_EMAIL = 'support@clearcents.app';
const PRIVACY_EMAIL = 'privacy@clearcents.app';

export default function ContactPage() {
  return (
    <div className="legal-page">

      <div className="legal-page-header">
        <h1>Contact & Support</h1>
        <p className="legal-page-tagline">
          We respond to all messages within 2 business days.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <ContactCard
          title="General Support"
          description="Questions about the app, bug reports, or anything that isn't working the way you expect."
          email={SUPPORT_EMAIL}
          label="Email Support"
          accent="var(--accent)"
          border="rgba(16,192,138,0.22)"
          bg="rgba(16,192,138,0.04)"
        />

        <ContactCard
          title="Privacy & Data"
          description="Privacy questions, data export requests, or anything related to your personal information."
          email={PRIVACY_EMAIL}
          label="Email Privacy Team"
          accent="var(--heading-blue)"
          border="rgba(62,166,255,0.22)"
          bg="rgba(62,166,255,0.04)"
        />

        <div style={{
          background: 'rgba(248,113,113,0.04)',
          border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '22px 24px',
        }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '1rem', color: '#f87171', fontWeight: 700 }}>
            Delete My Account
          </h3>
          <p style={{ margin: '0 0 12px', fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            To permanently delete your account and all associated data, sign in and go to{' '}
            <strong>Settings → Delete Account</strong>. This is immediate and cannot be undone.
          </p>
          <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            If you cannot access your account, email{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`} style={{ color: '#f87171' }}>{PRIVACY_EMAIL}</a>{' '}
            with subject "Account Deletion Request" and the email address on your account.
            We will complete the deletion within 30 days.
          </p>
        </div>

        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '20px 24px',
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Useful Links
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href="/privacy" style={{ color: 'var(--accent)', fontSize: '0.9375rem', textDecoration: 'none' }}>
              Privacy Policy →
            </a>
            <a href="/terms" style={{ color: 'var(--accent)', fontSize: '0.9375rem', textDecoration: 'none' }}>
              Terms of Service →
            </a>
            <a href="/auth" style={{ color: 'var(--accent)', fontSize: '0.9375rem', textDecoration: 'none' }}>
              Sign in / Create Account →
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

function ContactCard({ title, description, email, label, accent, border, bg }) {
  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 'var(--radius-md)',
      padding: '22px 24px',
    }}>
      <h3 style={{ margin: '0 0 8px', fontSize: '1rem', color: accent, fontWeight: 700 }}>
        {title}
      </h3>
      <p style={{ margin: '0 0 16px', fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
        {description}
      </p>
      <a
        href={`mailto:${email}`}
        style={{
          display: 'inline-block',
          padding: '8px 16px',
          background: accent,
          color: '#021',
          borderRadius: 'var(--radius-sm)',
          fontWeight: 700,
          fontSize: 13,
          textDecoration: 'none',
        }}
      >
        {label}
      </a>
      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>{email}</div>
    </div>
  );
}
