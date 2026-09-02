import type { WorkPackage } from './get-work-package.query.js';

export class WorkPackageNotFoundError extends Error {}
export abstract class AgentWorkPackageQueries {
  abstract get(jobId: string, nodeId: string): Promise<WorkPackage>;
}
