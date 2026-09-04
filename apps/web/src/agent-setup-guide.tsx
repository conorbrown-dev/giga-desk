import { useEffect, useState } from 'react';
import { fetchExecutionTargets, updateRepositoryMappings, type ExecutionTargets } from './execution-api.js';

type Provider = 'codex' | 'opencode';

const storageKey = 'giga-desk-agent-setup:codex';

interface SetupStep {
  title: string;
  detail: string;
  command?: string;
  pending?: boolean;
}

const steps: readonly SetupStep[] = [
  {
    title: 'Install Codex CLI',
    detail: 'Install Codex on the machine that will edit repositories, then confirm the installed version.',
    command: 'curl -fsSL https://chatgpt.com/codex/install.sh | sh\ncodex --version',
  },
  {
    title: 'Authenticate Codex',
    detail: 'On a trusted personal machine, sign in interactively. For shared automation, inject a separately managed service-account access token without saving a login.',
    command: 'codex login\ncodex login status\n# Shared automation: export CODEX_ACCESS_TOKEN=<secret>',
  },
  {
    title: 'Register the execution target',
    detail: 'The authenticated worker detects the hostname, operating system, architecture, and installed Codex CLI version when it starts, then registers only its node-scoped target through the API. No database URL is needed.',
  },
  {
    title: 'Create the machine identity',
    detail: 'Ask an administrator for a node-scoped OIDC client with only agent:jobs permission. Store its values outside the repository as GIGA_DESK_AGENT_NODE_ID and the three GIGA_DESK_AGENT_OIDC_* settings.',
    command: 'install -d -m 700 ~/.config/giga-desk\n$EDITOR ~/.config/giga-desk/agent.env\nchmod 600 ~/.config/giga-desk/agent.env\nset -a; . ~/.config/giga-desk/agent.env; set +a',
  },
  {
    title: 'Start and verify the worker',
    detail: 'Run the downloaded installer. It downloads a verified, versioned worker bundle from Giga Desk, installs the systemd user service, and registers the node. The worker can come Online before project checkouts exist; save a repository mapping above after cloning an approved customer repository.',
  },
];

const openCodeSteps: readonly SetupStep[] = [
  {
    title: 'Install and verify OpenCode',
    detail: 'Install OpenCode on the machine that will run work, then make sure the command is available to both your shell and the systemd user service.',
    command: `opencode --version
export PATH="$HOME/.opencode/bin:$PATH"`,
  },
  {
    title: 'Configure the machine identity',
    detail: 'Ask an administrator for a node-scoped OIDC client with only agent:jobs permission. Put the API URL, node ID, token URL, client ID, and client secret in the private agent.env file. The signed node identity—not database access—authorizes registration.',
    command: `install -d -m 700 ~/.config/giga-desk
$EDITOR ~/.config/giga-desk/agent.env
chmod 600 ~/.config/giga-desk/agent.env`,
  },
  {
    title: 'Configure the OpenCode worker',
    detail: 'Choose the displayed agent name and default provider/model. After cloning a customer project on this node, save its repository URL and local checkout path in the Giga Desk mapping form above; the worker will not claim work until a repository is mapped.',
  },
  {
    title: 'Start and verify the worker',
    detail: 'Run the downloaded installer. It downloads a verified, versioned worker bundle from Giga Desk, installs the user service, and registers the node. The worker can come Online before project checkouts exist; after mapping a customer repository in Giga Desk, it will pick up the mapping automatically.',
  },
];

const loadCompleted = (): readonly number[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is number => Number.isInteger(item)) : [];
  } catch {
    return [];
  }
};

function RepositoryMappingHelper() {
  const [url, setUrl] = useState('');
  const [path, setPath] = useState('');
  const [targets, setTargets] = useState<ExecutionTargets['nodes']>([]);
  const [nodeId, setNodeId] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { const controller = new AbortController(); void fetchExecutionTargets(controller.signal).then((value) => { setTargets(value.nodes); setNodeId(value.nodes[0]?.id ?? ''); }).catch(() => { setMessage('Sign in to configure an execution node.'); }); return () => { controller.abort(); }; }, []);
  const save = async (): Promise<void> => {
    if (!nodeId || !url.trim() || !path.trim()) { setMessage('Choose a node and enter both the repository URL and local checkout path.'); return; }
    setSaving(true); setMessage('');
    try { await updateRepositoryMappings(nodeId, [{ url: url.trim(), path: path.trim() }]); setMessage('Repository mapping saved. The worker will pick it up automatically; no restart is required.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save repository mapping.'); }
    finally { setSaving(false); }
  };
  return <section className="repository-mapping" aria-labelledby="repository-mapping-heading"><div className="workflow-section-heading"><div><p className="section-kicker">Repository access</p><h3 id="repository-mapping-heading">Configure an approved checkout</h3></div></div>
    <p>Tell Giga Desk where this machine may work. The worker retrieves the mapping automatically—no worker.env edits or restart required.</p>
    <div className="form-grid"><label>Execution node<select value={nodeId} onChange={(event) => { setNodeId(event.target.value); }}><option value="">Select a node</option>{targets.map((target) => <option key={target.id} value={target.id}>{target.name} ({target.status})</option>)}</select></label><label>Repository URL<input value={url} onChange={(event) => { setUrl(event.target.value); }} placeholder="https://github.com/example/project.git" /></label><label>Local checkout path<input value={path} onChange={(event) => { setPath(event.target.value); }} placeholder="/home/user/repos/project" /></label></div>
    <button className="button-link" type="button" onClick={() => { void save(); }} disabled={saving || !nodeId}>{saving ? 'Saving…' : 'Save repository mapping'}</button>{message && <p className="form-help" role="status">{message}</p>}
  </section>;
}

