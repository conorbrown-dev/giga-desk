import { Query } from '@nestjs/cqrs';

export interface WorkPackage {
  executionJobId: string;
  authorization: { protectedActionsApproved: boolean };
  project: { id: string; key: string; name: string; description: string; businessGoal: string;
    repositoryUrl: string | null; defaultBranch: string | null };
  workItem: { id: string; type: string; title: string; description: string; technicalNotes: string | null;
    implementationInstructions: string | null; parent: { id: string; title: string } | null;
    visualReferences: readonly { name: string; mediaType: string; dataBase64: string }[];
    acceptanceCriteria: readonly { id: string; text: string; satisfied: boolean }[];
    dependencies: readonly { id: string; title: string; status: string }[] };
  execution: { node: { id: string; name: string }; agent: { id: string; name: string; type: string; version: string };
    model: { id: string; displayName: string; provider: string; identifier: string } };
  expectations: { tests: readonly ('Unit' | 'Integration' | 'EndToEnd')[]; deploymentRequired: boolean;
    visualReviewRequired: boolean };
}

export class GetWorkPackageQuery extends Query<WorkPackage> {
  constructor(readonly jobId: string, readonly nodeId: string) { super(); }
}
