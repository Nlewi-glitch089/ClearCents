import Link from 'next/link';

const logoSvg = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M9 2v1.5M9 14.5V16M4.5 9H3M15 9h-1.5M6.5 6.5L5.5 5.5M12.5 12.5l-1-1M11.5 6.5l1-1M5.5 12.5l1-1" stroke="#021" strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="9" cy="9" r="3" fill="#021"/>
  </svg>
);

export default function LegalLayout({ children }) {
  return (
    <>
      <header className="legal-header">
        <Link href="/" className="legal-brand">
          <div className="logo">{logoSvg}</div>
          ClearCents
        </Link>
        <Link href="/" className="legal-header-back">← Back to site</Link>
      </header>
      <main className="legal-main">
        {children}
      </main>
      <footer className="legal-footer">
        <div>© 2026 ClearCents</div>
        <nav aria-label="Legal links">
          <Link href="/privacy">Privacy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms">Terms</Link>
          <span aria-hidden="true">·</span>
          <Link href="/contact">Contact</Link>
        </nav>
      </footer>
    </>
  );
}
