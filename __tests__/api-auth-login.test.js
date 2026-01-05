import fs from 'fs';
import path from 'path';

test('api auth login route exports POST and sets cookie', () => {
  const file = fs.readFileSync(path.resolve(__dirname, '../app/api/auth/login/route.js'), 'utf8');
  expect(file).toMatch(/export\s+async\s+function\s+POST\s*\(/);
  // ensure the route sets a Set-Cookie header on successful login
  expect(file).toMatch(/Set-Cookie/);
});
