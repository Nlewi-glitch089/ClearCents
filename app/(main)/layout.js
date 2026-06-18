import SiteNav from '../../components/SiteNav';

export default function MainLayout({ children }) {
  return (
    <>
      <header className="site-header">
        <div className="brand">
          <div className="logo" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 2v1.5M9 14.5V16M4.5 9H3M15 9h-1.5M6.5 6.5L5.5 5.5M12.5 12.5l-1-1M11.5 6.5l1-1M5.5 12.5l1-1" stroke="#021" strokeWidth="1.6" strokeLinecap="round"/>
              <circle cx="9" cy="9" r="3" fill="#021"/>
            </svg>
          </div>
          <h1>ClearCents</h1>
        </div>
        <SiteNav />
      </header>
      <main>
        <div className="container">{children}</div>
      </main>
      <footer className="site-footer">
        <nav className="site-footer-legal" aria-label="Legal links">
          <a href="/privacy">Privacy Policy</a>
          <span aria-hidden="true">·</span>
          <a href="/terms">Terms of Service</a>
          <span aria-hidden="true">·</span>
          <a href="/contact">Contact</a>
        </nav>
        <div className="site-footer-copy">© 2026 ClearCents — Build better money habits.</div>
      </footer>
    </>
  );
}
