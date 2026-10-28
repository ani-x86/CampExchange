import React from 'react';
import clsx from 'clsx';
import { ConversationSummary } from '@/hooks/useChat';
import { formatTimeAgo } from '@/lib/format';

export interface ConversationItemProps {
  conversation: ConversationSummary;
  isSelected?: boolean;
  onClick: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected = false,
  onClick,
}) => {
  const { otherUser, listing, lastMessage, unreadCount, lastMessageAt } = conversation;

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-full p-3 flex items-center justify-between gap-3 border-b border-line/60 transition-colors text-left cursor-pointer select-none',
        isSelected ? 'bg-surface border-l-2 border-l-accent' : 'bg-bg hover:bg-surface/50'
      )}
    >
      {/* Other User Avatar */}
      <div className="relative shrink-0">
        {otherUser.avatarUrl ? (
          <img
            src={otherUser.avatarUrl}
            alt={otherUser.name}
            className="w-10 h-10 rounded-full object-cover border border-line"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-surface border border-line text-ink font-semibold flex items-center justify-center text-13">
            {otherUser.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Middle: User Name, Item Title, Last Message */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-13 text-ink truncate">{otherUser.name}</span>
          <span className="text-[11px] text-faint shrink-0">{formatTimeAgo(lastMessageAt)}</span>
        </div>

        <p className="text-12 font-medium text-mute truncate">{listing.title}</p>

        <p
          className={clsx(
            'text-12 truncate',
            unreadCount > 0 ? 'font-semibold text-ink' : 'text-faint'
          )}
        >
          {lastMessage?.type === 'PAYMENT_PROOF'
            ? '💳 Payment Proof Submitted'
            : lastMessage?.type === 'IMAGE'
            ? '📷 Photo attachment'
            : lastMessage?.body || 'No messages yet'}
        </p>
      </div>

      {/* Right Column: Listing Thumbnail + Unread Badge */}
      <div className="flex flex-col items-end justify-between shrink-0 h-10">
        <img
          src={listing.images[0] || 'https://placehold.co/60x60'}
          alt={listing.title}
          className="w-8 h-8 rounded-sm object-cover border border-line"
        />

        {unreadCount > 0 && (
          <span className="min-w-[16px] h-4 px-1 rounded-sm bg-accent text-white font-mono text-[10px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </div>
    </button>
  );
};
