import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, CheckCheck, CheckCircle2, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { ChatMessage } from '@/hooks/useChat';
import { formatTimeAgo } from '@/lib/format';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { api } from '@/lib/api';
import { useToast } from './ui/Toast';
import { useQueryClient } from '@tanstack/react-query';

export interface ChatBubbleProps {
  message: ChatMessage;
  isMe: boolean;
  isSeller: boolean;
  onImageClick?: (url: string) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isMe,
  isSeller,
  onImageClick,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isActing, setIsActing] = useState(false);

  // System Message (centered neutral pill)
  if (message.type === 'SYSTEM') {
    return (
      <div className="flex justify-center my-3">
        <span className="text-[11px] font-medium text-mute bg-surface border border-line px-3 py-1 rounded-sm text-center max-w-md">
          {message.body}
        </span>
      </div>
    );
  }

  // Handle seller confirm or reject on payment proof card
  const handleConfirmOrder = async (orderId: string) => {
    try {
      setIsActing(true);
      await api.post(`/orders/${orderId}/confirm`);
      toast({ type: 'success', title: 'Payment Confirmed', description: 'Item marked as SOLD.' });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Action failed',
        description: err.response?.data?.error?.message || 'Could not confirm payment',
      });
    } finally {
      setIsActing(false);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    const reason = window.prompt('Enter reason for rejecting this payment (e.g. money not received in bank):');
    if (!reason || reason.trim().length < 3) return;

    try {
      setIsActing(true);
      await api.post(`/orders/${orderId}/reject`, { reason });
      toast({ type: 'info', title: 'Payment Rejected', description: 'Listing returned to active.' });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Action failed',
        description: err.response?.data?.error?.message || 'Could not reject payment',
      });
    } finally {
      setIsActing(false);
    }
  };

  // Payment Proof Card Message
  if (message.type === 'PAYMENT_PROOF') {
    return (
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
        className={clsx('flex flex-col my-2 max-w-sm w-full', isMe ? 'ml-auto items-end' : 'mr-auto items-start')}
      >
        <div className="border border-line rounded-sm overflow-hidden bg-bg shadow-sm w-full text-left">
          {/* Header */}
          <div className="p-3 bg-surface border-b border-line flex items-center justify-between">
            <span className="text-12 font-semibold text-ink flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
              UPI Payment Proof
            </span>
            <Badge variant="accent">PENDING REVIEW</Badge>
          </div>

          {/* Screenshot Preview */}
          {message.imageUrl && (
            <div
              onClick={() => onImageClick?.(message.imageUrl!)}
              className="relative aspect-[4/3] bg-surface border-b border-line overflow-hidden cursor-pointer group"
            >
              <img
                src={message.imageUrl}
                alt="Payment proof screenshot"
                className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
              />
              <span className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                <ExternalLink className="w-2.5 h-2.5" /> Tap to zoom
              </span>
            </div>
          )}

          {/* Body details */}
          <div className="p-3 space-y-2">
            <p className="text-13 text-ink leading-snug">{message.body}</p>

            {/* Seller Action Buttons if viewing as seller */}
            {isSeller && message.orderId && (
              <div className="pt-2 border-t border-line/60 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  isLoading={isActing}
                  onClick={() => handleConfirmOrder(message.orderId!)}
                  className="flex-1"
                >
                  Confirm Receipt
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isActing}
                  onClick={() => handleRejectOrder(message.orderId!)}
                  className="text-danger hover:bg-red-50"
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        </div>

        <span className="text-[10px] text-mute mt-1 px-1">
          {formatTimeAgo(message.createdAt)}
        </span>
      </motion.div>
    );
  }

  // Standard Text or Image Message Bubble
  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
      className={clsx('flex flex-col my-1 max-w-[85%] sm:max-w-md', isMe ? 'ml-auto items-end' : 'mr-auto items-start')}
    >
      <div
        className={clsx(
          'p-3 rounded-sm text-13 sm:text-14 leading-relaxed text-left break-words select-text',
          isMe
            ? 'bg-accent text-white rounded-br-none'
            : 'bg-surface border border-line text-ink rounded-bl-none'
        )}
      >
        {/* Optional Image Attachment */}
        {message.imageUrl && (
          <div
            onClick={() => onImageClick?.(message.imageUrl!)}
            className="mb-2 max-w-xs rounded-sm overflow-hidden border border-black/10 cursor-pointer"
          >
            <img src={message.imageUrl} alt="Attached image" className="w-full h-auto object-cover" />
          </div>
        )}

        {message.body && <span>{message.body}</span>}
      </div>

      {/* Timestamp & read check */}
      <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-mute">
        <span>{formatTimeAgo(message.createdAt)}</span>
        {isMe && (
          <span>
            {message.tempId ? <Check className="w-3 h-3 text-faint" /> : <CheckCheck className="w-3 h-3 text-ok" />}
          </span>
        )}
      </div>
    </motion.div>
  );
};
