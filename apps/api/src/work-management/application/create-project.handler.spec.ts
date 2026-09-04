import { describe, expect, it } from 'vitest';
import type { Project } from '../domain/project.js';
import { CreateProjectCommand } from './create-project.command.js';
import { CreateProjectHandler } from './create-project.handler.js';
import { ProjectRepository } from './project-repository.js';

class RecordingProjectRepository extends ProjectRepository {
  saved?: { project: Project; actorId: string };

  create(project: Project, actorId: string): Promise<void> {
    this.saved = { project, actorId };
    return Promise.resolve();
  }
  archive(): Promise<void> { return Promise.resolve(); }
}

describe('CreateProjectHandler', () => {
  it('creates a normalized project attributed to the requesting identity', async () => {
    const repository = new RecordingProjectRepository();
    const handler = new CreateProjectHandler(repository);
    const result = await handler.execute(new CreateProjectCommand({
      key: 'gd', name: ' Giga Desk ', description: 'Orchestrator', businessGoal: 'Ship reliably',
      repositoryUrl: 'https://github.com/example/giga-desk.git', defaultBranch: 'main',
    }, 'user-123'));

    expect(result).toMatchObject({ key: 'GD', name: 'Giga Desk', status: 'Idea' });
    expect(repository.saved?.actorId).toBe('user-123');
    expect(repository.saved?.project.props.id).toBe(result.id);
  });
});
