import { useState } from 'react';

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
    detail: 'On a trusted personal machine, sign in interactively. For shared automation, use a separately managed service-account access token.',
    command: 'codex login\ncodex login status',
  },
  {
    title: 'Register the execution target',
    detail: 'A Giga Desk administrator runs this on the API host. It stores machine metadata and registry IDs, never Codex credentials.',
    command: 'npm run target:codex -w @giga-desk/api -- <name> <hostname> <os> <arch> <codex-version>',
  },
  {
    title: 'Create the machine identity',
    detail: 'Create a node-scoped Giga Desk credential with only agent:jobs permission and keep its secret outside the repository.',
    pending: true,
  },
  {
    title: 'Start and verify the worker',
    detail: 'Start the Codex worker, confirm its heartbeat changes the node to Online, then assign a small test work item.',
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
  const [completed, setCompleted] = useState<readonly number[]>(loadCompleted);
  const setStep = (index: number, checked: boolean): void => {
    const next = checked ? [...new Set([...completed, index])] : completed.filter((item) => item !== index);
    setCompleted(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  return <main><p className="eyebrow">Agent integrations</p><h1>Connect a work agent</h1>
    <p>Prepare a development machine to claim work, edit a repository, run verification, and report evidence to Giga Desk.</p>
    <section className="provider-grid" aria-label="Agent providers">
      <article className="card provider-card provider-selected"><span className="badge">Setup available</span><h2>Codex</h2><p>OpenAI Codex CLI</p></article>
      <article className="card provider-card provider-disabled" aria-disabled="true"><span>Coming later</span><h2>Claude</h2><p>Provider adapter planned</p></article>
      <article className="card provider-card provider-disabled" aria-disabled="true"><span>Coming later</span><h2>Grok</h2><p>Provider adapter planned</p></article>
    </section>
    <section aria-labelledby="codex-setup"><div className="row"><div><p className="eyebrow">Codex</p><h2 id="codex-setup">Machine setup</h2></div><span>{completed.length} of {steps.length} complete</span></div>
      <p>Complete these steps on the machine that will run Codex. Pending steps are visible so the security boundary is clear.</p>
      <ol className="setup-steps">{steps.map((step, index) => <li className="card" key={step.title}>
        <div className="row"><h3>{step.title}</h3>{step.pending && <span className="pending-badge">Requires worker support</span>}</div>
        <p>{step.detail}</p>{step.command && <pre><code>{step.command}</code></pre>}
        <label className="step-check"><input type="checkbox" checked={completed.includes(index)} disabled={step.pending}
          onChange={(event) => { setStep(index, event.target.checked); }} /> Step completed</label>
      </li>)}</ol>
      <p className="security-note"><strong>Keep credentials private.</strong> Never paste a Codex token or Giga Desk machine secret into a Project, Work Item, command output, or source-controlled file.</p>
      <p>Authentication details follow the <a href="https://learn.chatgpt.com/docs/enterprise/service-accounts" target="_blank" rel="noreferrer">official OpenAI service-account guidance</a>.</p>
    </section>
  </main>;
}
