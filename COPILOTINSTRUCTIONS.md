## Project Name

ClearCents

Tagline

Track smarter. Build better habits.

## Project Overview

ClearCents is a student-focused budgeting and money tracking web app that helps users understand their spending, build better financial habits, and receive AI-powered insights. The app is designed for students who struggle with budgeting, saving, and understanding where their money goes.

## Tech Stack Requirements

Framework: Next.js (App Router)

Language: JavaScript only

❌ No TypeScript

❌ No TSX

Styling: CSS Modules

No Tailwind

No styled-components

Authentication: Email + Password

Role-Based Authentication (RBA):

student

coach

instructor

## Database: Neon (Auth)

AI Integration: OpenAI API (text-based responses only)

Roles & Access Rules

Students

Can access Pages 1–5

Coaches & Instructors

Can access Pages 1–7

Pages 6 (Rubric Evidence) and 7 (Reflection) must be protected and only render if role is coach or instructor.

Staff Accounts (Hardcoded for now)

rob@launchpadphilly.org
 → lpuser1

sanaa@launchpadphilly.org
 → lpuser2

taheera@launchpadphilly.org
 → lpuser3

Pages to Build
Page 1 – Home

## App name: ClearCents

Tagline displayed under logo

Short description of what the app does

CTA button: “Start Tracking”

Navigation to all pages (conditional rendering based on role)

Page 2 – About (Problem Understanding)

Explain the student money problem

Real-life examples

Constraints and why it’s difficult

What happens if not solved

One existing solution comparison

Page 3 – Why ClearCents? (Solution Planning)

Explain why this solution exists

Feature list

Expected challenges

Project plan summary

Page 4 – Features

Expense tracking

Savings goals

AI-powered insights

Explain why this app is different

Page 5 – Product (Core Tool)

User can:

Add income

Add expenses

Choose category

View totals

Generate AI feedback

Data must save per user

Page 6 – Rubric Evidence (Staff Only)

## Clearly list:

CCC.1.1

CCC.1.2

CCC.1.3

For each:

Where it appears in the app

Buttons/links to the exact page or section

Page 7 – Reflection (Staff Only)

What went well

What didn’t

What changed during development

What would be built next

AI Feature Requirements

Generate spending insights based on user input

Provide habit-building suggestions

Text-only output

No financial advice disclaimers required

Development Notes

Keep components simple and readable

Protect staff-only routes using role checks

Use conditional rendering for navigation

Prioritize clarity over complexity