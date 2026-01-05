"use client";
import { useState } from 'react';

export default function ProfileEditor({ initialUser = {}, initialOnboarding = {}, onCancel, onSave }){
  const [name, setName] = useState(initialUser.name || '');
  const [goal, setGoal] = useState(initialOnboarding.goal || '');
  const [monthly, setMonthly] = useState(initialOnboarding.monthly || '');
  const [reasonsText, setReasonsText] = useState((initialOnboarding.reasons && initialOnboarding.reasons.join('\n')) || '');
  const [status, setStatus] = useState(null);

  async function save(e){
    e.preventDefault();
    setStatus('saving');
    try{
      // update name
      const r1 = await fetch('/api/auth/update', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      if (!r1.ok) throw new Error((await r1.json()).error || 'Failed to update profile');

      // save onboarding snapshot including reasons
      const reasons = reasonsText.split('\n').map(s=>s.trim()).filter(Boolean);
      const r2 = await fetch('/api/onboarding', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal, monthly, reasons }) });
      if (!r2.ok) throw new Error((await r2.json()).error || 'Failed to save onboarding');

      const savedOnboarding = { goal, monthly, reasons };
      const savedUser = { ...initialUser, name };
      setStatus('saved');
      if (onSave) onSave({ user: savedUser, onboarding: savedOnboarding });
    }catch(err){
      setStatus(err.message || 'error');
    }
  }

  return (
    <form onSubmit={save} style={{display:'grid',gap:12}}>
      <label>
        <div className="form-label">Display name</div>
        <input className="form-control" value={name} onChange={e=>setName(e.target.value)} placeholder="Your display name" />
      </label>

      <label>
        <div className="form-label">Primary goal</div>
        <input className="form-control" value={goal} onChange={e=>setGoal(e.target.value)} placeholder="e.g. Save $500 by June" />
      </label>

      <label>
        <div className="form-label">Monthly target</div>
        <input className="form-control" value={monthly} onChange={e=>setMonthly(e.target.value)} placeholder="e.g. 200" />
      </label>

      <label>
        <div className="form-label">Why you joined (one per line)</div>
        <textarea className="form-control" value={reasonsText} onChange={e=>setReasonsText(e.target.value)} placeholder="e.g. Learn budgeting" />
      </label>

      <div style={{display:'flex',gap:8}}>
        <button type="submit" className="btn save">Save</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
        {status === 'saving' && <span style={{marginLeft:8}}>Saving…</span>}
        {status === 'saved' && <span style={{marginLeft:8,color:'#4ade80'}}>Saved</span>}
        {status && status !== 'saving' && status !== 'saved' && <div style={{color:'#ff7b7b',marginLeft:8}}>{status}</div>}
      </div>
    </form>
  );
}
