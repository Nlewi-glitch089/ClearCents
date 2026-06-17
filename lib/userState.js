/**
 * ClearCents User Journey State Model
 *
 * Single source of truth for detecting where a user is in their journey.
 *
 * Consumers (current):
 *   - AI Coach chat:    app/api/ai/query/route.js
 *   - Insight panel:    app/api/ai/insight/route.js
 *
 * Consumers (future):
 *   - Dashboard empty states
 *   - Onboarding tour / guided setup
 *   - Profile completion nudges
 *
 * Architecture notes for guided setup:
 *   - Onboarding answers are stored as aiInsight rows with input.type === 'onboarding'
 *   - Read back via: lib/ai.js → getOnboardingData(userId)
 *   - Goal enrichment: lib/goals.js → computeGoalProgress(goals, transactions)
 *   - Coach receives all context via buildCoachPrompt() in lib/ai.js
 *   - Future onboarding tour: call getUserJourneyState() to know which step to show next
 *   - New states can be inserted between existing ones without breaking existing consumers
 */

export const JOURNEY_STATES = {
  GUEST: 'guest',
  NEEDS_ONBOARDING: 'needs_onboarding',
  NEEDS_FIRST_TRANSACTION: 'needs_first_transaction',
  NEEDS_GOAL: 'needs_goal',
  ACTIVE_USER: 'active_user',
};

/**
 * Detect where a user is in their ClearCents journey.
 *
 * States advance in order:
 *   guest → needs_onboarding → needs_first_transaction → needs_goal → active_user
 *
 * A user occupies exactly one state at a time. Detection is intentionally
 * cheap — pass whatever data you already have; missing fields default safely.
 *
 * @param {object}       params
 * @param {object|null}  params.user          Authenticated user record, or null for guests
 * @param {Array}        params.transactions   Full transaction history (may be empty array)
 * @param {Array}        params.goals          Active Goal table records (may be empty array)
 * @param {object|null}  params.onboarding    Onboarding data from getOnboardingData(), or null
 * @returns {string} A value from JOURNEY_STATES
 */
export function getUserJourneyState({ user, transactions = [], goals = [], onboarding = null }) {
  if (!user) return JOURNEY_STATES.GUEST;
  if (!onboarding) return JOURNEY_STATES.NEEDS_ONBOARDING;
  if (transactions.length === 0) return JOURNEY_STATES.NEEDS_FIRST_TRANSACTION;

  // A user satisfies the "has a goal" requirement if they have either:
  //   (a) an active Goal record in the database, OR
  //   (b) a goalType/goal field in their onboarding (set by the wizard or old free-text flow)
  // Requiring a database Goal record causes wizard users (who pick "Laptop", "Car", etc.)
  // to be permanently misclassified as needs_goal because parseTargetAmount("Laptop") = 0
  // and no Goal record is created for non-numeric goal labels.
  const hasGoalContext = (goals && goals.length > 0) || !!(onboarding?.goalType || onboarding?.goal);
  if (!hasGoalContext) return JOURNEY_STATES.NEEDS_GOAL;

  return JOURNEY_STATES.ACTIVE_USER;
}
