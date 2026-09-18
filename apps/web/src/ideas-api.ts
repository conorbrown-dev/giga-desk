import { getAuthToken } from './auth-token.js';

export type OrganizationRole = 'Owner' | 'Coworker';
export type IdeaStatus = 'Open' | 'Archived';

interface OrganizationResponse {
  id: string;
  name: string;
  members: readonly { role: OrganizationRole }[];
}

export interface OrganizationSummary {
  id: string;
  name: string;
  role: OrganizationRole;
}

export interface IdeaSummary {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  status: IdeaStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  comments: readonly { id: string; body: string; authorId: string; createdAt: string }[];
}

export interface CreateIdeaInput {
  title: string;
  description: string;
}

async function getAuthenticated<T>(path: string, signal: AbortSignal, unavailableMessage: string): Promise<T> {
  const token = await getAuthToken();
  const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` }, signal });
  if (!response.ok) {
    throw new Error(response.status === 401 || response.status === 403 ? 'You do not have access to these ideas.' : unavailableMessage);
  }
  return response.json() as Promise<T>;
}

export async function fetchOrganizations(signal: AbortSignal): Promise<readonly OrganizationSummary[]> {
  const organizations = await getAuthenticated<readonly OrganizationResponse[]>('/api/organizations', signal, 'Organizations are unavailable.');
  return organizations.flatMap((organization) => {
    const membership = organization.members[0];
    return membership ? [{ id: organization.id, name: organization.name, role: membership.role }] : [];
  });
}

export function fetchIdeas(organizationId: string, signal: AbortSignal): Promise<readonly IdeaSummary[]> {
  return getAuthenticated(`/api/organizations/${organizationId}/ideas`, signal, 'Ideas are unavailable.');
}

export async function createIdea(organizationId: string, input: CreateIdeaInput): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch(`/api/organizations/${organizationId}/ideas`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(response.status === 401 || response.status === 403
      ? 'You do not have permission to create ideas for this organization.'
      : response.status === 400 ? 'Enter a valid title and description.' : 'Unable to create the idea.');
  }
}
