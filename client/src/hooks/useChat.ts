import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from './useAuth';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'TEXT' | 'IMAGE' | 'PAYMENT_PROOF' | 'SYSTEM';
  body?: string | null;
  imageUrl?: string | null;
  orderId?: string | null;
  createdAt: string;
  tempId?: string;
  sender?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export interface ConversationSummary {
  id: string;
  listingId: string;
  buyerId?: string;
  sellerId?: string;
  lastMessageAt: string;
  unreadCount: number;
  isBuyer: boolean;
  otherUser: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    branch?: string | null;
    year?: number | null;
    upiId?: string | null;
    upiName?: string | null;
  };
  lastMessage?: ChatMessage | null;
  listing: {
    id: string;
    title: string;
    price: number;
    images: string[];
    status: string;
    activeOrder?: {
      id: string;
      status: string;
      amount: number;
      proofUrl?: string | null;
      utr?: string | null;
    } | null;
  };
}

export const useInbox = (filter: 'all' | 'buying' | 'selling' | 'unread' = 'all') => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const inboxQuery = useQuery({
    queryKey: ['inbox', filter],
    queryFn: async () => {
      const res = await api.get<{ conversations: ConversationSummary[] }>(
        `/conversations?filter=${filter}`
      );
      return res.data.conversations;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const handleInboxUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    };

    socket.on('inbox:update', handleInboxUpdate);
    return () => {
      socket.off('inbox:update', handleInboxUpdate);
    };
  }, [user, queryClient]);

  const totalUnread =
    inboxQuery.data?.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0) || 0;

  return {
    ...inboxQuery,
    totalUnread,
  };
};

export const useMessages = (conversationId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const messagesQuery = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return { conversation: null, messages: [] };
      const res = await api.get<{
        conversation: ConversationSummary;
        messages: ChatMessage[];
      }>(`/conversations/${conversationId}/messages`);
      return res.data;
    },
    enabled: !!conversationId && !!user,
  });

  // Socket listeners for conversation room
  useEffect(() => {
    if (!conversationId || !user) return;
    const socket = getSocket();

    socket.emit('chat:join', { conversationId });

    const handleNewMessage = (msg: ChatMessage) => {
      if (msg.conversationId === conversationId) {
        queryClient.setQueryData(
          ['messages', conversationId],
          (old: { conversation: any; messages: ChatMessage[] } | undefined) => {
            if (!old) return old;
            // Check if tempId exists in current messages
            const filtered = old.messages.filter((m) => !m.tempId || m.tempId !== msg.tempId);
            return {
              ...old,
              messages: [...filtered, msg],
            };
          }
        );
        // Mark read
        socket.emit('chat:read', { conversationId });
      }
    };

    const handleTyping = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === conversationId && data.userId !== user.id) {
        setTypingUser(data.userId);
        setTimeout(() => setTypingUser(null), 2500);
      }
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:typing', handleTyping);

    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:typing', handleTyping);
    };
  }, [conversationId, user, queryClient]);

  const sendTyping = useCallback(() => {
    if (!conversationId) return;
    const socket = getSocket();
    socket.emit('chat:typing', { conversationId });
  }, [conversationId]);

  return {
    ...messagesQuery,
    typingUser,
    sendTyping,
  };
};

export const useSendMessage = (conversationId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      body,
      imageUrl,
      type = 'TEXT',
    }: {
      body?: string;
      imageUrl?: string;
      type?: 'TEXT' | 'IMAGE';
    }) => {
      if (!conversationId || !user) throw new Error('Missing conversation or user');

      const tempId = `temp_${Date.now()}`;
      const socket = getSocket();

      if (socket.connected) {
        socket.emit('chat:send', {
          conversationId,
          body,
          imageUrl,
          tempId,
        });
      } else {
        // REST fallback
        await api.post(`/conversations/${conversationId}/messages`, {
          body,
          imageUrl,
          type,
          tempId,
        });
      }

      return { tempId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
};
