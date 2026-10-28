import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { formatCurrency, formatTimeAgo } from '@/lib/format';
import { UpiQr } from '@/components/UpiQr';
import { ProofUploader } from '@/components/ProofUploader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';

interface OrderDetailResponse {
  order: {
    id: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
    amount: number;
    status: 'PENDING_PAYMENT' | 'PROOF_SUBMITTED' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
    proofUrl?: string | null;
    utr?: string | null;
    rejectReason?: string | null;
    createdAt: string;
    listing: {
      id: string;
      title: string;
      price: number;
      images: string[];
      category: string;
      condition: string;
    };
    seller: {
      id: string;
      name: string;
      upiId?: string | null;
      upiName?: string | null;
    };
    buyer: {
      id: string;
      name: string;
    };
  };
  payee: {
    upiId: string;
    upiName: string;
  };
  upiUri: string;
}

export const CheckoutPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const res = await api.get<OrderDetailResponse>(`/orders/${orderId}`);
      return res.data;
    },
    enabled: !!orderId,
    refetchInterval: (query) => {
      // Poll every 5s if waiting for seller
      const status = query.state.data?.order.status;
      return status === 'PROOF_SUBMITTED' || status === 'PENDING_PAYMENT' ? 5000 : false;
    },
  });

  const submitProofMutation = useMutation({
    mutationFn: async ({ proofUrl, utr }: { proofUrl: string; utr?: string }) => {
      const res = await api.post(`/orders/${orderId}/proof`, { proofUrl, utr });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast({
        type: 'success',
        title: 'Proof submitted',
        description: 'Payment screenshot sent to seller. Waiting for confirmation.',
      });
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/orders/${orderId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast({
        type: 'info',
        title: 'Order cancelled',
        description: 'The reservation has been released.',
      });
      navigate('/');
    },
  });

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-danger mx-auto" />
        <h1 className="text-18 font-semibold text-ink">Order not found</h1>
        <p className="text-13 text-mute">Could not load this payment order. It may have expired.</p>
        <Link to="/">
          <Button variant="secondary" size="sm">
            Back to Browse
          </Button>
        </Link>
      </div>
    );
  }

  const { order, payee, upiUri } = data;
  const isBuyer = user?.id === order.buyerId;

  const handleCopyUpi = () => {
    if (!payee.upiId) return;
    navigator.clipboard.writeText(payee.upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ type: 'info', title: 'Copied', description: 'UPI ID copied to clipboard.' });
  };

  const handleOpenUpiApp = () => {
    if (!upiUri) return;
    window.location.href = upiUri;
  };

  // 4-Step Timeline status mapping
  const timelineSteps = [
    { label: 'Reserved', done: true },
    {
      label: 'Proof Sent',
      done: ['PROOF_SUBMITTED', 'CONFIRMED'].includes(order.status),
      active: order.status === 'PENDING_PAYMENT',
    },
    {
      label: 'Seller Review',
      done: ['CONFIRMED'].includes(order.status),
      active: order.status === 'PROOF_SUBMITTED',
    },
    {
      label: 'Completed',
      done: order.status === 'CONFIRMED',
      error: order.status === 'REJECTED' || order.status === 'CANCELLED',
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 text-left">
      {/* Header & Order Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-20 sm:text-24 font-semibold text-ink">
              Peer-to-Peer Payment
            </h1>
            <Badge
              variant={
                order.status === 'CONFIRMED'
                  ? 'ok'
                  : order.status === 'PROOF_SUBMITTED'
                  ? 'accent'
                  : order.status === 'REJECTED' || order.status === 'CANCELLED'
                  ? 'danger'
                  : 'warn'
              }
            >
              {order.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-12 text-mute font-mono">
            Order #{order.id.slice(-8)} • Created {formatTimeAgo(order.createdAt)}
          </p>
        </div>

        <Link to={`/inbox`}>
          <Button variant="secondary" size="sm" leftIcon={<MessageSquare className="w-4 h-4" />}>
            Open Chat
          </Button>
        </Link>
      </div>

      {/* 4-Step Timeline */}
      <div className="p-4 bg-surface border border-line rounded-sm">
        <div className="grid grid-cols-4 gap-2 text-center">
          {timelineSteps.map((step, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div
                className={clsx(
                  'w-7 h-7 rounded-sm flex items-center justify-center text-12 font-bold mb-1.5 transition-colors',
                  step.done
                    ? 'bg-ok text-white'
                    : step.error
                    ? 'bg-danger text-white'
                    : step.active
                    ? 'bg-accent text-white ring-2 ring-accent-soft'
                    : 'bg-white border border-line text-mute'
                )}
              >
                {step.done ? (
                  <Check className="w-3.5 h-3.5" />
                ) : step.error ? (
                  '✕'
                ) : (
                  idx + 1
                )}
              </div>
              <span className="text-11 sm:text-12 font-medium text-ink truncate w-full">
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: QR & Payment Left, Proof Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Seller UPI & QR */}
        <div className="md:col-span-6 space-y-5">
          {/* Item Mini Card */}
          <div className="border border-line rounded-sm p-3.5 bg-bg flex items-center gap-3">
            <img
              src={order.listing.images[0] || 'https://placehold.co/100x100'}
              alt={order.listing.title}
              className="w-14 h-12 object-cover rounded-sm border border-line shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-13 font-semibold text-ink truncate">{order.listing.title}</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono text-16 font-bold text-ink">
                  {formatCurrency(order.amount)}
                </span>
                <span className="text-11 text-mute">Exact amount due</span>
              </div>
            </div>
          </div>

          {/* Dynamic UPI QR Code */}
          <div className="border border-line rounded-sm p-6 bg-surface flex flex-col items-center text-center space-y-4">
            <p className="text-12 font-semibold uppercase tracking-wider text-mute">
              Scan with Any UPI App
            </p>

            <UpiQr
              pa={payee.upiId}
              pn={payee.upiName}
              am={order.amount}
              tn={`CampExchange-${order.id.slice(-6)}`}
              size={200}
            />

            <div className="space-y-1 w-full">
              <div className="flex items-center justify-center gap-2 bg-white px-3 py-1.5 border border-line rounded-sm max-w-xs mx-auto">
                <span className="font-mono text-13 font-semibold text-ink truncate">
                  {payee.upiId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="text-mute hover:text-ink cursor-pointer p-0.5"
                  title="Copy UPI ID"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-ok" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-12 text-mute">Payee: {payee.upiName}</p>
            </div>

            {/* Mobile Deep link */}
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleOpenUpiApp}
              leftIcon={<Smartphone className="w-4 h-4 text-accent" />}
              className="w-full sm:w-auto"
            >
              Open in PhonePe / GPay / Paytm
            </Button>
          </div>

          {/* Campus Safety Warning */}
          <div className="p-3.5 bg-surface border border-line rounded-sm space-y-1.5 text-12 text-mute">
            <div className="flex items-center gap-1.5 font-medium text-ink">
              <ShieldCheck className="w-4 h-4 text-ok" />
              <span>Campus Safety Notice</span>
            </div>
            <p>
              • Meet in a public campus location (canteen, hostel lobby, or library).
            </p>
            <p>
              • Verify physical item condition before confirming final receipt.
            </p>
            <p className="text-11 text-faint">
              The app never claims to verify money. The seller manually confirms receipt in their bank app.
            </p>
          </div>

          {/* Buyer Cancel Option if Pending */}
          {isBuyer && order.status === 'PENDING_PAYMENT' && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Cancel this order and release the item?')) {
                  cancelOrderMutation.mutate();
                }
              }}
              className="text-12 text-danger hover:underline cursor-pointer block"
            >
              Cancel this reservation
            </button>
          )}
        </div>

        {/* Right Column: Status & Proof Upload */}
        <div className="md:col-span-6 space-y-5">
          {order.status === 'PENDING_PAYMENT' && (
            <div className="border border-line rounded-sm p-5 bg-bg space-y-4">
              <div className="space-y-1">
                <h2 className="text-15 font-semibold text-ink">Submit Payment Proof</h2>
                <p className="text-12 text-mute">
                  After completing the UPI payment in your banking app, upload the confirmation screenshot below.
                </p>
              </div>

              <ProofUploader
                onSubmit={async (url, utrVal) => {
                  await submitProofMutation.mutateAsync({ proofUrl: url, utr: utrVal });
                }}
                isSubmitting={submitProofMutation.isPending}
              />
            </div>
          )}

          {order.status === 'PROOF_SUBMITTED' && (
            <div className="border border-line rounded-sm p-6 bg-surface text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-accent-soft text-accent flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-16 font-semibold text-ink">Proof Submitted</h2>
                <p className="text-13 text-mute mt-1">
                  Your payment screenshot has been sent to {payee.upiName}. They will check their bank account and confirm.
                </p>
                {order.utr && (
                  <p className="text-12 font-mono text-faint mt-1">UTR: {order.utr}</p>
                )}
              </div>

              {order.proofUrl && (
                <div className="w-40 mx-auto aspect-[4/3] bg-bg border border-line rounded-sm overflow-hidden">
                  <img src={order.proofUrl} alt="Submitted proof" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="pt-2">
                <Button variant="secondary" size="sm" onClick={() => refetch()}>
                  Check Confirmation Status
                </Button>
              </div>
            </div>
          )}

          {order.status === 'CONFIRMED' && (
            <div className="border border-emerald-200 bg-emerald-50/50 rounded-sm p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-ok flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-18 font-semibold text-ok">Payment Confirmed!</h2>
              <p className="text-13 text-ink max-w-sm mx-auto">
                The seller has confirmed receiving ₹{order.amount}. The item is now marked as SOLD.
              </p>
              <Link to="/me?tab=orders">
                <Button variant="primary" size="sm">
                  View in My Dashboard
                </Button>
              </Link>
            </div>
          )}

          {order.status === 'REJECTED' && (
            <div className="border border-red-200 bg-red-50/50 rounded-sm p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-100 text-danger flex items-center justify-center mx-auto">
                <XCircle className="w-6 h-6" />
              </div>
              <h2 className="text-18 font-semibold text-danger">Payment Rejected</h2>
              <p className="text-13 text-ink max-w-sm mx-auto">
                The seller could not verify this payment. Reason: "{order.rejectReason || 'No reason provided'}"
              </p>
              <p className="text-12 text-mute">The listing has been released back to ACTIVE.</p>
              <Link to="/">
                <Button variant="secondary" size="sm">
                  Back to Browse
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
