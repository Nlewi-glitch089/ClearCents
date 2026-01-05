"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage(){
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e){
    e.preventDefault();
    setError(''); setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || 'Registration failed');
    // After registering, route to onboarding so new users can set goals
    router.push('/auth/onboarding');
  }

  return (
    <div className="container app-main">
      <div style={{maxWidth:980,margin:'28px auto'}}>
        <div className="page-hero card">
          <h2>Create Account</h2>
          <p className="lead">Create an account to save your progress, set goals, and receive tailored insights.</p>
        </div>

        <div className="card" style={{marginTop:16}}>
          <div className="auth-grid">
            <div>
              <div className="auth-illustration">Join ClearCents — track, learn, and grow your financial skills.</div>
              <div style={{marginTop:14}}>
                <h4>Getting started</h4>
                <ul style={{color:'var(--muted)',marginTop:8}}>
                  <li>Quick onboarding to personalize your experience</li>
                  <li>Save transactions and view AI insights</li>
                  <li>Privacy-first — your data stays with you</li>
                </ul>
              </div>
            </div>

            <div>
              <form onSubmit={handleSubmit} style={{display:'grid',gap:12}}>
                <label>Email</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@school.edu" />

                <label>Password</label>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Choose a strong password" />

                <div className="auth-note">Password should be at least 8 characters.</div>

                {error && <div style={{color:'#ffb4b4'}}>{error}</div>}

                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <button className="btn" disabled={loading} type="submit">{loading ? 'Creating...' : 'Create account'}</button>
                  <Link href="/auth/login" className="btn secondary">Sign in</Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
