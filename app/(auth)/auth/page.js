"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Bot, Target, Check, Eye, EyeOff } from 'lucide-react';

const benefits = [
  { icon: <Bot size={18} strokeWidth={1.75} />, text: 'AI coach that knows your actual spending' },
  { icon: <Target size={18} strokeWidth={1.75} />, text: 'Track goals and watch real progress' },
  { icon: <Shield size={18} strokeWidth={1.75} />, text: 'Private by design — no data selling, ever' },
  { icon: <Check size={18} strokeWidth={1.75} />, text: 'Free to use — just your email to get started' },
];

export default function AuthPage() {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || (res.status === 401 ? 'Invalid email or password' : 'Login failed'));
    try {
      window.dispatchEvent(new CustomEvent('auth:changed'));
      localStorage.setItem('clearcents:auth', String(Date.now()));
    } catch (_) {}
    router.push('/product');
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!consent) { setError('Please agree to the Terms of Service and Privacy Policy to continue.'); return; }
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || (res.status === 409 ? 'An account with that email already exists.' : 'Registration failed'));
    router.push('/auth/onboarding');
  }

  function switchTab(next) {
    setTab(next);
    setError('');
    setEmail('');
    setPassword('');
    setConsent(false);
    setShowLoginPwd(false);
    setShowRegPwd(false);
  }

  return (
    <div className="auth-split">
      {/* Left panel — value props */}
      <motion.div
        className="auth-split-left"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0.9, 0.3, 1] }}
      >
        <div className="auth-left-content">
          <h2 className="auth-left-headline">
            Know where your<br />money goes.
          </h2>
          <p className="auth-left-subhead">
            Track spending, set real goals, and get AI coaching built around your actual habits.
          </p>
          <ul className="auth-benefits">
            {benefits.map((b, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.07, duration: 0.38 }}
              >
                <span className="auth-benefit-icon">{b.icon}</span>
                <span>{b.text}</span>
              </motion.li>
            ))}
          </ul>
          <div className="auth-privacy-note">
            <Shield size={13} strokeWidth={2} />
            <span>Your data is never sold or shared. Ever.</span>
          </div>
        </div>
      </motion.div>

      {/* Right panel — form */}
      <motion.div
        className="auth-split-right"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1, ease: [0.2, 0.9, 0.3, 1] }}
      >
        <div className="auth-form-card">
          {/* Tab switcher */}
          <div className="auth-tab-row" style={{ marginBottom: 28 }}>
            <button
              type="button"
              className={`auth-tab-btn${tab === 'login' ? ' active' : ''}`}
              onClick={() => switchTab('login')}
              aria-pressed={tab === 'login'}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab-btn${tab === 'register' ? ' active' : ''}`}
              onClick={() => switchTab('register')}
              aria-pressed={tab === 'register'}
            >
              Create Account
            </button>
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'grid', gap: 20 }} noValidate>
              <div className="auth-field">
                <label htmlFor="login-email">Email address</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                  aria-required="true"
                />
              </div>

              <div className="auth-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <label htmlFor="login-password" style={{ marginBottom: 0 }}>Password</label>
                  <Link href="/auth/forgot" className="auth-forgot-link">Forgot password?</Link>
                </div>
                <div className="auth-field-pw-wrap">
                  <input
                    id="login-password"
                    type={showLoginPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    required
                    aria-required="true"
                  />
                  <button
                    type="button"
                    className="auth-pw-toggle"
                    onClick={() => setShowLoginPwd(v => !v)}
                    aria-label={showLoginPwd ? 'Hide password' : 'Show password'}
                    aria-pressed={showLoginPwd}
                  >
                    {showLoginPwd ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="auth-error">
                  {error}
                </div>
              )}

              <button className="btn btn--auth" disabled={loading} type="submit">
                {loading ? (
                  <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, margin: 0, marginRight: 8 }} />Signing in…</>
                ) : 'Sign in'}
              </button>

              <p className="auth-switch-hint">
                Don't have an account?{' '}
                <button type="button" className="auth-switch-btn" onClick={() => switchTab('register')}>
                  Create one free
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'grid', gap: 20 }} noValidate>
              <div className="auth-field">
                <label htmlFor="reg-email">Email address</label>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                  aria-required="true"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="reg-password">
                  Password
                  <span className="auth-field-hint">at least 8 characters</span>
                </label>
                <div className="auth-field-pw-wrap">
                  <input
                    id="reg-password"
                    type={showRegPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Choose a strong password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    aria-required="true"
                  />
                  <button
                    type="button"
                    className="auth-pw-toggle"
                    onClick={() => setShowRegPwd(v => !v)}
                    aria-label={showRegPwd ? 'Hide password' : 'Show password'}
                    aria-pressed={showRegPwd}
                  >
                    {showRegPwd ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                  </button>
                </div>
              </div>

              <label className="auth-consent-label">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  aria-required="true"
                />
                <span>
                  I'm at least 13 and agree to the{' '}
                  <Link href="/terms" target="_blank" style={{ color: 'var(--accent)' }}>Terms</Link>
                  {' '}and{' '}
                  <Link href="/privacy" target="_blank" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>.
                </span>
              </label>

              {error && (
                <div role="alert" className="auth-error">
                  {error}
                </div>
              )}

              <button className="btn btn--auth" disabled={loading || !consent} type="submit">
                {loading ? (
                  <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, margin: 0, marginRight: 8 }} />Creating account…</>
                ) : 'Create free account'}
              </button>

              <p className="auth-switch-hint">
                Already have an account?{' '}
                <button type="button" className="auth-switch-btn" onClick={() => switchTab('login')}>
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
