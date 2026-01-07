"use client";
import { useState } from 'react';

export default function ReadMore({ summary, children }){
  return (
    <div>
      <div className="muted-note">{summary}</div>
      <div style={{marginTop:10}} className="muted-note">{children}</div>
    </div>
  );
}
