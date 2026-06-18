import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

import OnboardingPage from '../app/(auth)/auth/onboarding/page';

beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Fresh user: navigate all 4 steps and submit → /product
// ---------------------------------------------------------------------------
test('fresh user: navigates all steps and submits, routes to /product', async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ onboarding: null }) }); // GET
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });   // POST

  render(<OnboardingPage />);

  // Step 1 — income type
  await waitFor(() => expect(screen.getByText('How do you earn money?')).toBeInTheDocument());
  fireEvent.click(screen.getByText('Gig Work'));
  fireEvent.click(screen.getByRole('button', { name: /Next/i }));

  // Step 2 — goal type
  await waitFor(() => expect(screen.getByText('What are you saving for?')).toBeInTheDocument());
  fireEvent.click(screen.getByText('Laptop'));
  // targetAmount input appears after goal tile selection
  await waitFor(() => expect(screen.getByPlaceholderText(/e\.g\. 1200/i)).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /Next/i }));

  // Step 3 — coaching focus
  await waitFor(() => expect(screen.getByText('What should your coach focus on?')).toBeInTheDocument());
  fireEvent.click(screen.getByText('Save More'));
  fireEvent.click(screen.getByRole('button', { name: /Next/i }));

  // Step 4 — confirmation
  await waitFor(() => expect(screen.getByText('Your coach is ready.')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /Start coaching/i }));

  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith('/api/onboarding', expect.objectContaining({ method: 'POST' }))
  );
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/product'));
});

// ---------------------------------------------------------------------------
// Existing user: prefills from onboarding data, submits → /settings
// ---------------------------------------------------------------------------
test('existing user: shows Update heading, submits and routes to /settings', async () => {
  const existingData = {
    goalType: 'Laptop', incomeType: 'Gig Work', coachingFocus: 'Save More',
    goal: 'Laptop', reasons: ['Save More'], why: 'Income type: Gig Work',
  };
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ onboarding: existingData }) }); // GET
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });             // POST

  render(<OnboardingPage />);

  // Heading confirms existing-user mode
  await waitFor(() => expect(screen.getByText('Update Your Setup')).toBeInTheDocument());

  // Step 1 — incomeType prefilled when 'Update Your Setup' heading appears; Next enabled
  fireEvent.click(screen.getByRole('button', { name: /Next/i }));

  // Step 2 — goalType prefilled, targetAmount input visible
  await waitFor(() => expect(screen.getByText('What are you saving for?')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /Next/i }));

  // Step 3 — coachingFocus prefilled, Next enabled
  await waitFor(() => expect(screen.getByText('What should your coach focus on?')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /Next/i }));

  // Step 4 — save button
  await waitFor(() => expect(screen.getByRole('button', { name: /Save changes/i })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith('/api/onboarding', expect.objectContaining({ method: 'POST' }))
  );
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/settings'));
});
