export function AccountMenu({ username, onSignOut }: { username: string | null; onSignOut: () => void }) {
  const accountName = username ?? 'Signed in';
  return <details className="account-menu"><summary role="button" aria-label={`Open account menu for ${accountName}`}><span className="account-avatar" aria-hidden="true">{accountName.slice(0, 1).toUpperCase()}</span><span className="account-name" title={accountName}>{accountName}</span><span className="account-menu-indicator" aria-hidden="true">⌄</span></summary><div className="account-menu-items"><button type="button" disabled>Account Settings <span>Coming soon</span></button><button type="button" onClick={onSignOut}>Sign out</button></div></details>;
}
