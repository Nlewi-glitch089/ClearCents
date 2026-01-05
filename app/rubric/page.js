import { cookies } from 'next/headers';
import Link from 'next/link';
import { verifyToken } from '../../lib/auth.js';
import prisma from '../../lib/prisma.js';

export default async function RubricPage() {
  const cookieJar = cookies();
  const token = cookieJar.get('session')?.value;

  let user = null;
  try {
    if (token) {
      const payload = verifyToken(token);
      user = await prisma.user.findUnique({ where: { id: payload.id } });
    }
  } catch (e) {
    user = null;
  }

  // Temporary server-side debug log
  try {
    console.log('RubricPage request — token present:', !!token, 'userEmail:', user?.email || null);
  } catch (e) {
    // ignore logging errors
  }

  const allowed = user && (user.role === 'coach' || user.role === 'instructor');

  return (
    <div>
      <div className="page-hero card rubric-hero">
        <div className="rubric-top">
          <div className="rubric-badge">LAUNCHPAD STAFF ONLY</div>
          {user ? (
            <div className="rubric-server-banner">Server: {user.email}</div>
          ) : null}
          <h1>Rubric Evidence - ClearCents</h1>
          <p className="lead">Documentation of how this project meets each curriculum competency code (CCC)</p>
        </div>
      </div>

      <div className="card">
        <div className="staff-grid">
          <div className="staff-card">
            <strong>Rob</strong>
            <div className="muted">rob@launchpadphilly.org</div>
          </div>
          <div className="staff-card">
            <strong>Sanaa</strong>
            <div className="muted">sanaa@launchpadphilly.org</div>
          </div>
          <div className="staff-card">
            <strong>Taheera</strong>
            <div className="muted">taheera@launchpadphilly.org</div>
          </div>
        </div>
      </div>

      <div className="card rubric-section">
        <div className="rubric-code">CCC.1.1</div>
        <div className="rubric-body">
          <h3>Problem Identification</h3>
          <p className="muted">Clear identification of a real-world problem that affects the target audience</p>

          <h4 className="evidence-heading">Evidence in Project:</h4>
          <div className="evidence-list">
            <div className="evidence-item">
              <div>
                <strong>Why ClearCents Page</strong>
                <div className="muted">Detailed explanation of student financial struggles and statistics</div>
              </div>
              <div className="evidence-actions">
                <Link href="/why" className="btn">View</Link>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Home Page - Problem Section</strong>
                <div className="muted">Opening section identifies the core problem: students struggling with money management</div>
              </div>
              <div className="evidence-actions">
                <Link href="/" className="btn">View</Link>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>README Documentation</strong>
                <div className="muted">Background section outlines the problem statement and target audience pain points</div>
              </div>
              <div className="evidence-actions">
                <a href="/README.md" className="btn btn-ghost">Code File</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card rubric-section">
        <div className="rubric-code">CCC.1.2</div>
        <div className="rubric-body">
          <h3>User Research &amp; Target Audience</h3>
          <p className="muted">Evidence of understanding the target audience and their needs</p>

          <h4 className="evidence-heading">Evidence in Project:</h4>
          <div className="evidence-list">
            <div className="evidence-item">
              <div>
                <strong>About Page</strong>
                <div className="muted">Defines target audience: hs and college students struggling with budgeting</div>
              </div>
              <div className="evidence-actions">
                <Link href="/about" className="btn">View</Link>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Features Page</strong>
                <div className="muted">Features specifically designed for student use cases</div>
              </div>
              <div className="evidence-actions">
                <Link href="/features" className="btn">View</Link>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Product Demo - Sample Data</strong>
                <div className="muted">Demo data reflects realistic student scenarios (allowances, part-time jobs)</div>
              </div>
              <div className="evidence-actions">
                <Link href="/product" className="btn">View</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card rubric-footer">
        <p className="muted">This page provides clear documentation for each curriculum competency code. Click "View" buttons to navigate directly to the evidence in the live application.</p>
      </div>
    </div>
  );
}
import { cookies } from 'next/headers';
import Link from 'next/link';
import { verifyToken } from '../../lib/auth.js';
import prisma from '../../lib/prisma.js';

