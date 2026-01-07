"use client";
import React from 'react';

export default function SignOutButton(){
  async function handleSignOut(e){
    e.preventDefault();
    try{
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    }catch(e){ /* ignore */ }
    window.location.href = '/auth';
  }

  return (
    <button type="button" onClick={handleSignOut} className="signout-btn">
      Sign out
    </button>
  );
}
