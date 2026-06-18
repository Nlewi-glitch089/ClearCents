export const metadata = {
  title: 'Privacy Policy — ClearCents',
  description: 'How ClearCents collects, uses, and protects your information.',
};

const LAST_UPDATED = 'June 16, 2026';
const CONTACT_EMAIL = 'privacy@clearcents.app';

export default function PrivacyPage() {
  return (
    <div className="legal-page">

      <div className="legal-page-header">
        <h1>Privacy Policy</h1>
        <p className="legal-page-tagline">
          ClearCents is built for people figuring out their finances. Your data is yours — we use
          it to help you, not to sell to anyone else.
        </p>
        <div className="legal-page-meta">Last updated: {LAST_UPDATED}</div>
      </div>

      <LegalSection title="1. Who We Are">
        <p>
          ClearCents is a personal finance tracking and coaching application designed for teens,
          young adults, and first-time earners. We are not a licensed financial institution,
          bank, investment advisor, or credit provider.
        </p>
        <p>
          Privacy questions:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</a>
        </p>
      </LegalSection>

      <LegalSection title="2. What We Collect">
        <strong>Account information</strong>
        <ul>
          <li>Email address (required to create an account)</li>
          <li>Password (stored as a one-way cryptographic hash — we cannot read your password)</li>
          <li>Display name (optional)</li>
          <li>Account role (used to control feature access)</li>
        </ul>

        <strong>Financial data you enter</strong>
        <ul>
          <li>Transaction records: amounts, dates, types, and descriptions you write</li>
          <li>Spending categories you assign to transactions</li>
          <li>Savings goals: name, target amount, and progress</li>
        </ul>

        <strong>Coaching and onboarding preferences</strong>
        <ul>
          <li>Income type (e.g., part-time job, freelance, allowance)</li>
          <li>Goal type (e.g., new phone, emergency fund)</li>
          <li>Coaching focus (e.g., spend less, save more)</li>
        </ul>

        <strong>AI conversation history</strong>
        <ul>
          <li>
            Questions and responses from the AI Coach chat panel are stored locally in your
            browser (localStorage) and are not sent to our servers.
          </li>
          <li>
            AI-generated financial insights are stored in your account to provide continuity
            between sessions.
          </li>
        </ul>

        <strong>Session data</strong>
        <ul>
          <li>
            We use an HTTP-only session cookie to keep you signed in. It does not track you
            across other websites.
          </li>
          <li>
            We track the dates on which you log transactions to measure consistency habits. We
            do not track page views, clicks, or browsing behavior.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. What We Do Not Collect">
        <ul>
          <li>Bank account numbers, routing numbers, or credentials for any financial institution</li>
          <li>Credit card or debit card numbers</li>
          <li>Social Security numbers or government-issued identification</li>
          <li>Credit scores or credit history</li>
          <li>Investment account data</li>
          <li>Biometric data or location data</li>
          <li>Anything you do not manually enter yourself</li>
        </ul>
        <p>
          ClearCents does not connect to your bank, credit union, or any financial account. All
          data in your account is data you typed in.
        </p>
      </LegalSection>

      <LegalSection title="4. How We Use Your Data">
        <ul>
          <li>To display your financial summary, transaction history, goal progress, and insights</li>
          <li>To generate personalized AI coaching based on the data you enter</li>
          <li>To authenticate your account and maintain your session</li>
          <li>To deliver consistency feedback (days active, habit tracking)</li>
        </ul>
        <p>
          We do not sell your data. We do not share your data with advertisers. We do not use
          your data to build advertising profiles.
        </p>
      </LegalSection>

      <LegalSection title="5. AI Processing">
        <p>
          ClearCents uses <strong>OpenAI</strong> to generate financial insights and coaching
          responses. When you request an insight or ask a question in the AI Coach panel, a
          portion of your financial data — including transaction totals, spending categories, and
          goal progress — is transmitted to OpenAI's API for processing.
        </p>
        <ul>
          <li>
            OpenAI processes this data to generate your response and does not use it to train
            their models (per their API data usage policy, as of this writing).
          </li>
          <li>
            We send only the data needed to answer your specific question.
          </li>
          <li>
            AI Coach responses are educational guidance only — not professional financial, tax,
            legal, or investment advice. See our{' '}
            <a href="/terms" style={{ color: 'var(--accent)' }}>Terms of Service</a> for the full disclaimer.
          </li>
        </ul>
        <p>
          OpenAI's privacy policy governs how they handle data transmitted through their API.
        </p>
      </LegalSection>

      <LegalSection title="6. Data Storage and Security">
        <ul>
          <li>Your data is stored in a PostgreSQL database hosted on a third-party cloud provider.</li>
          <li>Passwords are hashed with bcrypt. We cannot recover your password — only reset it.</li>
          <li>All data is transmitted over HTTPS (TLS encryption in transit).</li>
          <li>Session cookies are marked HTTP-only and Secure.</li>
        </ul>
        <p>
          No system is perfectly secure. If you discover a vulnerability, please report it
          to <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</a> immediately.
        </p>
      </LegalSection>

      <LegalSection title="7. Data Retention">
        <ul>
          <li><strong>Active accounts:</strong> retained for as long as your account exists.</li>
          <li>
            <strong>Deleted accounts:</strong> personal data is permanently deleted within 30
            days of an account deletion request.
          </li>
          <li>
            <strong>Guest sessions:</strong> data entered as a guest is stored only in your
            browser's localStorage and is never sent to our servers.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Your Rights">
        <p>You have the right to:</p>
        <ul>
          <li><strong>Access your data</strong> — view all transactions, goals, and account information in the app</li>
          <li><strong>Correct your data</strong> — edit or delete any transaction or goal directly</li>
          <li><strong>Delete your account</strong> — via Settings → Delete Account, or by emailing us</li>
          <li><strong>Data portability</strong> — contact us to request an export in a machine-readable format</li>
        </ul>
        <p>
          To exercise these rights:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</a>.
          We respond within 14 business days.
        </p>
      </LegalSection>

      <LegalSection title="9. Children's Privacy">
        <p>
          ClearCents is intended for users aged 13 and older. We do not knowingly collect
          personal information from children under 13. If you believe your child under 13 has
          created an account, contact us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</a>{' '}
          and we will delete the account promptly.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to This Policy">
        <p>
          We may update this policy as the product evolves. When we make material changes, we
          will update the "Last updated" date and notify active users by email where appropriate.
          Continued use of ClearCents after a policy update constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>
          Privacy questions and data requests:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</a>
        </p>
        <p>
          General support: <a href="/contact" style={{ color: 'var(--accent)' }}>Contact page →</a>
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
