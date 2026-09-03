import { useState } from 'react';

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
    detail: 'Run the downloaded installer. It downloads a verified, versioned worker bundle from Giga Desk, installs the systemd user service, and registers the node. The worker can come Online before project checkouts exist; add GIGA_DESK_WORKER_REPOSITORIES after cloning an approved customer repository, then rerun the installer.',
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
    detail: 'Choose the displayed agent name and default provider/model. After cloning a customer project on this node, map its repository URL to that local checkout; the worker will not claim work until a repository is mapped.',
    command: `$EDITOR ~/.config/giga-desk/worker.env
GIGA_DESK_WORKER_AGENT_TYPE=OpenCode
GIGA_DESK_WORKER_AGENT_NAME=MIRIAM
GIGA_DESK_WORKER_MODEL_IDENTIFIER=ollama/qwen3-coder-next:q4_K_M
GIGA_DESK_WORKER_REPOSITORIES=[{"url":"https://github.com/example/project.git","path":"/home/user/repos/project"}]`,
  },
  {
    title: 'Start and verify the worker',
    detail: 'Run the downloaded installer. It downloads a verified, versioned worker bundle from Giga Desk, installs the user service, and registers the node. The worker can come Online before project checkouts exist; after mapping a customer repository, rerun the installer.',
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
  const mapping = url.trim() && path.trim() ? JSON.stringify([{ url: url.trim(), path: path.trim() }]) : '[]';
  return <section className="card" aria-labelledby="repository-mapping-heading"><h3 id="repository-mapping-heading">Configure a customer repository</h3>
    <p>Repository mappings stay on the worker host. Enter the project URL exactly as it appears in Giga Desk and the local checkout path, then copy the generated setting into that host's worker configuration.</p>
    <div className="form-grid"><label>Repository URL<input value={url} onChange={(event) => { setUrl(event.target.value); }} placeholder="https://github.com/example/project.git" /></label><label>Local checkout path<input value={path} onChange={(event) => { setPath(event.target.value); }} placeholder="/home/user/repos/project" /></label></div>
    <pre><code>{`GIGA_DESK_WORKER_REPOSITORIES='${mapping}'`}</code></pre>
    <p className="form-help">After saving it in <code>~/.config/giga-desk/worker.env</code> (or the Windows worker configuration), restart or rerun the installer. The node will then be eligible for matching work.</p>
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

  return <main><p className="eyebrow">Agent integrations</p><h1>Connect a work agent</h1>
    <p>Prepare a development machine to claim work, edit a repository, run verification, and report evidence to Giga Desk.</p>
    <section className="provider-grid" aria-label="Agent providers">
      <button className={`card provider-card ${provider === 'codex' ? 'provider-selected' : ''}`} type="button" aria-pressed={provider === 'codex'} onClick={() => { setProvider('codex'); }}><span className="badge">Setup available</span><h2>Codex</h2><p>OpenAI Codex CLI</p></button>
      <button className={`card provider-card ${provider === 'opencode' ? 'provider-selected' : ''}`} type="button" aria-pressed={provider === 'opencode'} onClick={() => { setProvider('opencode'); }}><span className="badge">Setup available</span><h2>OpenCode</h2><p>Choose a custom agent name, such as MIRIAM</p></button>
      <article className="card provider-card provider-disabled" aria-disabled="true"><span>Coming later</span><h2>Claude</h2><p>Provider adapter planned</p></article>
      <article className="card provider-card provider-disabled" aria-disabled="true"><span>Coming later</span><h2>Grok</h2><p>Provider adapter planned</p></article>
    </section>
    {provider === 'opencode' ? <section aria-labelledby="opencode-setup"><div className="row"><div><p className="eyebrow">OpenCode</p><h2 id="opencode-setup">Connect an OpenCode worker</h2></div><span>{completed.length} of {openCodeSteps.length} complete</span></div>
      <p>Download the installer for the worker host. It installs a verified worker bundle from Giga Desk; no Giga Desk source checkout is needed. It reuses the protected machine configuration when present and uses MIRIAM with ollama/qwen3-coder-next:q4_K_M unless configured otherwise. The worker can register before project checkouts exist and waits safely until customer repositories are mapped. Registration happens through the authenticated API when the worker starts.</p>
      <p><a className="button-link" href="/scripts/install-opencode-worker.sh" download>Download Bash installer</a>{' '}<a className="button-link button-secondary" href="/scripts/install-opencode-worker.ps1" download>Download PowerShell installer</a></p>
      <RepositoryMappingHelper />
      <ol className="setup-steps">{openCodeSteps.map((step, index) => <li className="card" key={step.title}>
        <div className="row"><h3>{step.title}</h3>{step.pending && <span className="pending-badge">Requires worker support</span>}</div>
        <p>{step.detail}</p>{step.command && <pre><code>{step.command}</code></pre>}
        <label className="step-check"><input type="checkbox" checked={completed.includes(index)} disabled={step.pending}
          onChange={(event) => { setStep(index, event.target.checked); }} /> Step completed</label>
      </li>)}</ol></section> : <section aria-labelledby="codex-setup"><div className="row"><div><p className="eyebrow">Codex</p><h2 id="codex-setup">Machine setup</h2></div><span>{completed.length} of {steps.length} complete</span></div>
      <p>Download the installer for the worker host. It detects Codex, downloads a verified worker bundle from Giga Desk, and reuses the protected machine configuration when present. It never prompts for credentials; an administrator must supply the node-scoped OIDC configuration through the protected machine environment. The worker can register before project checkouts exist and waits safely until customer repositories are mapped. Registration happens through the authenticated API when the worker starts.</p>
      <p><a className="button-link" href="/scripts/install-codex-worker.sh" download>Download Bash installer</a>{' '}<a className="button-link button-secondary" href="/scripts/install-codex-worker.ps1" download>Download PowerShell installer</a></p>
      <RepositoryMappingHelper />
      <ol className="setup-steps">{steps.map((step, index) => <li className="card" key={step.title}>
        <div className="row"><h3>{step.title}</h3>{step.pending && <span className="pending-badge">Requires worker support</span>}</div>
        <p>{step.detail}</p>{step.command && <pre><code>{step.command}</code></pre>}
        <label className="step-check"><input type="checkbox" checked={completed.includes(index)} disabled={step.pending}
          onChange={(event) => { setStep(index, event.target.checked); }} /> Step completed</label>
      </li>)}</ol>
      <p className="security-note"><strong>Keep credentials private.</strong> Never paste a Codex token or Giga Desk machine secret into a Project, Work Item, command output, or source-controlled file.</p>
      <p>Authentication details follow the <a href="https://learn.chatgpt.com/docs/enterprise/service-accounts" target="_blank" rel="noreferrer">official OpenAI service-account guidance</a>.</p>
    </section>}
  </main>;
}
