export type Shortcut = {
  keys: string;
  description: string;
  scope?: 'global' | 'listing' | 'chat';
};

export const SHORTCUTS: Shortcut[] = [
  { keys: '/', description: 'Focus search', scope: 'global' },
  { keys: '?', description: 'Open keyboard shortcuts help', scope: 'global' },
  { keys: 'Ctrl+K', description: 'Open command palette', scope: 'global' },
  { keys: 'G D', description: 'Go to dashboard', scope: 'global' },
  { keys: 'G M', description: 'Go to my listings', scope: 'global' },
  { keys: 'G I', description: 'Go to inbox', scope: 'global' },
  { keys: 'G P', description: 'Go to profile', scope: 'global' },
  { keys: 'N', description: 'New listing', scope: 'global' },
  { keys: 'Esc', description: 'Close modal / blur', scope: 'global' },
  { keys: 'Alt+Left', description: 'Go back', scope: 'global' },
  { keys: 'J / K', description: 'Next / previous item', scope: 'listing' },
  { keys: 'Enter', description: 'Open selected item', scope: 'listing' },
  { keys: 'S', description: 'Save / unsave listing', scope: 'listing' },
  { keys: 'B', description: 'Buy / checkout', scope: 'listing' },
  { keys: 'C', description: 'Open chat', scope: 'listing' },
  { keys: 'Ctrl+Enter', description: 'Send message', scope: 'chat' },
  { keys: '[', description: 'Toggle sidebar', scope: 'global' },
];

export const COMMANDS = [
  { id: 'go-dashboard', label: 'Go to Dashboard', path: '/' },
  { id: 'go-my-listings', label: 'Go to My Listings', path: '/my' },
  { id: 'go-inbox', label: 'Go to Inbox', path: '/inbox' },
  { id: 'go-profile', label: 'Go to Profile', path: '/profile' },
  { id: 'new-listing', label: 'Create new listing', path: '/listings/new' },
];