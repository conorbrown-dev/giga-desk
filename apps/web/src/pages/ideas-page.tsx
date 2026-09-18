import { useCallback, useState } from 'react';
import { Alert, AlertDescription } from '../components/ui/alert.js';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card.js';
import { NativeSelect, NativeSelectOption } from '../components/ui/native-select.js';
import { Skeleton } from '../components/ui/skeleton.js';
import { CreateIdeaForm } from '../create-idea-form.js';
import { useAuthenticatedLoad } from '../hooks/use-authenticated-load.js';
import { fetchIdeas, fetchOrganizations, type IdeaSummary, type OrganizationSummary } from '../ideas-api.js';
import { statusClassName } from '../ui/status-class-name.js';

function IdeaCollection({ organization, reloadKey }: { organization: OrganizationSummary; reloadKey: number }) {
  const loadIdeas = useCallback((signal: AbortSignal) => fetchIdeas(organization.id, signal), [organization.id]);
  const { data: ideas, error } = useAuthenticatedLoad<IdeaSummary>(loadIdeas, reloadKey);

  if (error) return <Alert variant="destructive" className="state-panel"><AlertDescription>{error}</AlertDescription></Alert>;
  if (ideas === null) return <Card className="state-panel" aria-busy="true"><CardContent className="flex flex-col items-center gap-3"><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-32" /></CardContent></Card>;
  if (ideas.length === 0) return <Card className="state-panel"><CardContent>No ideas yet. This organization is ready for its first proposal.</CardContent></Card>;

  const discussionCount = ideas.reduce((total, idea) => total + idea.comments.length, 0);
  return <><section className="dashboard-section" aria-labelledby="idea-health"><div className="section-heading"><p className="section-kicker">02 — Workspace health</p><h2 id="idea-health">Ideas at a glance</h2></div><div className="summary-stats" aria-label="Idea summary"><Card className="summary-stat"><CardContent className="contents"><span className="summary-stat-label">Open ideas</span><span className="summary-stat-value accent-green">{ideas.filter((idea) => idea.status === 'Open').length}</span></CardContent></Card><Card className="summary-stat"><CardContent className="contents"><span className="summary-stat-label">Archived</span><span className="summary-stat-value">{ideas.filter((idea) => idea.status === 'Archived').length}</span></CardContent></Card><Card className="summary-stat"><CardContent className="contents"><span className="summary-stat-label">Discussion posts</span><span className="summary-stat-value">{discussionCount}</span></CardContent></Card></div></section><section aria-label="Ideas" className="dashboard-section project-section"><div className="section-heading"><div><p className="section-kicker">03 — Proposals</p><h2>Organization ideas</h2></div></div><div className="grid project-grid">{ideas.map((idea) => <Card className="project-row" key={idea.id}><CardHeader><div><Badge variant="outline" className="project-key">Idea</Badge><CardTitle><h3>{idea.title}</h3></CardTitle></div><CardAction><Badge className={statusClassName(idea.status)}>{idea.status}</Badge></CardAction></CardHeader><CardContent><p>{idea.description}</p></CardContent><CardFooter><div className="status-row"><div className="status-item"><span className="status-label">Discussion</span><span className="status-value">{idea.comments.length} {idea.comments.length === 1 ? 'post' : 'posts'}</span></div><div className="status-item"><span className="status-label">Updated</span><span className="status-value">{new Date(idea.updatedAt).toLocaleDateString()}</span></div></div></CardFooter></Card>)}</div></section></>;
}

export function IdeasPage() {
  const { data: organizations, error } = useAuthenticatedLoad<OrganizationSummary>(fetchOrganizations);
  const [selectedId, setSelectedId] = useState('');
  const [creating, setCreating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState('');
  const selectedOrganization = organizations?.find(({ id }) => id === selectedId) ?? organizations?.[0];

  return <><header className="page-header control-center-header"><div><p className="eyebrow">01 — Discovery workspace</p><h1>Ideas</h1><p>Review early proposals and the discussion shaping what your organization builds next.</p></div>{selectedOrganization ? <div className="page-header-actions"><Badge variant="outline" className="environment-chip"><i aria-hidden="true" />{selectedOrganization.role}</Badge></div> : null}</header>{error ? <Alert variant="destructive" className="state-panel"><AlertDescription>{error}</AlertDescription></Alert> : organizations === null ? <Card className="state-panel" aria-busy="true"><CardContent className="flex flex-col items-center gap-3"><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-32" /></CardContent></Card> : organizations.length === 0 ? <Card className="state-panel"><CardContent>You do not belong to an organization yet. An administrator with organizations:manage can create one.</CardContent></Card> : <><section className="project-command" aria-label="Idea workspace controls"><span>Idea registry</span><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-3 text-xs text-muted-foreground">Organization<NativeSelect className="w-64 max-w-full" aria-label="Organization" value={selectedOrganization?.id} onChange={(event) => { setSelectedId(event.target.value); setCreating(false); setNotice(''); }}>{organizations.map((organization) => <NativeSelectOption key={organization.id} value={organization.id}>{organization.name}</NativeSelectOption>)}</NativeSelect></label><Button size="sm" aria-expanded={creating} onClick={() => { setCreating(true); setNotice(''); }}>Add idea</Button></div></section>{selectedOrganization && creating ? <CreateIdeaForm key={`create-${selectedOrganization.id}`} organizationId={selectedOrganization.id} onCancel={() => { setCreating(false); }} onCreated={(title) => { setCreating(false); setNotice(`Idea “${title}” created.`); setReloadKey((value) => value + 1); }} /> : null}{notice && <Alert className="my-4" role="status"><AlertDescription>{notice}</AlertDescription></Alert>}{selectedOrganization ? <IdeaCollection key={`list-${selectedOrganization.id}`} organization={selectedOrganization} reloadKey={reloadKey} /> : null}</>}</>;
}
