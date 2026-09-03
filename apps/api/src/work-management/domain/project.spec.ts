import { describe, expect, it } from 'vitest';
import { Project } from './project.js';

describe('Project', () => {
  it('normalizes a valid project key', () => {
    const project = Project.create({ id: '1', key: ' gd ', name: 'Giga Desk', description: '', businessGoal: 'Ship reliably', repositoryUrl: 'https://github.com/example/giga-desk.git', defaultBranch: 'main', status: 'Idea' });
    expect(project.props.key).toBe('GD');
  });

  it('requires a valid key and business goal', () => {
    expect(() => Project.create({ id: '1', key: '!', name: 'Giga', description: '', businessGoal: '', repositoryUrl: '', defaultBranch: '', status: 'Idea' })).toThrow();
  });
});
