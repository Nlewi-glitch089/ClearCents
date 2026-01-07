import Link from 'next/link';
import Icon from '../components/Icon';

export default function Why() {
  return (
    <>
      <div className="page-hero card">
        <h2>Why ClearCents?</h2>
        <p className="lead">A focused tool that makes tracking quick, teaches habits, and gives actionable text-only AI feedback targeted at students.</p>
      </div>
      <div className="split-row">
        <div className="card">
          <h3>Solution idea</h3>
          <p>ClearCents lets students add income and expenses quickly, categorize items, set simple savings goals, and request AI-powered feedback summaries.</p>

          <div style={{marginTop:12}} className="feature-grid">
            <div className="feature-card animate-enter">
              <div className="feature-icon why-icon"><Icon name="bot" /></div>
              <div>
                <div className="feature-title">AI Insights</div>
                <div className="feature-desc">Short, actionable text suggestions based on recent activity.</div>
              </div>
            </div>

            <div className="feature-card animate-enter">
              <div className="feature-icon why-icon"><Icon name="zap" /></div>
              <div>
                <div className="feature-title">Fast Entry</div>
                <div className="feature-desc">Minimal fields so students can log on the go.</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card callout">
            <h4>Expected challenges</h4>
            <ul>
              <li>Designing a minimal UI for fast entry</li>
              <li>Handling auth and data privacy</li>
              <li>AI prompt design to produce useful text-only suggestions</li>
            </ul>
          </div>

          <div className="card" style={{marginTop:14}}>
            <h4>Project plan</h4>
            <p>See project plan artifact (add Trello or Markdown board in `assets/` when ready).</p>
          </div>

          <div style={{marginTop:14}} className="card">
          </div>
        </div>
      </div>
    </>
  );
}
