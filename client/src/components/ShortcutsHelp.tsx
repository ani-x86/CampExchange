import { SHORTCUTS } from '../lib/shortcuts';
import { Modal } from './ui/Modal';
import { Kbd } from './ui/Kbd';

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Keyboard shortcuts">
      <ul className="space-y-2">
        {SHORTCUTS.map((s) => (
          <li key={s.keys} className="flex items-center justify-between gap-4">
            <span className="text-sm">{s.description}</span>
            <Kbd>{s.keys}</Kbd>
          </li>
        ))}
      </ul>
    </Modal>
  );
}