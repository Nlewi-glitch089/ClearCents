"use client";
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const MARKETING_PATHS = ['/', '/features', '/why', '/about'];

export default function SiteNav() {
  const pathname = usePathname();
  const [user, setUser] = useState(undefined);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const r = await fetch('/api/auth/me', { cache: 'no-store', credentials: 'include' });
        const data = await r.json();
        if (!mounted) return;
        setUser(data.user || null);
      } catch (e) {
        console.error('[site-nav:fetch-me]', e);
        if (!mounted) return;
        setUser(null);
      }
    }
    load();
    function onAuthChanged() { load(); }
    window.addEventListener('auth:changed', onAuthChanged);
    return () => { mounted = false; window.removeEventListener('auth:changed', onAuthChanged); };
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(e) { if (e.key === 'Escape') setMenuOpen(false); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const isMarketing = MARKETING_PATHS.includes(pathname);
  const isStaff = user && (user.role === 'coach' || user.role === 'instructor');

  function linkClass(href) {
    return pathname === href ? 'active' : undefined;
  }

  async function handleSignOut(e) {
    e.preventDefault();
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('[site-nav:logout]', err);
    }
    try {
      window.dispatchEvent(new CustomEvent('auth:changed'));
      localStorage.setItem('clearcents:auth', String(Date.now()));
    } catch (e) { /* ignore */ }
    window.location = '/auth';
  }

  function renderNavLinks() {
    if (isMarketing) {
      // Guest marketing navigation: product discovery only.
      // Auth flows through page-level CTAs ("Get Started", Why page CTA) — no sign-in link here.
      // Authenticated users get a shortcut back to the app.
      return (
        <>
          <Link href="/" className={linkClass('/')}>Home</Link>
          <Link href="/features" className={linkClass('/features')}>Features</Link>
          <Link href="/why" className={linkClass('/why')}>Why</Link>
          <Link href="/about" className={linkClass('/about')}>About</Link>
        </>
      );
    }

    if (user) {
      return (
        <>
          <Link href="/product" className={linkClass('/product')}>Dashboard</Link>
          <Link href="/profile" className={linkClass('/profile')}>Profile</Link>
          <Link href="/settings" className={linkClass('/settings')}>Settings</Link>
          {isStaff && (
            <>
              <Link href="/rubric" className={linkClass('/rubric')}>Rubric</Link>
              <Link href="/reflection" className={linkClass('/reflection')}>Reflection</Link>
            </>
          )}
          <button type="button" onClick={handleSignOut} className="signout-btn">
            Sign out
          </button>
        </>
      );
    }

    return null;
  }

  return (
    <>
      <button
        className="burger-btn"
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuOpen}
        aria-controls="site-nav-menu"
        onClick={() => setMenuOpen(o => !o)}
      >
        {menuOpen ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
      </button>

      <nav
        id="site-nav-menu"
        className={`site-nav${menuOpen ? ' mobile-open' : ''}`}
        aria-label="Site navigation"
      >
        {renderNavLinks()}
      </nav>
    </>
  );
}
