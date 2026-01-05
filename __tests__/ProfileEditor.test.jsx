import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfileEditor from '../components/ProfileEditor';

beforeEach(()=>{
  global.fetch = jest.fn();
});

afterEach(()=>{
  jest.resetAllMocks();
});

test('renders initial values and saves', async () => {
  const initialUser = { name: 'Alex' };
  const initialOnboarding = { goal: 'Save', monthly: '200', reasons: ['Learn'] };
  const onSave = jest.fn();

  render(<ProfileEditor initialUser={initialUser} initialOnboarding={initialOnboarding} onSave={onSave} onCancel={()=>{}} />);

  // inputs prefilled
  expect(screen.getByPlaceholderText(/Your display name/i)).toHaveValue('Alex');
  expect(screen.getByPlaceholderText(/e.g. Save \$500 by June/i)).toHaveValue('Save');

  // mock both fetch calls
  global.fetch.mockResolvedValueOnce({ ok: true, json: async ()=>({}) });
  global.fetch.mockResolvedValueOnce({ ok: true, json: async ()=>({}) });

  fireEvent.change(screen.getByPlaceholderText(/Your display name/i), { target: { value: 'Sam' } });
  fireEvent.click(screen.getByRole('button', { name: /Save/i }));

  await waitFor(()=>{
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenCalled();
  });
});
