import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ArchiveProjectCommand } from './archive-project.command.js';
import { ProjectRepository } from './project-repository.js';

@CommandHandler(ArchiveProjectCommand)
export class ArchiveProjectHandler implements ICommandHandler<ArchiveProjectCommand> {
  constructor(private readonly projects: ProjectRepository) {}

  execute(command: ArchiveProjectCommand): Promise<void> {
    return this.projects.archive(command.projectId, command.projectName, command.requestedBy);
  }
}
