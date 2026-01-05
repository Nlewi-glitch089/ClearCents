"use client";
import React from 'react';
import Link from 'next/link';

export default function StaffLinks() {
  return (
    <>
      <Link href="/rubric">Rubric</Link>
      <Link href="/reflection">Reflection</Link>
    </>
  );
}
