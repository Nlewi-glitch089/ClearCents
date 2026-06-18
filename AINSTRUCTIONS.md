# ClearCents AI Instructions

## Product Vision

ClearCents is a modern financial wellness platform designed for teens and young adults.

The goal is not simply to track money.

The goal is to help users:

* Build healthy money habits
* Understand spending patterns
* Reach savings goals
* Improve financial confidence
* Learn financial literacy through action

Every feature should contribute to one or more of these outcomes.

---

## Target Audience

Primary Users:

* High school students
* College students
* Young adults (16-25)

User Traits:

* New to budgeting
* Easily overwhelmed by finance tools
* Mobile-first
* Short attention spans
* Prefer visual feedback over spreadsheets

---

## Product Personality

ClearCents should feel:

* Friendly
* Encouraging
* Modern
* Motivating
* Easy to understand

Avoid:

* Corporate banking aesthetics
* Financial jargon
* Enterprise dashboards
* Dense educational content

---

## Design Principles

Every screen should prioritize:

1. Clarity
2. Simplicity
3. Visual engagement
4. Actionability

Users should understand what to do within 5 seconds of arriving on a page.

---

## AI Coach Behavior

The AI should behave like a financial coach.

The AI should:

* Explain spending patterns
* Highlight positive habits
* Identify risks
* Suggest improvements
* Encourage consistency
* Celebrate progress

The AI should not:

* Give investment advice
* Recommend stocks
* Recommend loans
* Recommend financial products

---

## Dashboard Philosophy

The dashboard is the heart of the application.

It should immediately show:

* Current balance
* Monthly spending
* Monthly income
* Savings progress
* Recent activity
* AI insights
* Goal progress

The dashboard should feel alive and personalized.

---

## Feature Priorities

Highest Priority:

* Budget tracking
* Savings goals
* Spending analytics
* AI coaching
* Monthly summaries
* Goal tracking

Medium Priority:

* Streaks
* Achievements
* Spending challenges
* Progress badges

Lower Priority:

* Social features
* Investments
* Credit monitoring

---

## UX Rules

Avoid pages that only display information.

Favor:

* Dashboards
* Interactive cards
* Charts
* Progress indicators
* Guided actions

Every page should provide immediate value.

---

## Development Rules

Before major implementation:

1. Audit current functionality.
2. Identify affected files.
3. Explain implementation plan.
4. Preserve existing functionality.

When redesigning:

* Improve visual hierarchy.
* Improve accessibility.
* Improve responsiveness.
* Reduce unnecessary text.
* Replace explanation-heavy sections with visual experiences.

---

## Product Goal

Treat ClearCents as a production-ready portfolio project.

Optimize for:

1. User experience
2. User value
3. Feature completeness
4. Visual polish
5. Demo readiness

Do not preserve legacy school-project structures unless they directly improve the product.

---

## Future Work: Accounts & Transfers

The following features have been scoped but not yet implemented. This section documents the decisions made so far and what needs to happen next.

### Transfer Transaction UI

`TransactionType` now includes `'transfer'` but there is no UI surface to create one. When added:

- The Add Transaction form needs source and destination account selectors (both from the user's Account list).
- A transfer should create **two linked transactions**: a debit from the source account and a credit to the destination account, both with `type: 'transfer'`.
- Transfers must **never** appear in income totals, expense totals, savings pace, AI spending analysis, or dashboard charts. All aggregation already guards against this with explicit `else if (t.type === 'income')` / `else if (t.type === 'expense')` patterns.

### Account-to-Account Movement

Currently `Account.balance` stores an **opening balance only** — it is set once at account creation and never recalculated. True current balance requires summing all transactions linked to that account.

Future work:
- Add a `GET /api/accounts/[id]/transactions` endpoint (or include transactions in the Account GET).
- Compute current balance as `openingBalance + income transactions - expense transactions` (transfers cancel out if both legs are linked to the account).
- Display "current balance" vs "opening balance" in the settings accounts UI.

### Opening Balances vs Calculated Balances

The dashboard `netExistingAssets` currently uses opening balances from the Account model. Once calculated balances are available, the dashboard should prefer calculated values so the goal ring reflects real-time account state rather than a snapshot from account creation.

### Credit Card Balance Tracking

`credit_card` accounts are treated as liabilities — their balance is subtracted from net assets. However, there is no UI feedback that distinguishes credit card debt from positive balances. Future work:
- Show credit card accounts with a red/negative indicator in the dashboard and settings list.
- Optionally warn users when their credit card balance exceeds a threshold relative to their income.
