async function login() {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rob@launchpadphilly.org', password: 'lpuser1' })
  });
  const headers = {};
  res.headers.forEach((v,k)=>headers[k]=v);
  console.log('Status:', res.status);
  console.log('Set-Cookie:', headers['set-cookie']);
  const cookie = headers['set-cookie'] ? headers['set-cookie'].split(';')[0] : null;
  if (!cookie) return;

  const rRubric = await fetch('http://localhost:3000/rubric', { headers: { Cookie: cookie } });
  console.log('/rubric status:', rRubric.status);
  const html = await rRubric.text();
  console.log('/rubric snippet:', html.slice(0,400));
}

login().catch(e=>{ console.error(e); process.exit(2); });
