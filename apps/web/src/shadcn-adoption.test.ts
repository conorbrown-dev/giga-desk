import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeFiles = [
  'pages/project-list-page.tsx',
  'pages/project-create-page.tsx',
  'pages/project-work-items-page.tsx',
  'pages/project-settings-page.tsx',
  'pages/execution-dashboard-page.tsx',
  'agent-setup-guide.tsx',
] as const;

describe('shadcn route adoption', () => {
  it.each(routeFiles)('%s exports a route component', (file) => {
    expect(readFileSync(join('src', file), 'utf8')).toMatch(/export function \w+/);
  });

  it('keeps raw interactive elements inside the shadcn primitive layer', () => {
    const violations = readdirSync('src', { recursive: true, encoding: 'utf8' })
      .filter((file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx') && !file.startsWith('components/ui/'))
      .filter((file) => /<(?:button|details|input|select|summary|textarea)\b/.test(readFileSync(join('src', file), 'utf8')));

    expect(violations).toEqual([]);
  });
});
