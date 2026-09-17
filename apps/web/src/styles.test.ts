import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync('src/styles.css', 'utf8');

describe('shared dashboard layout styles', () => {
  it('keeps ordinary links unadorned', () => {
    expect(styles).toMatch(/a\s*\{[^}]*text-decoration:\s*none;/);
    expect(styles).toMatch(/a:hover\s*\{[^}]*text-decoration:\s*none;/);
  });

  it('keeps work-item cards separated and aligned as an operational list', () => {
    expect(styles).toMatch(/\.work-item-list\s*\{[^}]*display:\s*grid;[^}]*gap:\s*12px;/);
    expect(styles).toMatch(/\.work-item-row\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto minmax\(120px, auto\) minmax\(80px, auto\);/);
  });
});
