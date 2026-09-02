import { randomUUID } from 'node:crypto';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Project } from '../domain/project.js';
import { CreateProjectCommand, type CreatedProject } from './create-project.command.js';
import { ProjectRepository } from './project-repository.js';

@CommandHandler(CreateProjectCommand)
export class CreateProjectHandler implements ICommandHandler<CreateProjectCommand> {
  constructor(private readonly projects: ProjectRepository) {}

  async execute(command: CreateProjectCommand): Promise<CreatedProject> {
    const project = Project.create({
      id: randomUUID(),
      ...command.input,
      status: 'Idea',
    });
    await this.projects.create(project, command.requestedBy);
    return project.props;
  }
}
