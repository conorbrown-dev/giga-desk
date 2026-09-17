import { Button } from './ui/button.js';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu.js';

export function AccountMenu({ username, onSignOut }: { username: string | null; onSignOut: () => void }) {
  const accountName = username ?? 'Signed in';
  return <DropdownMenu><DropdownMenuTrigger className="account-menu-trigger" render={<Button variant="ghost" aria-label={`Open account menu for ${accountName}`} />}><span className="account-avatar" aria-hidden="true">{accountName.slice(0, 1).toUpperCase()}</span><span className="account-name" title={accountName}>{accountName}</span><span className="account-menu-indicator" aria-hidden="true">⌄</span></DropdownMenuTrigger><DropdownMenuContent align="end" className="account-menu-items"><DropdownMenuGroup><DropdownMenuLabel>{accountName}</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem disabled>Account Settings <span>Coming soon</span></DropdownMenuItem><DropdownMenuItem onClick={onSignOut}>Sign out</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent></DropdownMenu>;
}
