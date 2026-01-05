import fs from 'fs';
import path from 'path';

test('api auth me route exports GET', () => {
  const file = fs.readFileSync(path.resolve(__dirname, '../app/api/auth/me/route.js'), 'utf8');
  expect(file).toMatch(/export\s+async\s+function\s+GET\s*\(/);
});
