import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

import OnboardingPage from '../app/auth/onboarding/page';

beforeEach(()=>{
  jest.useFakeTimers();
  global.fetch = jest.fn();
});

afterEach(()=>{
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.resetAllMocks();
});

test('prefills when onboarding exists and submits then navigates to profile', async () => {
  // mock GET onboarding (first fetch)
  global.fetch.mockResolvedValueOnce({ ok: true, json: async ()=>({ onboarding: { goal: 'Save $200', monthly: '50', why: 'I want to save', reasons: ['Learn budgeting'] } }) });
  // mock POST onboarding (second fetch)
  global.fetch.mockResolvedValueOnce({ ok: true, json: async ()=>({}) });

  render(<OnboardingPage />);

  // Wait for prefill to apply
  await waitFor(()=> expect(screen.getByPlaceholderText(/E.g., Save/)).toHaveValue('Save $200'));

  // select another option (toggle)
  fireEvent.click(screen.getByText('Save for a goal'));

  // submit form
  const saveBtn = screen.getByRole('button', { name: /Save changes/i });
  fireEvent.click(saveBtn);

  await waitFor(()=>{
    expect(global.fetch).toHaveBeenCalledWith('/api/onboarding', expect.objectContaining({ method: 'POST' }));
  });

  // advance timers to allow setTimeout navigation
  jest.advanceTimersByTime(1000);

  expect(mockPush).toHaveBeenCalledWith('/profile');
});
