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

  it('rejects unsafe repository URLs and invalid Git branch names', () => {
    const input = { id: '1', key: 'GD', name: 'Giga', description: '', businessGoal: 'Ship', status: 'Idea' as const };
    expect(() => Project.create({ ...input, repositoryUrl: 'https://user:secret@github.com/example/repo.git', defaultBranch: 'main' })).toThrow('repository URL');
    expect(() => Project.create({ ...input, repositoryUrl: 'https://github.com', defaultBranch: 'main' })).toThrow('repository URL');
    expect(() => Project.create({ ...input, repositoryUrl: 'https://github.com/example/repo.git', defaultBranch: 'feature..invalid' })).toThrow('branch');
    expect(() => Project.create({ ...input, repositoryUrl: 'https://github.com/example/repo.git', defaultBranch: '.hidden' })).toThrow('branch');
    expect(() => Project.create({ ...input, repositoryUrl: 'https://github.com/example/repo.git', defaultBranch: '-unsafe' })).toThrow('branch');
    expect(() => Project.create({ ...input, repositoryUrl: 'https://github.com/example/repo.git', defaultBranch: 'release.lock/next' })).toThrow('branch');
  });
});
