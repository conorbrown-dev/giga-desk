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
    expect(styles).toMatch(/\[data-slot="card"\]\.work-item-row\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/);
    expect(styles).toMatch(/\.work-item-row\s*>\s*\[data-slot="card-footer"\]\s*\{[^}]*padding:\s*12px 20px;/);
  });
});
