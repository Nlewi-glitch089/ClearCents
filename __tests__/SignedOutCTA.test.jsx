import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SignedOutCTA from '../components/SignedOutCTA';

beforeEach(()=>{
  global.fetch = jest.fn();
});

afterEach(()=>{
  jest.resetAllMocks();
});

test('renders Start Tracking link to /auth when signed out', async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async ()=>({ user: null }) });
  render(<SignedOutCTA />);
  const link = await waitFor(()=>screen.getByRole('link', { name: /Start Tracking/i }));
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('href', '/auth');
});

test('renders Start Tracking link to /product when signed in', async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async ()=>({ user: { id: '1', email: 'a@b.com' } }) });
  render(<SignedOutCTA />);
  const link = await waitFor(()=>screen.getByRole('link', { name: /Start Tracking/i }));
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('href', '/product');
});
