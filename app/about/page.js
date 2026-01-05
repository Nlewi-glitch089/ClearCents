import Link from 'next/link';

export default function About() {
  return (
    <>
      <div className="page-hero card">
        <h2>About — Problem Understanding</h2>
        <p className="lead">Students often struggle to track spending, save money, and understand where their money goes. ClearCents helps by making tracking simple and providing AI-powered insights.</p>
      </div>
      <div className="split-row">
        <div className="card">
          <h3>What is the problem?</h3>
          <p>Many students have irregular income, limited budgets, and little experience with budgeting. They may rely on cash, multiple accounts, and informal tracking (notes or memory), which makes it hard to see patterns.</p>

          <h3>Real-life example</h3>
          <p>Alex receives an irregular part-time paycheck and spends on food, transport, and subscriptions. By month-end they don't know which categories consumed their funds.</p>

          <h3>Existing solutions</h3>
          <p>Apps like Mint or YNAB provide budgeting but are often complex or not student-focused; they may require bank linking and include features students don't need.</p>
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

          <div style={{marginTop:14}} className="card">
          </div>
        </div>
      </div>
    </>
  );
}