export function AgentSetupGuide() {
  const [provider, setProvider] = useState<Provider>('codex');
  const [completed, setCompleted] = useState<readonly number[]>(loadCompleted);
  const setStep = (index: number, checked: boolean): void => {
    const next = checked ? [...new Set([...completed, index])] : completed.filter((item) => item !== index);
    setCompleted(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const activeProvider = provider === 'opencode' ? {
    label: 'OpenCode', heading: 'Connect an OpenCode worker', steps: openCodeSteps,
    description: 'Install the verified Giga Desk worker bundle—no Giga Desk source checkout is needed. It registers through the authenticated API and safely waits for approved repository mappings before claiming work.',
    bashInstaller: '/scripts/install-opencode-worker.sh', powerShellInstaller: '/scripts/install-opencode-worker.ps1',
  } : {
    label: 'Codex', heading: 'Machine setup', steps,
    description: 'Install the verified Giga Desk worker bundle for this host. It registers through the authenticated API and safely waits for approved repository mappings before claiming work.',
    bashInstaller: '/scripts/install-codex-worker.sh', powerShellInstaller: '/scripts/install-codex-worker.ps1',
  };

  return <section className="agent-connect">
    <header className="page-header agent-connect-header"><div><p className="eyebrow">Agent integrations</p><h1>Connect an agent</h1><p>Prepare a machine to accept Giga Desk work and use only approved repository checkouts.</p></div></header>
    <section className="agent-provider-grid" aria-label="Agent providers">
      <button className={`provider-card ${provider === 'codex' ? 'provider-selected' : ''}`} type="button" aria-pressed={provider === 'codex'} onClick={() => { setProvider('codex'); }}><h2>Codex CLI</h2><p>OpenAI work agent</p><span className="provider-state">Available</span></button>
      <button className={`provider-card ${provider === 'opencode' ? 'provider-selected' : ''}`} type="button" aria-pressed={provider === 'opencode'} onClick={() => { setProvider('opencode'); }}><h2>OpenCode</h2><p>Custom worker runtime</p><span className="provider-state">Available</span></button>
      <article className="provider-card provider-disabled" aria-disabled="true"><span>Coming later</span><h2>Claude</h2><p>Provider adapter planned</p></article>
      <article className="provider-card provider-disabled" aria-disabled="true"><span>Coming later</span><h2>Grok</h2><p>Provider adapter planned</p></article>
    </section>
    <section className="agent-setup-workflow" aria-labelledby="agent-setup-heading">
      <div className="agent-setup-overview"><div><p className="section-kicker">Selected integration</p><h2 id="agent-setup-heading">{activeProvider.heading}</h2><p>{activeProvider.description}</p></div><span className="setup-progress" aria-label={`${String(completed.length)} of ${String(activeProvider.steps.length)} setup steps complete`}>{completed.length} / {activeProvider.steps.length} complete</span></div>
      <section className="agent-install" aria-labelledby="install-worker-heading"><div><p className="section-kicker">Install worker</p><h3 id="install-worker-heading">Download the worker for this machine</h3><p>It installs a verified, versioned Giga Desk bundle and reuses protected machine configuration automatically.</p></div><div className="agent-downloads"><a className="button-link" href={activeProvider.bashInstaller} download>Download Bash installer</a><a className="button-link button-secondary" href={activeProvider.powerShellInstaller} download>PowerShell installer</a></div></section>
      <div className="agent-workspace-body"><RepositoryMappingHelper />
      <section className="agent-readiness" aria-labelledby="agent-readiness-heading"><div className="workflow-section-heading"><div><p className="section-kicker">Readiness</p><h3 id="agent-readiness-heading">Finish the setup</h3></div><span className="setup-progress">{completed.length} of {activeProvider.steps.length}</span></div>
      <ol className="setup-steps agent-steps">{activeProvider.steps.map((step, index) => <li key={step.title}>
        <div className="row"><h3>{step.title}</h3>{step.pending && <span className="pending-badge">Requires worker support</span>}</div>
        <p>{step.detail}</p>{step.command && <pre><code>{step.command}</code></pre>}
        <label className="step-check"><input type="checkbox" checked={completed.includes(index)} disabled={step.pending} onChange={(event) => { setStep(index, event.target.checked); }} /> Step completed</label>
      </li>)}</ol></section></div>
      {provider === 'codex' && <aside className="security-note"><strong>Keep credentials private.</strong> Never paste a Codex token or Giga Desk machine secret into a Project, Work Item, command output, or source-controlled file. Authentication details follow the <a href="https://learn.chatgpt.com/docs/enterprise/service-accounts" target="_blank" rel="noreferrer">official OpenAI service-account guidance</a>.</aside>}
    </section>
  </section>;
}
