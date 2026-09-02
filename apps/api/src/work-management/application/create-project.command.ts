import { Command } from '@nestjs/cqrs';
import type { ProjectStatus } from '../domain/project.js';

export interface CreatedProject {
  id: string;
  key: string;
  name: string;
  description: string;
  businessGoal: string;
  status: ProjectStatus;
}

export interface CreateProjectInput {
  key: string;
  name: string;
  description: string;
  businessGoal: string;
}

export class CreateProjectCommand extends Command<CreatedProject> {
  constructor(readonly input: CreateProjectInput, readonly requestedBy: string) {
    super();
  }
}
