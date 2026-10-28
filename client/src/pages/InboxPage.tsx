import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Send,
  Image as ImageIcon,
  ChevronLeft,
  ShieldAlert,
  Loader2,
  ExternalLink,
  ShoppingBag,
} from 'lucide-react';
import clsx from 'clsx';
import { useInbox, useMessages, useSendMessage } from '@/hooks/useChat';
import { ConversationItem } from '@/components/ConversationItem';
import { ChatBubble } from '@/components/ChatBubble';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/format';
import { api } from '@/lib/api';

export const InboxPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [filter, setFilter] = useState<'all' | 'buying' | 'selling' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Inbox queries
  const { data: conversations, isLoading: inboxLoading } = useInbox(filter);
  const { data: activeThread, isLoading: messagesLoading, typingUser, sendTyping } = useMessages(
    conversationId
  );
  const sendMessageMutation = useSendMessage(conversationId);

  // Auto-select first conversation on desktop if none selected in URL
  useEffect(() => {
    if (window.innerWidth >= 1024 && !conversationId && conversations && conversations.length > 0) {
      navigate(`/inbox/${conversations[0].id}`, { replace: true });
    }
  }, [conversationId, conversations, navigate]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages]);

  // Filter conversations by search keyword
  const filteredConversations = (conversations || []).filter((conv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      conv.otherUser.name.toLowerCase().includes(q) ||
      conv.listing.title.toLowerCase().includes(q)
    );
  });

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !conversationId) return;

    setInputText('');
    await sendMessageMutation.mutateAsync({ body: text, type: 'TEXT' });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ type: 'error', title: 'File too large', description: 'Photo must be under 5MB.' });
      return;
    }

    try {
      setIsUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'listing');

      const res = await api.post<{ url: string }>('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await sendMessageMutation.mutateAsync({ imageUrl: res.data.url, type: 'IMAGE' });
    } catch {
      toast({ type: 'error', title: 'Upload failed', description: 'Could not send photo.' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const quickReplies = [
    'Is this item still available?',
    'Where can we meet on campus?',
    'Can you lower the price slightly?',
    'Can I inspect it today evening?',
  ];

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'buying', label: 'Buying' },
    { id: 'selling', label: 'Selling' },
    { id: 'unread', label: 'Unread' },
  ];

  const conv = activeThread?.conversation;
  const isSeller = user?.id === conv?.sellerId;

  return (
    <div className="w-full h-[calc(100vh-56px)] flex overflow-hidden bg-bg text-ink">
      {/* 1. Left Pane: Conversations List */}
      <div
        className={clsx(
          'w-full lg:w-80 xl:w-96 border-r border-line flex flex-col shrink-0 bg-bg transition-all',
          conversationId ? 'hidden lg:flex' : 'flex'
        )}
      >
        {/* Inbox Header */}
        <div className="p-3 border-b border-line space-y-2.5">
          <h1 className="text-16 font-semibold text-ink text-left">Messages</h1>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-2.5 text-mute pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats by student or item..."
              className="w-full h-8 pl-8 pr-3 text-12 bg-surface border border-line rounded-sm focus:border-accent focus:outline-none"
            />
          </div>
          <Tabs tabs={tabs} activeTab={filter} onChange={(t) => setFilter(t as any)} />
        </div>

        {/* Conversation rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-line/40">
          {inboxLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-mute text-13">
              No conversations in this folder.
            </div>
          ) : (
            filteredConversations.map((item) => (
              <ConversationItem
                key={item.id}
                conversation={item}
                isSelected={item.id === conversationId}
                onClick={() => navigate(`/inbox/${item.id}`)}
              />
            ))
          )}
        </div>
      </div>

      {/* 2. Center Pane: Active Thread */}
      <div
        className={clsx(
          'flex-1 flex flex-col min-w-0 bg-bg h-full overflow-hidden',
          !conversationId ? 'hidden lg:flex' : 'flex'
        )}
      >
        {conversationId && conv ? (
          <>
            {/* Thread Header */}
            <div className="h-14 border-b border-line px-4 flex items-center justify-between gap-3 bg-bg shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back to List Button */}
                <button
                  type="button"
                  onClick={() => navigate('/inbox')}
                  className="lg:hidden p-1 text-mute hover:text-ink cursor-pointer"
                  aria-label="Back to conversations"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-surface border border-line flex items-center justify-center font-bold text-12 shrink-0">
                    {conv.otherUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-13 font-semibold text-ink truncate leading-tight">
                      {conv.otherUser.name}
                    </p>
                    <p className="text-11 text-mute truncate">
                      {conv.otherUser.branch || 'Campus Student'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Item Mini Card in Header */}
              <Link
                to={`/listing/${conv.listing.id}`}
                className="flex items-center gap-2.5 px-2.5 py-1 bg-surface border border-line rounded-sm hover:border-lineStrong transition-colors shrink-0 max-w-[200px] sm:max-w-xs"
              >
                <img
                  src={conv.listing.images[0] || 'https://placehold.co/60x60'}
                  alt={conv.listing.title}
                  className="w-7 h-7 rounded-sm object-cover border border-line shrink-0"
                />
                <div className="text-left min-w-0">
                  <p className="text-12 font-medium text-ink truncate">{conv.listing.title}</p>
                  <p className="font-mono text-11 font-semibold text-accent">
                    {formatCurrency(conv.listing.price)}
                  </p>
                </div>
              </Link>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-1">
              {/* Scam Warning banner inside thread */}
              <div className="mb-4 p-2.5 bg-surface border border-line rounded-sm flex items-center gap-2 text-12 text-mute justify-center">
                <ShieldAlert className="w-4 h-4 text-warn shrink-0" />
                <span>
                  Never pay money in advance before seeing the item. Always meet in person on campus.
                </span>
              </div>

              {messagesLoading ? (
                <div className="space-y-3 p-4">
                  <Skeleton className="h-10 w-48" />
                  <Skeleton className="h-10 w-64 ml-auto" />
                </div>
              ) : (
                activeThread.messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    message={msg}
                    isMe={msg.senderId === user?.id}
                    isSeller={isSeller}
                    onImageClick={(url) => setSelectedImage(url)}
                  />
                ))
              )}

              {/* Typing indicator */}
              {typingUser && (
                <div className="text-11 text-mute italic text-left pt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
                  <span>{conv.otherUser.name} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies Chips */}
            <div className="px-4 py-1.5 border-t border-line/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 bg-bg">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => {
                    setInputText(reply);
                  }}
                  className="text-11 text-mute hover:text-ink px-2 py-0.5 rounded-sm bg-surface hover:bg-line border border-line whitespace-nowrap transition-colors cursor-pointer"
                >
                  {reply}
                </button>
              ))}
            </div>

            {/* Composer Footer */}
            <div className="p-3 border-t border-line bg-bg shrink-0 flex items-end gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="p-2 text-mute hover:text-ink hover:bg-surface rounded-sm transition-colors cursor-pointer shrink-0"
                title="Attach photo"
              >
                {isUploadingImage ? (
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                ) : (
                  <ImageIcon className="w-5 h-5" />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handlePhotoUpload(e.target.files[0]);
                  }
                }}
              />

              <textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  sendTyping();
                }}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Type a message (Enter to send, Shift+Enter for new line)..."
                className="flex-1 p-2 max-h-24 min-h-[38px] text-13 bg-surface border border-line rounded-sm focus:border-accent focus:outline-none resize-none"
              />

              <Button
                size="sm"
                variant="primary"
                onClick={handleSend}
                disabled={!inputText.trim()}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Send
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <EmptyState
              icon={<ShoppingBag className="w-8 h-8" />}
              title="Select a conversation"
              description="Choose a chat from the left panel to message the buyer or seller in real-time."
            />
          </div>
        )}
      </div>

      {/* 3. Right Pane: 3-Pane Item & Order Summary (>= 1920px only) */}
      {conversationId && conv && (
        <div className="hidden 3xl:flex w-80 xl:w-96 border-l border-line flex-col shrink-0 p-5 bg-surface text-left space-y-5 overflow-y-auto">
          <h2 className="text-13 font-semibold uppercase tracking-wider text-mute">
            Item Details
          </h2>

          <div className="aspect-[4/3] w-full rounded-sm overflow-hidden border border-line bg-bg">
            <img
              src={conv.listing.images[0] || 'https://placehold.co/400x300'}
              alt={conv.listing.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-1">
            <span className="font-mono text-20 font-bold text-ink">
              {formatCurrency(conv.listing.price)}
            </span>
            <p className="text-14 font-semibold text-ink">{conv.listing.title}</p>
            <p className="text-12 text-mute">Status: {conv.listing.status}</p>
          </div>

          <Link to={`/listing/${conv.listing.id}`}>
            <Button variant="secondary" size="sm" className="w-full" leftIcon={<ExternalLink className="w-4 h-4" />}>
              Open Listing Page
            </Button>
          </Link>

          {conv.listing.activeOrder && (
            <div className="p-3 bg-bg border border-line rounded-sm space-y-2">
              <span className="text-11 font-semibold text-mute uppercase tracking-wide">
                Active Order
              </span>
              <p className="font-mono text-13 font-bold text-ink">
                Amount: {formatCurrency(conv.listing.activeOrder.amount)}
              </p>
              <p className="text-12 text-accent font-semibold">
                Status: {conv.listing.activeOrder.status}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Image Zoom Modal */}
      <Modal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        maxWidth="lg"
      >
        {selectedImage && (
          <div className="p-1">
            <img src={selectedImage} alt="Zoomed preview" className="w-full h-auto rounded-sm" />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InboxPage;
