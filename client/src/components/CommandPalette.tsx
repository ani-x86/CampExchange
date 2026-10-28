import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COMMANDS } from '../lib/shortcuts';
import { Modal } from './ui/Modal';

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const filtered = COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <Modal isOpen={open} onClose={onClose} title="Command palette">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type a command…"
        className="w-full h-10 px-3 border border-line rounded-sm mb-3"
      />
      <ul className="space-y-1">
        {filtered.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="w-full text-left px-3 py-2 rounded-sm hover:bg-surface"
              onClick={() => {
                navigate(c.path);
                onClose();
              }}
            >
              {c.label}
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="text-mute text-sm px-3 py-2">No matches</li>}
      </ul>
    </Modal>
  );
}