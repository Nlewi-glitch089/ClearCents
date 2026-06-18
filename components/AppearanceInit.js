"use client";
import { useEffect } from 'react';

const LEGACY_THEMES = new Set(['dark', 'dim', 'light']);

export default function AppearanceInit() {
  useEffect(() => {
    try {
      let theme = localStorage.getItem('cc:theme') || 'midnight';
      if (LEGACY_THEMES.has(theme)) theme = 'midnight';
      document.documentElement.setAttribute('data-theme', theme);

      if (localStorage.getItem('cc:reducedMotion') === '1') {
        document.documentElement.setAttribute('data-reduced-motion', '1');
      }
      if (localStorage.getItem('cc:largerText') === '1') {
        document.documentElement.setAttribute('data-larger-text', '1');
        document.documentElement.style.fontSize = '18px';
      }
    } catch {}
  }, []);

  return null;
}
