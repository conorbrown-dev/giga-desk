import type { ClaimedExecutionJob } from './claim-execution-job.command.js';
import type { DiscoverableJob } from './discover-node-jobs.query.js';

export abstract class AgentJobRepository {
  abstract discover(nodeId: string): Promise<readonly DiscoverableJob[]>;
  abstract claim(jobId: string, nodeId: string, actorId: string): Promise<ClaimedExecutionJob>;
}
