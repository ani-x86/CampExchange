import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import { useUiStore } from '@/store/ui';

interface TopBarProps {
  user?: {
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
}

export const TopBar: React.FC<TopBarProps> = ({ user }) => {
  const navigate = useNavigate();
  const { toggleCommandPalette, toggleShortcutsHelp } = useUiStore();

  return (
    <header className="h-14 border-b border-line bg-bg sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-3">
      {/* Search trigger & Command Palette button */}
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <button
          type="button"
          onClick={toggleCommandPalette}
          className="w-full flex items-center justify-between h-9 px-3 bg-surface hover:bg-bg border border-line rounded-sm text-mute text-13 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-4 h-4 shrink-0 text-faint" />
            <span className="truncate">Search items, categories...</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </div>
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleShortcutsHelp}
          title="Keyboard shortcuts (?)"
          className="hidden sm:flex items-center justify-center w-8 h-8 text-mute hover:text-ink hover:bg-surface rounded-sm transition-colors cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <Button
          size="sm"
          variant="primary"
          onClick={() => navigate('/sell')}
          leftIcon={<Plus className="w-4 h-4" />}
          className="hidden sm:inline-flex"
        >
          Sell Item
        </Button>

        {user ? (
          <Link
            to="/profile"
            className="flex items-center gap-2 pl-1 pr-2 py-1 hover:bg-surface rounded-sm border border-transparent hover:border-line transition-colors"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover border border-line"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-surface border border-line text-ink font-semibold flex items-center justify-center text-12">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="hidden md:inline-block text-13 font-medium text-ink max-w-[120px] truncate">
              {user.name}
            </span>
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button size="sm" variant="ghost">
                Login
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