export default async function RubricPage() {
  const cookieJar = cookies();
  const token = cookieJar.get('session')?.value;

  let user = null;
  try {
    if (token) {
      const payload = verifyToken(token);
      user = await prisma.user.findUnique({ where: { id: payload.id } });
    }
  } catch (e) {
    user = null;
  }

  // Temporary server-side debug log
  try {
    console.log('RubricPage request — token present:', !!token, 'userEmail:', user?.email || null);
  } catch (e) {
    // ignore logging errors
  }

  const allowed = user && (user.role === 'coach' || user.role === 'instructor');

  if (!allowed) {
    return (
      <div className="page-hero card">
        <h2>Access denied</h2>
        <p>This page is for staff only (coaches and instructors).</p>
        <p>
          <Link href="/">Return home</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-hero card rubric-hero">
        <div className="rubric-top">
          <div className="rubric-badge">LAUNCHPAD STAFF ONLY</div>
          {user ? (
            <div className="rubric-server-banner">Server: {user.email}</div>
          ) : null}
          <h1>Rubric Evidence - ClearCents</h1>
          <p className="lead">Documentation of how this project meets each curriculum competency code (CCC)</p>
        </div>
      </div>

      <div className="card">
        <div className="staff-grid">
          <div className="staff-card">
            <strong>Rob</strong>
            <div className="muted">rob@launchpadphilly.org</div>
          </div>
          <div className="staff-card">
            <strong>Sanaa</strong>
            <div className="muted">sanaa@launchpadphilly.org</div>
          </div>
          <div className="staff-card">
            <strong>Taheera</strong>
            <div className="muted">taheera@launchpadphilly.org</div>
          </div>
        </div>
      </div>

      <div className="card rubric-section">
        <div className="rubric-code">CCC.1.1</div>
        <div className="rubric-body">
          <h3>Problem Identification</h3>
          <p className="muted">Clear identification of a real-world problem that affects the target audience</p>

          <h4 className="evidence-heading">Evidence in Project:</h4>
          <div className="evidence-list">
            <div className="evidence-item">
              <div>
                <strong>Why ClearCents Page</strong>
                <div className="muted">Detailed explanation of student financial struggles and statistics</div>
              </div>
              <div className="evidence-actions">
                <Link href="/why" className="btn">View</Link>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Home Page - Problem Section</strong>
                <div className="muted">Opening section identifies the core problem: students struggling with money management</div>
              </div>
              <div className="evidence-actions">
                <Link href="/" className="btn">View</Link>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>README Documentation</strong>
                <div className="muted">Background section outlines the problem statement and target audience pain points</div>
              </div>
              <div className="evidence-actions">
                <a href="/README.md" className="btn btn-ghost">Code File</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card rubric-section">
        <div className="rubric-code">CCC.1.2</div>
        <div className="rubric-body">
          <h3>User Research &amp; Target Audience</h3>
          <p className="muted">Evidence of understanding the target audience and their needs</p>

          <h4 className="evidence-heading">Evidence in Project:</h4>
          <div className="evidence-list">
            <div className="evidence-item">
              <div>
                <strong>About Page</strong>
                <div className="muted">Defines target audience: hs and college students struggling with budgeting</div>
              </div>
              <div className="evidence-actions">
                <Link href="/about" className="btn">View</Link>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Features Page</strong>
                <div className="muted">Features specifically designed for student use cases</div>
              </div>
              <div className="evidence-actions">
                <Link href="/features" className="btn">View</Link>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Product Demo - Sample Data</strong>
                <div className="muted">Demo data reflects realistic student scenarios (allowances, part-time jobs)</div>
              </div>
              <div className="evidence-actions">
                <Link href="/product" className="btn">View</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card rubric-footer">
        <p className="muted">This page provides clear documentation for each curriculum competency code. Click "View" buttons to navigate directly to the evidence in the live application.</p>
      </div>
    </div>
  );
}
