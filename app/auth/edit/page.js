"use client";
import { useState, useEffect } from 'react';

export default function EditProfilePage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [monthly, setMonthly] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load(){
      try{
        const r = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
        const d = await r.json();
        if (!mounted) return;
        if (d.user) setName(d.user.name || '');

        const r2 = await fetch('/api/onboarding', { credentials: 'same-origin' });
        if (r2.ok){
          const d2 = await r2.json();
          if (!d2.error && d2.onboarding){
            setGoal(d2.onboarding.goal || '');
            setMonthly(d2.onboarding.monthly || '');
          }
        }
      }catch(e){}
      setLoading(false);
    }
    load();
    return () => (mounted = false);
  }, []);

  async function save(e) {
    e.preventDefault();
    setStatus('saving');
    try {
      // update name
      const res = await fetch('/api/auth/update', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update profile');

      // update onboarding/goal
      const res2 = await fetch('/api/onboarding', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal, monthly }) });
      if (!res2.ok) throw new Error((await res2.json()).error || 'Failed to save goals');

      setStatus('saved');
    } catch (err) {
      setStatus(err.message || 'error');
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold mb-4">Edit profile</h1>
      <form onSubmit={save} className="space-y-4">
        <label className="block">
          <div className="text-sm text-gray-600 mb-1">Display name</div>
          <input value={name} onChange={e => setName(e.target.value)} className="form-control" placeholder="Your display name" />
        </label>

        <label className="block">
          <div className="text-sm text-gray-600 mb-1">Primary goal</div>
          <input value={goal} onChange={e => setGoal(e.target.value)} className="form-control" placeholder="e.g. Save $500 by June" />
        </label>

        <label className="block">
          <div className="text-sm text-gray-600 mb-1">Monthly target</div>
          <input value={monthly} onChange={e => setMonthly(e.target.value)} className="form-control" placeholder="e.g. 200" />
        </label>

        <div className="form-actions">
          <button type="submit" className="btn save">Save</button>
          <button type="button" className="btn ghost" onClick={()=>history.back()}>Cancel</button>
          {status === 'saving' && <span>Saving…</span>}
          {status === 'saved' && <span style={{color:'#4ade80'}}>Saved</span>}
          {status && status !== 'saving' && status !== 'saved' && status !== 'error' && <div className="text-red-600">{status}</div>}
          {status === 'error' && <div className="text-red-600">An error occurred</div>}
        </div>
      </form>
    </div>
  );
}
