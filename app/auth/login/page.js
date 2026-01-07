"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage(){
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(false);
  const router = useRouter();

  // Dev helper: quick-fill seeded accounts when on localhost
  function devFill(which){
    if (which === 'rob') { setEmail('rob@launchpadphilly.org'); setPassword('lpuser1'); }
    if (which === 'sanaa') { setEmail('sanaa@launchpadphilly.org'); setPassword('lpuser2'); }
    if (which === 'taheera') { setEmail('taheera@launchpadphilly.org'); setPassword('lpuser3'); }
  }
  const [isLocal, setIsLocal] = useState(false);
  useEffect(() => {
    try {
      setIsLocal(typeof window !== 'undefined' && window.location.hostname.includes('localhost'));
    } catch (e) {
      setIsLocal(false);
    }
  }, []);

  async function handleSubmit(e){
    e.preventDefault();
    setError(''); setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      // show friendly message
      return setError(data.error || (res.status === 401 ? 'Invalid email or password' : 'Login failed'));
    }
    // success: cookie set by server — notify other components and navigate
    try { window.dispatchEvent(new Event('auth:changed')); } catch (e) { /* ignore */ }
    router.push('/product');
  }

  return (
    <div className="container app-main">
      <div style={{maxWidth:980,margin:'28px auto'}}>
        <div className="page-hero card">
          <h2>Sign In</h2>
          <p className="lead">Sign in to save transactions, track progress, and receive personalized AI insights.</p>
        </div>

        <div className="card" style={{marginTop:16}}>
          <div className="auth-grid">
            <div>
              <div className="auth-illustration">Welcome back — enter your credentials to continue.</div>
              <div style={{marginTop:14}}>
                <h4>Why sign in?</h4>
                <ul style={{color:'var(--muted)',marginTop:8}}>
                  <li>Save transactions across devices</li>
                  <li>Get tailored AI tips and progress tracking</li>
                  <li>Access reflections and instructor feedback</li>
                </ul>
              </div>
            </div>

            <div>
              <form onSubmit={handleSubmit} style={{display:'grid',gap:12}}>
                <label>Email</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@school.edu" />

                <label>Password</label>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password" />

                {error && <div style={{color:'#ffb4b4'}}>{error}</div>}

                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <button className="btn" disabled={loading} type="submit">
                    {loading && <span className="spinner" aria-hidden="true"></span>}
                    Sign in
                  </button>
                  <Link href="/auth/register" className="btn secondary">Create account</Link>
                </div>

                {isLocal && (
                  <div style={{marginTop:8,display:'flex',gap:8}}>
                    <button type="button" className="btn ghost" onClick={()=>devFill('rob')}>Dev: Rob</button>
                    <button type="button" className="btn ghost" onClick={()=>devFill('sanaa')}>Dev: Sanaa</button>
                    <button type="button" className="btn ghost" onClick={()=>devFill('taheera')}>Dev: Taheera</button>
                  </div>
                )}

                <div style={{marginTop:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div className="auth-note">Forgot password? <Link href="/auth/forgot">Reset</Link></div>
                  <div className="auth-note">Privacy: we never share your data.</div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
