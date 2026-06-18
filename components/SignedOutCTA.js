"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SignedOutCTA({ label = 'Start Tracking' }) {
  const [href, setHref] = useState('/auth');

  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then(r => r.json())
      .then(async d => {
        if (!mounted) return;
        if (!d.user) { setHref('/auth'); return; }
        // Signed-in — check if onboarding is complete
        try {
          const ob = await fetch('/api/onboarding', { cache: 'no-store', credentials: 'same-origin' });
          const od = await ob.json();
          if (!mounted) return;
          setHref(od.onboarding ? '/product' : '/auth/onboarding');
        } catch {
          if (mounted) setHref('/product');
        }
      })
      .catch(() => { if (mounted) setHref('/auth'); });
    return () => { mounted = false; };
  }, []);

  return <Link href={href} className="btn">{label}</Link>;
}
