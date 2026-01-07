"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StaffLinks() {
  const [role, setRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        setRole(data?.user?.role || null);
      })
      .catch(() => {
        if (!mounted) return;
        setRole(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!role) return null;
  if (role !== 'coach' && role !== 'instructor') return null;

  return (
    <>
      <Link href="/rubric" className="nav-link">Rubric</Link>
      <Link href="/reflection" className="nav-link">Reflection</Link>
    </>
  );
}
