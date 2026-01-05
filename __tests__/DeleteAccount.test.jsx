import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeleteAccount from '../components/DeleteAccount';

beforeEach(()=>{
  global.fetch = jest.fn();
});

afterEach(()=>{
  jest.resetAllMocks();
});

test('shows confirmation form and submits delete', async () => {
  render(<DeleteAccount />);

  // initial button
  const btn = screen.getByRole('button', { name: /Delete Account/i });
  expect(btn).toBeInTheDocument();

  // click to show form
  fireEvent.click(btn);

  const pwd = screen.getByPlaceholderText(/Your password/i);
  fireEvent.change(pwd, { target: { value: 'secret' } });

  // mock fetch to return ok
  global.fetch.mockResolvedValueOnce({ ok: true, json: async ()=>({}) });

  const submit = screen.getByRole('button', { name: /Delete account/i });
  fireEvent.click(submit);

  await waitFor(()=>{
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/delete', expect.objectContaining({ method: 'POST' }));
  });
});
