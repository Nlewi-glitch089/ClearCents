import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import { verifyToken } from '../../lib/auth.js';
import prisma from '../../lib/prisma.js';
import fs from 'fs/promises';
import path from 'path';
// Sign-out handled in header; no local sign-out button here

export default async function RubricPage() {
  const cookieJar = await cookies();
  let token = null;
  try {
    if (cookieJar && typeof cookieJar.get === 'function') {
      token = cookieJar.get('session')?.value ?? null;
    } else if (cookieJar && typeof cookieJar.getAll === 'function') {
      const found = cookieJar.getAll().find((c) => c.name === 'session');
      token = found?.value ?? null;
    } else if (cookieJar && typeof cookieJar[Symbol.iterator] === 'function') {
      for (const c of cookieJar) {
        if (c?.name === 'session') { token = c.value; break; }
      }
    } else {
      const hdrs = await headers();
      let cookieHeader = '';
      if (hdrs && typeof hdrs.get === 'function') cookieHeader = hdrs.get('cookie') || '';
      else if (hdrs && hdrs.cookie) cookieHeader = hdrs.cookie;
      else if (typeof hdrs === 'object') cookieHeader = hdrs['cookie'] || hdrs['Cookie'] || '';
      const m = cookieHeader.match(/(?:^|; )session=([^;]+)/);
      token = m?.[1] ?? null;
    }
  } catch (e) {
    token = null;
  }

  let user = null;
  try {
    if (token) {
      let payload = null;
      try { payload = verifyToken(token); } catch (e) { payload = null; }
      if (payload) {
        user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user && process.env.NODE_ENV !== 'production' && payload.role) {
          user = { id: payload.id || null, email: payload.email || null, name: payload.name || null, role: payload.role };
        }
      }
    }
  } catch (e) {
    user = null;
  }

  const allowed = user && (user.role === 'coach' || user.role === 'instructor');

  if (!allowed) {
    return (
      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ marginTop: 20 }}>Access Denied</h1>
        <p style={{ opacity: 0.9 }}>This page is for Launchpad staff (coach or instructor) only.</p>
        <div style={{ marginTop: 18 }}>
          <a href="/" style={{ color: '#0070f3' }}>Return to Home</a>
        </div>
      </div>
    );
  }
  // Read some local files to show snippets for staff reviewers (best-effort)
  const projectRoot = process.cwd();
  async function readSafe(rel) {
    try {
      const p = path.join(projectRoot, rel);
      const s = await fs.readFile(p, 'utf8');
      return s;
    } catch (e) {
      return `Could not read ${rel}: ${e.message}`;
    }
  }

  const globalsCss = await readSafe('app/globals.css');
  const prismaSchema = await readSafe('prisma/schema.prisma');
  let componentsList = '';
  try {
    const compFiles = await fs.readdir(path.join(projectRoot, 'components'));
    componentsList = compFiles.join('\n');
  } catch (e) {
    componentsList = `Could not list components: ${e.message}`;
  }

  function extractSnippet(content, pattern, ctx = 3) {
    if (!content) return 'Not available.';
    const lines = content.split(/\r?\n/);
    const re = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
    let idx = lines.findIndex(l => re.test(l));
    if (idx === -1) idx = 0;
    const start = Math.max(0, idx - ctx);
    const end = Math.min(lines.length, idx + ctx + 1);
    return lines.slice(start, end).join('\n').trim();
  }

  const globalsSnippet = extractSnippet(globalsCss, /:root|rubric-hero|rubric-section/);
  const prismaSnippet = extractSnippet(prismaSchema, /model\s+User|model\s+Transaction/);
  const readme = await readSafe('README.md');
  const readmeSnippet = extractSnippet(readme, /##\s+|Usage|Setup/);
  const seed = await readSafe('scripts/seed.js');
  const seedSnippet = extractSnippet(seed, /prisma\.user|upsert|seed/i);
  const upsert = await readSafe('scripts/upsert_user.js');
  const upsertSnippet = extractSnippet(upsert, /upsert|bcrypt|prisma\.user/i);
  const insightRoute = await readSafe('app/api/ai/insight/route.js');
  const insightSnippet = extractSnippet(insightRoute, /export|insight|openai|ai/i);
  const testSetup = await readSafe('test-setup.js');
  const testSnippet = extractSnippet(testSetup, /setupTests|jest|testing-library/i);
  const middlewareFile = await readSafe('middleware.js');
  const middlewareSnippet = extractSnippet(middlewareFile, /onboarding|staff|cookies|session|middleware/i);

  return (
    <div>
      <div className="page-hero card rubric-hero">
        <div className="rubric-top">
          <div className="rubric-badge">LAUNCHPAD STAFF ONLY</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user ? <div className="rubric-server-banner">{user.email}</div> : null}
          </div>
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
                <details>
                  <summary className="btn btn-ghost">Code File</summary>
                  <pre style={{whiteSpace:'pre-wrap',maxHeight:320,overflow:'auto',padding:12,background:'#0b0720',borderRadius:8}}>{readmeSnippet}</pre>
                </details>
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

      <div className="card rubric-section">
        <div className="rubric-code">CCC.1.3</div>
        <div className="rubric-body">
          <h3>Solution Design &amp; Wireframes</h3>
          <p className="muted">Documented design decisions and user interface planning</p>

          <h4 className="evidence-heading">Evidence in Project:</h4>
          <div className="evidence-list">
            <div className="evidence-item">
              <div>
                <strong>Product Demo Page</strong>
                <div className="muted">Interactive prototype showing all core features and UI design</div>
              </div>
              <div className="evidence-actions">
                <Link href="/product" className="btn">View</Link>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Design System Implementation</strong>
                <div className="muted">Consistent color scheme (purple gradients, teal accents) and typography throughout</div>
              </div>
              <div className="evidence-actions">
                <Link href="/" className="btn">View</Link>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>globals.css</strong>
                <div className="muted">CSS variables defining design tokens and cohesive style system</div>
              </div>
              <div className="evidence-actions">
                <details>
                  <summary className="btn btn-ghost">Code File</summary>
                  <pre style={{whiteSpace:'pre-wrap',maxHeight:320,overflow:'auto',padding:12,background:'#0b0720',borderRadius:8}}>{globalsSnippet}</pre>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card rubric-section">
        <div className="rubric-code">CCC.2.1</div>
        <div className="rubric-body">
          <h3>Frontend Implementation</h3>
          <p className="muted">Functional user interface with React components</p>

          <h4 className="evidence-heading">Evidence in Project:</h4>
          <div className="evidence-list">
            <div className="evidence-item">
              <div>
                <strong>Tools Dashboard</strong>
                <div className="muted">Fully functional budgeting interface with income, expenses, goals, and AI insights</div>
              </div>
              <div className="evidence-actions">
                <Link href="/product" className="btn">View</Link>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Component Architecture</strong>
                <div className="muted">Modular React components (Tools, Auth, Dashboard, AIInsights, ProductShowcase, etc.)</div>
              </div>
              <div className="evidence-actions">
                <details>
                  <summary className="btn btn-ghost">Code File</summary>
                  <pre style={{whiteSpace:'pre-wrap',maxHeight:240,overflow:'auto',padding:12,background:'#0b0720',borderRadius:8}}>{componentsList}</pre>
                </details>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Interactive Charts</strong>
                <div className="muted">Charts integration for visual data representation (pie charts, bar charts)</div>
              </div>
              <div className="evidence-actions">
                <Link href="/product" className="btn">View</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card rubric-section">
        <div className="rubric-code">CCC.2.2</div>
        <div className="rubric-body">
          <h3>Backend &amp; Database Integration</h3>
          <p className="muted">Working backend with data persistence</p>

          <h4 className="evidence-heading">Evidence in Project:</h4>
          <div className="evidence-list">
            <div className="evidence-item">
              <div>
                <strong>Neon (Postgres) + Prisma</strong>
                <div className="muted">Prisma schema and migrations target a Postgres database hosted on Neon (connection via environment variables)</div>
              </div>
              <div className="evidence-actions">
                <details>
                  <summary className="btn btn-ghost">Code File</summary>
                  <pre style={{whiteSpace:'pre-wrap',maxHeight:320,overflow:'auto',padding:12,background:'#0b0720',borderRadius:8}}>{prismaSnippet}</pre>
                </details>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>KV Store Usage</strong>
                <div className="muted">Key-value database for persistent storage of user financial data (used for guest fallbacks and caching)</div>
              </div>
              <div className="evidence-actions">
                <details>
                  <summary className="btn btn-ghost">Code File</summary>
                  <pre style={{whiteSpace:'pre-wrap',maxHeight:320,overflow:'auto',padding:12,background:'#0b0720',borderRadius:8}}>{seedSnippet}</pre>
                </details>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Authentication Flow</strong>
                <div className="muted">Sign-up, login, session management implemented with JWT stored in cookie</div>
              </div>
              <div className="evidence-actions">
                <Link href="/api/auth/login" className="btn">View</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card rubric-section">
        <div className="rubric-code">CCC.2.3</div>
        <div className="rubric-body">
          <h3>Advanced Features</h3>
          <p className="muted">Implementation of complex functionality beyond basic CRUD</p>

          <h4 className="evidence-heading">Evidence in Project:</h4>
          <div className="evidence-list">
            <div className="evidence-item">
              <div>
                <strong>AI Financial Coach</strong>
                <div className="muted">AI-powered insights analyzing spending patterns and providing personalized recommendations</div>
              </div>
              <div className="evidence-actions">
                <Link href="/product" className="btn">View</Link>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Recurring Income System</strong>
                <div className="muted">Smart handling of one-time vs recurring income sources</div>
              </div>
              <div className="evidence-actions">
                <details>
                  <summary className="btn btn-ghost">Code File</summary>
                  <pre style={{whiteSpace:'pre-wrap',maxHeight:320,overflow:'auto',padding:12,background:'#0b0720',borderRadius:8}}>{upsertSnippet}</pre>
                </details>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Savings Goals Tracking</strong>
                <div className="muted">Progress calculation, deadline tracking, and visual indicators</div>
              </div>
              <div className="evidence-actions">
                <Link href="/profile" className="btn">View</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card rubric-section">
        <div className="rubric-code">CCC.3.1</div>
        <div className="rubric-body">
          <h3>Code Quality &amp; Organization</h3>
          <p className="muted">Clean, readable, and well-structured code</p>

          <h4 className="evidence-heading">Evidence in Project:</h4>
          <div className="evidence-list">
            <div className="evidence-item">
              <div>
                <strong>Component Structure</strong>
                <div className="muted">Separated concerns: UI components, backend logic, utilities, and styles</div>
              </div>
              <div className="evidence-actions">
                <details>
                  <summary className="btn btn-ghost">Code File</summary>
                  <pre style={{whiteSpace:'pre-wrap',maxHeight:240,overflow:'auto',padding:12,background:'#0b0720',borderRadius:8}}>{componentsList}</pre>
                </details>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Error Handling</strong>
                <div className="muted">Comprehensive error handling in API calls with user feedback</div>
              </div>
              <div className="evidence-actions">
                <details>
                  <summary className="btn btn-ghost">Code File</summary>
                  <pre style={{whiteSpace:'pre-wrap',maxHeight:320,overflow:'auto',padding:12,background:'#0b0720',borderRadius:8}}>{insightSnippet}</pre>
                </details>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Responsive Design</strong>
                <div className="muted">Mobile-first CSS with flexible layouts that work across devices</div>
              </div>
              <div className="evidence-actions">
                <Link href="/" className="btn">View</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card rubric-section">
        <div className="rubric-code">CCC.3.2</div>
        <div className="rubric-body">
          <h3>User Experience Design</h3>
          <p className="muted">Intuitive interface with good usability</p>

          <h4 className="evidence-heading">Evidence in Project:</h4>
          <div className="evidence-list">
            <div className="evidence-item">
              <div>
                <strong>Navigation System</strong>
                <div className="muted">Clear navigation between pages with active state indicators</div>
              </div>
              <div className="evidence-actions">
                <Link href="/" className="btn">View</Link>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Loading &amp; Error States</strong>
                <div className="muted">User feedback during data operations (loading spinners, error messages)</div>
              </div>
              <div className="evidence-actions">
                <details>
                  <summary className="btn btn-ghost">Code File</summary>
                  <pre style={{whiteSpace:'pre-wrap',maxHeight:320,overflow:'auto',padding:12,background:'#0b0720',borderRadius:8}}>{testSnippet}</pre>
                </details>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Visual Hierarchy</strong>
                <div className="muted">Consistent typography, spacing, and color usage to guide user attention</div>
              </div>
              <div className="evidence-actions">
                <Link href="/" className="btn">View</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card rubric-section">
        <div className="rubric-code">CCC.4.1</div>
        <div className="rubric-body">
          <h3>Security &amp; Authentication</h3>
          <p className="muted">Secure handling of user data and authentication</p>

          <h4 className="evidence-heading">Evidence in Project:</h4>
          <div className="evidence-list">
            <div className="evidence-item">
              <div>
                <strong>Auth Implementation</strong>
                <div className="muted">JWT-based sessions with secure cookies and password hashing</div>
              </div>
              <div className="evidence-actions">
                <Link href="/api/auth/login" className="btn">View</Link>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Protected Routes</strong>
                <div className="muted">Server-side authorization checks requiring access tokens for user data</div>
              </div>
              <div className="evidence-actions">
                <details>
                  <summary className="btn btn-ghost">Code File</summary>
                  <pre style={{whiteSpace:'pre-wrap',maxHeight:320,overflow:'auto',padding:12,background:'#0b0720',borderRadius:8}}>{middlewareSnippet}</pre>
                </details>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Environment Variables</strong>
                <div className="muted">API keys and sensitive data stored in environment variables, not hardcoded</div>
              </div>
              <div className="evidence-actions">
                <details>
                  <summary className="btn btn-ghost">Code File</summary>
                  <pre style={{whiteSpace:'pre-wrap',maxHeight:320,overflow:'auto',padding:12,background:'#0b0720',borderRadius:8}}>{readmeSnippet}</pre>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card rubric-section">
        <div className="rubric-code">CCC.4.2</div>
        <div className="rubric-body">
          <h3>Documentation</h3>
          <p className="muted">Clear documentation of features, setup, and usage</p>

          <h4 className="evidence-heading">Evidence in Project:</h4>
          <div className="evidence-list">
            <div className="evidence-item">
              <div>
                <strong>About Page</strong>
                <div className="muted">Overview of project purpose, target audience, and key features</div>
              </div>
              <div className="evidence-actions">
                <Link href="/about" className="btn">View</Link>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Features Page</strong>
                <div className="muted">Detailed explanation of each feature with use cases</div>
              </div>
              <div className="evidence-actions">
                <Link href="/product" className="btn">View</Link>
              </div>
            </div>

            <div className="evidence-item">
              <div>
                <strong>Product Demo</strong>
                <div className="muted">Interactive showcase allowing users to explore functionality before signing up</div>
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
