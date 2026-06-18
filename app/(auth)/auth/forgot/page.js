"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setError(''); setLoading(true);
    try {
      await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch (_) {}
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div style={{ maxWidth: 480, margin: '48px auto', padding: '0 20px' }}>

      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h2 style={{ margin: '0 0 8px' }}>Reset your password</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', margin: 0 }}>
          Enter the email address on your account and we&rsquo;ll send reset instructions.
        </p>
      </div>

      {submitted ? (
        <div
          style={{
            background: 'rgba(16,192,138,0.07)',
            border: '1px solid rgba(16,192,138,0.25)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }} aria-hidden="true">✉️</div>
          <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text-primary)', marginBottom: 8 }}>
            Check your inbox
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.65, margin: '0 0 20px' }}>
            If an account exists for <strong>{email}</strong>, you&rsquo;ll receive a reset link
            within a few minutes. Check your spam folder if it doesn&rsquo;t arrive.
          </p>
          <Link href="/auth" style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>
            ← Back to sign in
          </Link>
        </div>
      ) : (
        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }} noValidate>
            <div>
              <label
                htmlFor="forgot-email"
                style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}
              >
                Email address
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            {error && (
              <div role="alert" style={{ color: '#ffb4b4', fontSize: 13, padding: '8px 12px', background: 'rgba(248,113,113,0.08)', borderRadius: 6, border: '1px solid rgba(248,113,113,0.2)' }}>
                {error}
              </div>
            )}

            <button className="btn" disabled={loading} type="submit">
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--muted)' }}>
              <Link href="/auth" style={{ color: 'var(--accent)' }}>← Back to sign in</Link>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
