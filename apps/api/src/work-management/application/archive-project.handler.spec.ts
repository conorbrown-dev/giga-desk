import { describe, expect, it } from 'vitest';
import { ArchiveProjectCommand } from './archive-project.command.js';
import { ArchiveProjectHandler } from './archive-project.handler.js';
import { ProjectRepository } from './project-repository.js';
import type { Project } from '../domain/project.js';

class RecordingProjectRepository extends ProjectRepository {
  archived?: { projectId: string; projectName: string; actorId: string };

  create(_project: Project, _actorId: string): Promise<void> { return Promise.resolve(); }

  archive(projectId: string, projectName: string, actorId: string): Promise<void> {
    this.archived = { projectId, projectName, actorId };
    return Promise.resolve();
  }
}

describe('ArchiveProjectHandler', () => {
  it('archives the confirmed project as the requesting identity', async () => {
    const repository = new RecordingProjectRepository();
    await new ArchiveProjectHandler(repository).execute(new ArchiveProjectCommand('project-123', 'Giga Desk', 'user-123'));
    expect(repository.archived).toEqual({ projectId: 'project-123', projectName: 'Giga Desk', actorId: 'user-123' });
  });
});
