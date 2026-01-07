import { NextResponse } from 'next/server';

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
  <rect width='100' height='100' rx='18' fill='#3f1f3f' />
  <text x='50' y='56' font-size='48' text-anchor='middle' fill='#fff' font-family='Arial, Helvetica, sans-serif'>C</text>
</svg>`;

export async function GET() {
  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
