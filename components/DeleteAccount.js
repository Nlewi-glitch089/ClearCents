"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteAccount(){
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null);
  const router = useRouter();

  async function doDelete(e){
    e.preventDefault();
    setStatus('deleting');
    try{
      const res = await fetch('/api/auth/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const d = await res.json();
      if (!res.ok) {
        setStatus(d.error || 'Failed');
        return;
      }
      // clear client-side state and redirect to home
      router.push('/');
    }catch(err){
      setStatus('error');
    }
  }

  if (!confirming) return <button className="btn ghost danger" onClick={()=>setConfirming(true)}>Delete Account</button>;

  return (
    <form onSubmit={doDelete} style={{display:'flex',gap:8,flexDirection:'column',maxWidth:360}}>
      <div style={{fontSize:13}}>Confirm by entering your password:</div>
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="form-control" placeholder="Your password" />
      <div style={{display:'flex',gap:8}}>
        <button type="submit" className="btn danger">Delete account</button>
        <button type="button" className="btn ghost" onClick={()=>{ setConfirming(false); setPassword(''); setStatus(null); }}>Cancel</button>
      </div>
      {status && status !== 'deleting' && <div style={{color:'#ff6b6b'}}>{status}</div>}
      {status === 'deleting' && <div>Deleting…</div>}
    </form>
  );
}
