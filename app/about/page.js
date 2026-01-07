import Link from 'next/link';
import ReadMore from '../components/ReadMore';

export default function About() {
  return (
    <>
      <div className="page-hero card">
        <h2>About — Problem Understanding</h2>
        <p className="lead">Students often struggle to track spending, save money, and understand where their money goes. ClearCents helps by making tracking simple and providing AI-powered insights.</p>
      </div>
      <div className="split-row">
        <div className="card compact" style={{padding:16}}>
          <h3 style={{marginTop:0,marginBottom:8}}>What is the problem?</h3>
          <ReadMore
            summary={"Many students struggle to manage their money because their financial situation is unpredictable and constantly changing. Unlike full-time workers with steady paychecks, students often earn money from part-time jobs, freelance work, seasonal gigs, stipends, or family support. This means their income can change from week to week or month to month, making it hard to plan ahead."}
            collapsedLabel="Read more"
            expandedLabel="Show less"
          >
            <div>
              <p>At the same time, students usually have limited budgets. Most of their money goes toward basic needs like food, transportation, phone bills, subscriptions, and occasional school-related expenses. Because there is not much extra money to work with, even small overspending can cause stress or lead to running out of funds before the next paycheck arrives.</p>

              <p>Many students also have little experience with budgeting. Budgeting is rarely taught in school, and students are often expected to “figure it out” on their own. As a result, they may not know how to track spending, categorize expenses, or recognize habits that are draining their money.</p>

              <p>To manage their finances, students often rely on informal methods. Some use cash for daily purchases, others split money across multiple bank accounts or payment apps, and many track spending in their head, in notes apps, or not at all. These methods make it difficult to see the full picture of where money is going.</p>

              <p>Because everything is scattered, students cannot easily identify patterns. They may feel like their money disappears without understanding why. This lack of visibility makes it harder to make better decisions, set realistic limits, or feel confident about their finances.</p>
            </div>
          </ReadMore>
        </div>

        <div>
          <div className="card callout">
            <h4>Key constraints</h4>
            <ul>
              <li>Limited time to enter transactions</li>
              <li>Low technical skills for complex finance tools</li>
              <li>Privacy and security concerns</li>
            </ul>
          </div>

          <div className="card" style={{marginTop:14}}>
            <h4>Goals for ClearCents</h4>
            <ul>
              <li>Make entry fast and low-friction</li>
              <li>Provide clear, actionable feedback</li>
              <li>Prioritize student privacy and ease-of-use</li>
            </ul>
          </div>

          <div className="card compact" style={{marginTop:14}}>
            <h4 style={{marginBottom:8}}>Designed for Students</h4>
            <p className="muted-note" style={{marginBottom:10}}>ClearCents was built from the ground up with students in mind. Key product principles:</p>
            <div className="mini-grid">
              <div className="mini-card">
                <h4>Simple</h4>
                <div className="muted-note">No financial jargon or complicated features</div>
              </div>
              <div className="mini-card">
                <h4>Visual</h4>
                <div className="muted-note">Clear charts and progress indicators</div>
              </div>
              <div className="mini-card">
                <h4>Flexible</h4>
                <div className="muted-note">Works with irregular income and expenses</div>
              </div>
              <div className="mini-card">
                <h4>Supportive</h4>
                <div className="muted-note">AI insights that educate, not judge</div>
              </div>
              <div className="mini-card">
                <h4>Accessible</h4>
                <div className="muted-note">Free to use, easy to understand</div>
              </div>
              <div className="mini-card">
                <h4>Secure</h4>
                <div className="muted-note">Your financial data is protected</div>
              </div>
            </div>
          </div>

          <div style={{marginTop:14}} className="card">
          </div>
        </div>
      </div>
    </>
  );
}
