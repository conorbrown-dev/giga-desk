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
    detail: 'A Giga Desk administrator runs this on the API host. With no arguments, it detects the hostname, operating system, architecture, and installed Codex CLI version, then stores machine metadata and registry IDs without storing credentials. Supply all five original fields only when you need to override the detected values.',
    command: 'npm run target:codex -w @giga-desk/api --',
  },
  {
    title: 'Create the machine identity',
    detail: 'Ask an administrator for a node-scoped OIDC client with only agent:jobs permission. Store its values outside the repository as GIGA_DESK_AGENT_NODE_ID and the three GIGA_DESK_AGENT_OIDC_* settings.',
    command: 'install -d -m 700 ~/.config/giga-desk\n$EDITOR ~/.config/giga-desk/agent.env\nchmod 600 ~/.config/giga-desk/agent.env\nset -a; . ~/.config/giga-desk/agent.env; set +a',
  },
  {
    title: 'Start and verify the worker',
    detail: 'From the Giga Desk checkout, install the included systemd user service. It loads the agent.env and worker.env files from Step 4, runs the Codex worker, and restarts it if it exits. Configure GIGA_DESK_WORKER_REPOSITORIES with each project repository URL and its local checkout path; the worker will only edit those approved checkouts. Then enable and start the service, confirm the node changes to Online in Giga Desk, and assign a small test work item.',
    command: 'mkdir -p ~/.config/systemd/user\ncp ops/giga-desk-codex-worker.service ~/.config/systemd/user/\nsystemctl --user daemon-reload\nsystemctl --user enable --now giga-desk-codex-worker.service\nsystemctl --user status giga-desk-codex-worker.service\njournalctl --user -u giga-desk-codex-worker.service -f',
    pending: true,
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
    {provider === 'opencode' ? <section className="card" aria-labelledby="opencode-setup"><p className="eyebrow">OpenCode</p><h2 id="opencode-setup">Register a named OpenCode agent</h2><p>Run this after installing OpenCode. Replace <code>MIRIAM</code> with any agent name you want users to see when assigning work, and use a provider/model identifier configured in OpenCode.</p><pre><code>npm run target:opencode -w @giga-desk/api -- MIRIAM MIRIAM miriam.local Linux x64 1.18.26 openai/gpt-5</code></pre><p>Set <code>GIGA_DESK_WORKER_AGENT_TYPE=OpenCode</code> on that worker. Its project checkout map remains separate from the Giga Desk product repository.</p></section> : <section aria-labelledby="codex-setup"><div className="row"><div><p className="eyebrow">Codex</p><h2 id="codex-setup">Machine setup</h2></div><span>{completed.length} of {steps.length} complete</span></div>
      <p>Complete these steps on the machine that will run Codex. The final step stays locked until the real worker is installed.</p>
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
