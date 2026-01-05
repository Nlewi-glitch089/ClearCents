import fs from 'fs';
import path from 'path';

test('api auth register route exports POST and sets cookie', () => {
  const file = fs.readFileSync(path.resolve(__dirname, '../app/api/auth/register/route.js'), 'utf8');
  expect(file).toMatch(/export\s+async\s+function\s+POST\s*\(/);
  // registration route appends Set-Cookie headers
  expect(file).toMatch(/Set-Cookie/);
});
