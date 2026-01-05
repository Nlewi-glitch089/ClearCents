import fs from 'fs';
import path from 'path';

test('globals.css contains accent and heading blue variables', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');
  expect(css).toMatch(/--accent:\s*#10c08a/);
  expect(css).toMatch(/--accent-2:\s*#07a36b/);
  expect(css).toMatch(/--heading-blue:\s*#3ea6ff/);
});
