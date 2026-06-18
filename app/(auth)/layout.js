import Link from 'next/link';

export default function AuthLayout({ children }) {
  return (
    <>
      <header className="auth-header">
        <Link href="/" className="auth-brand" aria-label="ClearCents home">
          <div className="logo" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 2v1.5M9 14.5V16M4.5 9H3M15 9h-1.5M6.5 6.5L5.5 5.5M12.5 12.5l-1-1M11.5 6.5l1-1M5.5 12.5l1-1" stroke="#021" strokeWidth="1.6" strokeLinecap="round"/>
              <circle cx="9" cy="9" r="3" fill="#021"/>
            </svg>
          </div>
          <span className="auth-brand-name">ClearCents</span>
        </Link>
      </header>
      <main className="auth-main">
        <div className="auth-glow" aria-hidden="true" />
        {children}
      </main>
      <footer className="auth-footer">
        <nav aria-label="Legal links">
          <a href="/privacy">Privacy Policy</a>
          <span aria-hidden="true">·</span>
          <a href="/terms">Terms of Service</a>
          <span aria-hidden="true">·</span>
          <a href="/contact">Contact</a>
        </nav>
      </footer>
    </>
  );
}
