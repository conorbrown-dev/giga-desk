export type ProjectStatus = 'Idea' | 'Planning' | 'Active' | 'OnHold' | 'Completed' | 'Archived';

export interface ProjectProps {
  id: string;
  key: string;
  name: string;
  description: string;
  businessGoal: string;
  status: ProjectStatus;
}

export class Project {
  private constructor(readonly props: Readonly<ProjectProps>) {}

  static create(props: ProjectProps): Project {
    const key = props.key.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9]{1,11}$/.test(key)) throw new Error('Project key must contain 2-12 letters or numbers');
    if (!props.name.trim()) throw new Error('Project name is required');
    if (!props.businessGoal.trim()) throw new Error('Project business goal is required');
    return new Project({ ...props, key, name: props.name.trim() });
  }
}
