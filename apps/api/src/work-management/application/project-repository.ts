import type { Project } from '../domain/project.js';

export class ProjectKeyConflictError extends Error {
  constructor() {
    super('Project key already exists');
  }
}

export abstract class ProjectRepository {
  abstract create(project: Project, actorId: string): Promise<void>;
  abstract archive(projectId: string, projectName: string, actorId: string): Promise<void>;
}
