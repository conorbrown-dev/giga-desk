export class JobClaimConflictError extends Error {}
export class WorkerNodeMismatchError extends Error {}

export const assertWorkerNode = (requestedNodeId: string, authenticatedNodeId: string | null): void => {
  if (authenticatedNodeId !== requestedNodeId) {
    throw new WorkerNodeMismatchError('Worker identity does not match the execution node');
  }
};
