export type WorkItemType = 'Idea' | 'Epic' | 'Feature' | 'UserStory' | 'Task' | 'Bug' | 'Issue' | 'TechnicalDebt' | 'Research';
export const WORK_ITEM_STATUSES = ['Backlog', 'Ready', 'InProgress', 'Blocked', 'InReview', 'Testing', 'ReadyForDeployment', 'Deploying', 'E2ETesting', 'Completed', 'Cancelled'] as const;
export type WorkItemStatus = typeof WORK_ITEM_STATUSES[number];

export class InvalidWorkItemTransitionError extends Error {}
export class UnfinishedPrerequisiteError extends Error {}

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
}

export class WorkItem {
  private currentStatus: WorkItemStatus;
  private constructor(readonly props: Readonly<WorkItemProps>) { this.currentStatus = props.status; }
  get status(): WorkItemStatus { return this.currentStatus; }

  static create(props: WorkItemProps): WorkItem {
    if (!props.title.trim()) throw new Error('Work item title is required');
    if (props.type === 'Feature' && props.acceptanceCriteria.length === 0) throw new Error('Features require acceptance criteria');
    if (props.acceptanceCriteria.some((criterion) => !criterion.trim())) throw new Error('Acceptance criteria cannot be blank');
    if (props.parentId === props.id) throw new Error('A work item cannot be its own parent');
    return new WorkItem({
      ...props,
      title: props.title.trim(),
      acceptanceCriteria: props.acceptanceCriteria.map((criterion) => criterion.trim()),
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
