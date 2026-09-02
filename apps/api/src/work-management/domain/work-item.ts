export type WorkItemType = 'Idea' | 'Epic' | 'Feature' | 'UserStory' | 'Task' | 'Bug' | 'Issue' | 'TechnicalDebt' | 'Research';
export const WORK_ITEM_STATUSES = ['Backlog', 'Ready', 'InProgress', 'Blocked', 'InReview', 'Testing', 'ReadyForDeployment', 'Deploying', 'E2ETesting', 'Completed', 'Cancelled'] as const;
export type WorkItemStatus = typeof WORK_ITEM_STATUSES[number];

export class InvalidWorkItemTransitionError extends Error {}
export class UnfinishedPrerequisiteError extends Error {}

export type VisualReferenceMediaType = 'image/png' | 'image/jpeg' | 'image/webp';
export interface VisualReferenceInput { name: string; mediaType: VisualReferenceMediaType; content: Uint8Array }

const hasImageSignature = ({ mediaType, content }: VisualReferenceInput): boolean => {
  if (mediaType === 'image/png') return [0x89, 0x50, 0x4e, 0x47].every((byte, index) => content[index] === byte);
  if (mediaType === 'image/jpeg') return [0xff, 0xd8, 0xff].every((byte, index) => content[index] === byte);
  return [0x52, 0x49, 0x46, 0x46].every((byte, index) => content[index] === byte)
    && [0x57, 0x45, 0x42, 0x50].every((byte, index) => content[index + 8] === byte);
};

const transitions: Readonly<Record<WorkItemStatus, readonly WorkItemStatus[]>> = {
  Backlog: ['Ready', 'Cancelled'], Ready: ['InProgress', 'Blocked', 'Cancelled'],
  InProgress: ['Blocked', 'InReview', 'Testing', 'Cancelled'], Blocked: ['Ready', 'InProgress', 'Cancelled'],
  InReview: ['InProgress', 'Testing', 'Cancelled'], Testing: ['InProgress', 'ReadyForDeployment', 'Completed', 'Cancelled'],
  ReadyForDeployment: ['Deploying', 'Cancelled'], Deploying: ['ReadyForDeployment', 'E2ETesting', 'Cancelled'],
  E2ETesting: ['Deploying', 'Completed', 'Cancelled'], Completed: [], Cancelled: [],
};

export interface WorkItemProps {
  id: string;
  projectId: string;
  parentId?: string;
  type: WorkItemType;
  title: string;
  description: string;
  status: WorkItemStatus;
  acceptanceCriteria: readonly string[];
  visualReferences?: readonly VisualReferenceInput[];
}

export class WorkItem {
  private currentStatus: WorkItemStatus;
  private constructor(readonly props: Readonly<WorkItemProps>) { this.currentStatus = props.status; }
  get status(): WorkItemStatus { return this.currentStatus; }

  static create(props: WorkItemProps): WorkItem {
    if (!props.title.trim()) throw new Error('Work item title is required');
    if (props.type === 'Feature' && props.acceptanceCriteria.length === 0) throw new Error('Features require acceptance criteria');
    if (props.acceptanceCriteria.some((criterion) => !criterion.trim())) throw new Error('Acceptance criteria cannot be blank');
    if ((props.visualReferences?.length ?? 0) > 3) throw new Error('Work items support at most three visual references');
    if (props.visualReferences?.some((reference) => !reference.name.trim() || reference.name.length > 200
      || reference.content.byteLength === 0 || reference.content.byteLength > 3_000_000 || !hasImageSignature(reference))) {
      throw new Error('Visual references must be valid PNG, JPEG, or WebP images up to 3 MB');
    }
    if (props.parentId === props.id) throw new Error('A work item cannot be its own parent');
    return new WorkItem({
      ...props,
      title: props.title.trim(),
      acceptanceCriteria: props.acceptanceCriteria.map((criterion) => criterion.trim()),
      visualReferences: props.visualReferences?.map((reference) => ({ ...reference, name: reference.name.trim() })) ?? [],
    });
  }

  transitionTo(next: WorkItemStatus): void {
    if (!transitions[this.currentStatus].includes(next)) {
      throw new InvalidWorkItemTransitionError(`Cannot transition from ${this.currentStatus} to ${next}`);
    }
    this.currentStatus = next;
  }

  assertCanStart(prerequisiteStatuses: readonly WorkItemStatus[]): void {
    if (prerequisiteStatuses.some((status) => status !== 'Completed')) {
      throw new UnfinishedPrerequisiteError('Unfinished prerequisites block work');
    }
  }
}
