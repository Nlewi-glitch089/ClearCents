"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AuthPage(){
  const [tab, setTab] = useState('login');
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

  async function handleLogin(e){
    e.preventDefault(); setError(''); setLoading(true);
    const res = await fetch('/api/auth/login',{ method:'POST', credentials: 'same-origin', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
    const data = await res.json(); setLoading(false);
    if (!res.ok) return setError(data.error || (res.status === 401 ? 'Invalid email or password' : 'Login failed'));
    router.push('/product');
  }

  async function handleRegister(e){
    e.preventDefault(); setError(''); setLoading(true);
    const res = await fetch('/api/auth/register',{ method:'POST', credentials: 'same-origin', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
    const data = await res.json(); setLoading(false);
    if (!res.ok) return setError(data.error || (res.status === 409 ? 'User already exists' : 'Registration failed'));
    router.push('/auth/onboarding');
  }

  return (
    <div className="container app-main">
      <div style={{maxWidth:980,margin:'28px auto'}}>
        <div className="page-hero card">
          <h2>{tab==='login' ? 'Sign In' : 'Create Account'}</h2>
          <p className="lead">Sign in or create an account to save transactions and receive personalized insights.</p>
        </div>

        <div style={{marginTop:16}} className="card">
          <div style={{display:'flex',gap:12,marginBottom:12}}>
            <button className={`toggle-btn ${tab==='login'?'active':''}`} onClick={()=>setTab('login')}>Sign In</button>
            <button className={`toggle-btn ${tab==='register'?'active':''}`} onClick={()=>setTab('register')}>Create Account</button>
          </div>

          <div className="auth-grid">
            <div>
              <div className="auth-illustration">{tab==='login' ? 'Welcome back — sign in to continue.' : 'Join ClearCents — set up an account and personalize your experience.'}</div>
              <div style={{marginTop:14}}>
                <h4>{tab==='login' ? 'Why sign in?' : 'Why create an account?'}</h4>
                <ul style={{color:'var(--muted)',marginTop:8}}>
                  <li>Save transactions across devices</li>
                  <li>Get tailored AI tips and progress tracking</li>
                  <li>Complete reflections and access instructor feedback</li>
                </ul>
              </div>
            </div>

            <div>
              {tab==='login' ? (
                <form onSubmit={handleLogin} style={{display:'grid',gap:12}}>
                  <label>Email</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@school.edu" />

                  <label>Password</label>
                  <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password" />

                  {error && <div style={{color:'#ffb4b4'}}>{error}</div>}

                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <button className="btn" disabled={loading} type="submit">{loading ? 'Signing in...' : 'Sign in'}</button>
                  </div>
                  {isLocal && (
                    <div style={{marginTop:8,display:'flex',gap:8}}>
                      <button type="button" className="btn ghost" onClick={()=>devFill('rob')}>Dev: rob</button>
                      <button type="button" className="btn ghost" onClick={()=>devFill('sanaa')}>Dev: sanaa</button>
                      <button type="button" className="btn ghost" onClick={()=>devFill('taheera')}>Dev: taheera</button>
                    </div>
                  )}
                </form>
              ) : (
                <form onSubmit={handleRegister} style={{display:'grid',gap:12}}>
                  <label>Email</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@school.edu" />

                  <label>Password</label>
                  <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Choose a strong password" />

                  {error && <div style={{color:'#ffb4b4'}}>{error}</div>}

                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <button className="btn" disabled={loading} type="submit">{loading ? 'Creating...' : 'Create account'}</button>
                    <button type="button" className="btn secondary" onClick={()=>setTab('login')}>Already have an account?</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
