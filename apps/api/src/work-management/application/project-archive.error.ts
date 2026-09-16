export class ProjectArchiveConfirmationError extends Error {
  constructor() {
    super('Enter the active project name exactly to archive it.');
  }
}
