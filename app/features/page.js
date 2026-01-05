import Icon from '../components/Icon';

export default function Features() {
  const items = [
    { title: 'Overspending Without Realizing', desc: 'Students often miss recurring small charges and subscriptions that add up.' },
    { title: 'No Clear Savings Plan', desc: 'Goals are vague; ClearCents helps make them concrete and trackable.' },
    { title: 'Confusing Income Streams', desc: 'Multiple part-time jobs and irregular income make budgeting hard.' },
    { title: 'Generic Budgeting Tools', desc: 'Many tools are too complex or too rigid for student needs.' },
    { title: 'Lack of Financial Guidance', desc: 'Students need simple, actionable suggestions to improve habits.' },
    { title: 'Limited Teacher Visibility', desc: 'Coaches need focused summaries to support students efficiently.' }
  ];

  return (
    <>
      <div className="page-hero card why-hero">
        <h2>Why Choose ClearCents?</h2>
        <p className="lead">Built for students — simple tracking, clear goals, and bite-sized habit suggestions that fit a busy life.</p>
      </div>

      <div className="card why-card-grid">
        <div className="why-grid">
          {items.map((it) => (
            <div key={it.title} className="why-card">
              <div className="why-left">
                <h4 className="why-title">{it.title}</h4>
                <p className="why-desc">{it.desc}</p>
              </div>
              <div className="why-right">
                <div className="why-badge"><span className="check">✓</span> ClearCents Solution</div>
              </div>
            </div>
          ))}
        </div>

        <div className="why-footer">
          <h3>Focus on habits, not restrictions</h3>
          <p className="lead">ClearCents helps students build small, repeatable habits — saving more, tracking spending, and understanding progress without judgment.</p>
        </div>
      </div>
    </>
  );
}
