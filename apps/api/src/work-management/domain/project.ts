export type ProjectStatus = 'Idea' | 'Planning' | 'Active' | 'OnHold' | 'Completed' | 'Archived';

export const PROJECT_REPOSITORY_URL_PATTERN = /^https?:\/\/(?![^/]*@)[^\s/?#]+\/[^\s/?#][^\s?#]*$/;
export const PROJECT_DEFAULT_BRANCH_PATTERN = /^(?!@$|[.-])(?![^/]*\.lock(?:\/|$))(?!.*(?:\/\/|\.\.|@\{|\/\.|\/[^/]*\.lock(?:\/|$)))(?!.*(?:\/|\.)$)[^\p{Cc}\s~^:?*[\]\\]+$/u;

export const isValidProjectRepositoryUrl = (value: string): boolean => {
  if (!PROJECT_REPOSITORY_URL_PATTERN.test(value)) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash
      && url.pathname.split('/').some(Boolean);
  } catch { return false; }
};

export const isValidProjectDefaultBranch = (value: string): boolean => PROJECT_DEFAULT_BRANCH_PATTERN.test(value)
  && Array.from(value).every((character) => character.charCodeAt(0) > 31 && character.charCodeAt(0) !== 127);

export interface ProjectProps {
  id: string;
  key: string;
  name: string;
  description: string;
  businessGoal: string;
  repositoryUrl: string;
  defaultBranch: string;
  status: ProjectStatus;
}

export class Project {
  private constructor(readonly props: Readonly<ProjectProps>) {}

  static create(props: ProjectProps): Project {
    const key = props.key.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9]{1,11}$/.test(key)) throw new Error('Project key must contain 2-12 letters or numbers');
    if (!props.name.trim()) throw new Error('Project name is required');
    if (!props.businessGoal.trim()) throw new Error('Project business goal is required');
    const repositoryUrl = props.repositoryUrl.trim();
    const defaultBranch = props.defaultBranch.trim();
    if (!isValidProjectRepositoryUrl(repositoryUrl)) throw new Error('Project repository URL must be an HTTP(S) URL without credentials, query parameters, or fragments');
    if (!isValidProjectDefaultBranch(defaultBranch)) throw new Error('Project default branch must be a valid Git branch name');
    return new Project({ ...props, key, name: props.name.trim(), repositoryUrl, defaultBranch });
  }
}
