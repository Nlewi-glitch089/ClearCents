export const metadata = {
  title: 'Terms of Service — ClearCents',
  description: 'The terms governing your use of ClearCents.',
};

const LAST_UPDATED = 'June 16, 2026';
const CONTACT_EMAIL = 'support@clearcents.app';

export default function TermsPage() {
  return (
    <div className="legal-page">

      <div className="legal-page-header">
        <h1>Terms of Service</h1>
        <p className="legal-page-tagline">
          By using ClearCents, you agree to these terms. They include important information about
          the AI Coach and the limits of what we can promise.
        </p>
        <div className="legal-page-meta">Last updated: {LAST_UPDATED}</div>
      </div>

      {/* AI disclaimer — prominent but styled consistently with the legal page */}
      <div style={{
        padding: '16px 20px',
        marginBottom: 36,
        background: 'rgba(248,113,113,0.06)',
        border: '1px solid rgba(248,113,113,0.2)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.9375rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.65,
      }}>
        <strong style={{ color: '#f87171', display: 'block', marginBottom: 4 }}>AI Disclaimer — Read This First</strong>
        ClearCents provides educational financial information, not professional financial advice.
        The AI Coach analyzes the data you enter and offers general guidance. It is not a licensed
        financial advisor, broker, or planner. Do not make significant financial decisions based
        solely on AI-generated responses. Always consult a qualified professional.
      </div>

      <LegalSection title="1. Acceptance of Terms">
        <p>
          By creating an account or using ClearCents, you agree to these Terms of Service and our{' '}
          <a href="/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy</a>. If you do not
          agree, do not use the service.
        </p>
        <p>
          We may update these terms as the product evolves. We will notify active users of material
          changes. Continued use after an update constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection title="2. Age Requirements">
        <p>
          You must be at least <strong>13 years old</strong> to create a ClearCents account.
          By creating an account, you confirm you meet this requirement.
        </p>
        <p>
          We do not knowingly allow accounts for users under 13. If we discover an account was
          created by a child under 13, we will delete it promptly.
        </p>
      </LegalSection>

      <LegalSection title="3. Your Account">
        <p>
          You are responsible for the security of your account credentials. Do not share your
          password. You are responsible for all activity that occurs under your account.
        </p>
        <p>
          You own your account data — the transactions, goals, and preferences you enter.
          ClearCents does not claim ownership of user-generated content.
        </p>
      </LegalSection>

      <LegalSection title="4. AI Coach — Scope and Limitations">
        <p>
          The AI Coach analyzes transaction data, goal progress, and onboarding preferences you
          enter into ClearCents. Its responses are educational in nature.
        </p>
        <p><strong>The AI Coach:</strong></p>
        <ul>
          <li>Provides general financial education based on your self-reported data</li>
          <li>Identifies patterns in your spending and savings habits</li>
          <li>Suggests areas where you might improve your financial habits</li>
          <li>Answers general questions about personal finance concepts</li>
        </ul>
        <p><strong>The AI Coach does not:</strong></p>
        <ul>
          <li>Guarantee the accuracy of its analysis or predictions</li>
          <li>Provide licensed financial, investment, tax, or legal advice</li>
          <li>Account for information you have not entered into the app</li>
          <li>Have access to your bank accounts or external financial systems</li>
          <li>Replace the judgment of a qualified financial professional</li>
        </ul>
        <p>
          AI-generated responses can be incomplete or inaccurate. ClearCents is not liable for
          decisions made based on AI guidance.
        </p>
      </LegalSection>

      <LegalSection title="5. Financial Disclaimer">
        <p>
          ClearCents is a personal finance tracking and education tool. It is not a bank,
          investment platform, credit provider, or licensed financial advisor.
        </p>
        <p>
          Nothing in ClearCents — including AI responses, financial summaries, goal projections,
          and insights — constitutes investment advice, tax advice, legal advice, or professional
          financial guidance. Savings projections and goal timelines are estimates. Actual results
          will vary.
        </p>
      </LegalSection>

      <LegalSection title="6. Acceptable Use">
        <p>You agree not to:</p>
        <ul>
          <li>Use ClearCents for any unlawful purpose</li>
          <li>Attempt to reverse-engineer, scrape, or copy the service</li>
          <li>Use automated tools to interact with the service without permission</li>
          <li>Attempt to access other users' accounts or data</li>
        </ul>
        <p>Violating these terms may result in suspension or termination of your account.</p>
      </LegalSection>

      <LegalSection title="7. Service Availability">
        <p>
          ClearCents is provided "as-is" and "as-available." We may modify, suspend, or discontinue
          the service at any time with reasonable notice where possible. We are not liable for data
          loss resulting from service interruptions.
        </p>
      </LegalSection>

      <LegalSection title="8. Data Ownership and Export">
        <p>
          You own the data you enter into ClearCents. You may request an export at any time by
          contacting{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection title="9. Account Termination">
        <p>
          You may delete your account at any time via Settings → Delete Account. Account deletion
          permanently removes your data within 30 days.
        </p>
      </LegalSection>

      <LegalSection title="10. Limitation of Liability">
        <p>To the fullest extent permitted by law, ClearCents is not liable for:</p>
        <ul>
          <li>Financial losses arising from decisions made based on AI guidance</li>
          <li>Inaccuracies in financial projections or goal estimates</li>
          <li>Data loss due to service interruptions or account deletion</li>
          <li>Any indirect, incidental, or consequential damages from use of the service</li>
        </ul>
        <p>
          Since ClearCents is currently free, our total liability to you is zero.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>
          Questions about these terms:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</a>
        </p>
        <p>
          <a href="/contact" style={{ color: 'var(--accent)' }}>Contact page →</a>
          {' · '}
          <a href="/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy →</a>
        </p>
      </LegalSection>

    </div>
  );
}

function LegalSection({ title, children }) {
  return (
    <div className="legal-section">
      <h2>{title}</h2>
      <div className="legal-section-body">{children}</div>
    </div>
  );
}
