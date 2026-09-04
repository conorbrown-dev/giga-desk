export class ArchiveProjectCommand {
  constructor(readonly projectId: string, readonly projectName: string, readonly requestedBy: string) {}
}
