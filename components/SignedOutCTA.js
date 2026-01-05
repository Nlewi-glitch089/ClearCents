"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SignedOutCTA(){
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    let mounted = true;
    fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then(r => r.json())
      .then(d => { if (!mounted) return; setUser(d.user || null); setLoading(false); })
      .catch(()=>{ if (!mounted) return; setUser(null); setLoading(false); });
    return ()=> mounted = false;
  },[]);

  const href = user ? '/product' : '/auth';
  return <Link href={href} className="btn">Start Tracking</Link>;
}
