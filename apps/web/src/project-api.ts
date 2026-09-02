import { getAuthToken } from './auth-token.js';

export interface ProjectSummary {
  id: string;
  key: string;
  name: string;
  businessGoal: string;
  status: string;
  priority: string;
  updatedAt: string;
}

export interface ProjectWorkItem {
  id: string;
  parentId: string | null;
  type: string;
  title: string;
  status: string;
  priority: string;
  criteria: readonly { id: string; text: string; satisfied: boolean; sortOrder: number }[];
}

export interface CreateProjectInput { key: string; name: string; description: string; businessGoal: string }
export interface VisualReferenceInput { name: string; mediaType: string; dataBase64: string }
export interface CreateFeatureInput { title: string; description: string; acceptanceCriteria: readonly string[];
  visualReferences?: readonly VisualReferenceInput[]; visualReviewRequired?: boolean }

async function getAuthenticated<T>(path: string, signal: AbortSignal, unavailableMessage: string): Promise<T> {
  const token = await getAuthToken();
  const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` }, signal });
  if (!response.ok) {
    throw new Error(response.status === 401 || response.status === 403 ? 'Sign in to view projects.' : unavailableMessage);
  }
  return response.json() as Promise<T>;
}

export function fetchProjects(signal: AbortSignal): Promise<readonly ProjectSummary[]> {
  return getAuthenticated('/api/projects', signal, 'Projects are unavailable.');
}

export function fetchProjectWorkItems(projectId: string, signal: AbortSignal): Promise<readonly ProjectWorkItem[]> {
  return getAuthenticated(`/api/projects/${projectId}/work-items`, signal, 'Project work items are unavailable.');
}

export async function createProject(input: CreateProjectInput): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch('/api/projects', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Sign in to create projects.' : response.status === 409 ? 'That project key is already in use.' : 'Unable to create the project.');
}

export async function createFeature(projectId: string, input: CreateFeatureInput): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch(`/api/projects/${projectId}/features`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Sign in to create features.' : response.status === 404 ? 'This project no longer exists.' : 'Unable to create the feature.');
}
