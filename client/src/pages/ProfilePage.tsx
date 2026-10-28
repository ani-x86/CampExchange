import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy, Check, QrCode, LogOut, AlertCircle, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { UpiQr } from '@/components/UpiQr';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { isValidUpiId } from '@/lib/upi';

const profileSchema = z.object({
  email: z.string().email('Enter a valid email address').max(254).optional().or(z.literal('')),
  hostel: z.string().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  upiId: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || isValidUpiId(val), {
      message: 'Invalid UPI ID format (e.g. name@okhdfcbank)',
    }),
  upiName: z.string().optional().nullable(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, isUpdatingProfile, logout } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user?.email || '',
      hostel: user?.hostel || '',
      bio: user?.bio || '',
      upiId: user?.upiId || '',
      upiName: user?.upiName || user?.name || '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        email: user.email || '',
        hostel: user.hostel || '',
        bio: user.bio || '',
        upiId: user.upiId || '',
        upiName: user.upiName || user.name || '',
      });
    }
  }, [user, reset]);

  const watchedUpiId = watch('upiId');
  const watchedUpiName = watch('upiName') || user?.name;

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile(data);
      toast({
        type: 'success',
        title: 'Profile updated',
        description: 'Your profile and payment settings have been saved.',
      });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update profile',
        description: err.response?.data?.error?.message || 'Please check your inputs.',
      });
    }
  };

  const handleCopyUpi = () => {
    if (!watchedUpiId) return;
    navigator.clipboard.writeText(watchedUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      type: 'info',
      title: 'Copied',
      description: 'UPI ID copied to clipboard.',
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-surface border border-line text-ink font-semibold flex items-center justify-center text-20 shrink-0">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-20 sm:text-24 font-semibold text-ink">{user?.name}</h1>
            <p className="text-13 text-mute font-mono">{user?.email || 'No email added'}</p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => logout()}
          leftIcon={<LogOut className="w-4 h-4 text-danger" />}
        >
          Sign out
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Personal Details Section */}
        <section className="space-y-4">
          <div>
            <h2 className="text-16 font-semibold text-ink">Personal Information</h2>
            <p className="text-13 text-mute">Student identifiers are managed by your department.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-line p-3"><p className="text-12 text-mute">Full name</p><p className="text-14 text-ink mt-1">{user?.name}</p></div>
            <div className="border border-line p-3"><p className="text-12 text-mute">PRN</p><p className="text-14 font-mono text-ink mt-1">{user?.prn}</p></div>
            <div className="border border-line p-3"><p className="text-12 text-mute">Roll number</p><p className="text-14 text-ink mt-1">{user?.rollNo}</p></div>
            <div className="border border-line p-3"><p className="text-12 text-mute">Batch</p><p className="text-14 text-ink mt-1">{user?.batch || 'Not set'}</p></div>
            <div className="border border-line p-3"><p className="text-12 text-mute">Branch</p><p className="text-14 text-ink mt-1">{user?.branch || 'AIML'}</p></div>
            <Input
              label="Email for notifications (optional)"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Hostel / Campus Residence"
              placeholder="e.g. Block B, Room 312 or Off-Campus"
              error={errors.hostel?.message}
              {...register('hostel')}
            />

          </div>

          <Textarea
            label="Bio / Notes"
            rows={3}
            placeholder="Tell fellow students what you typically sell or buy, or preferred campus meet points..."
            error={errors.bio?.message}
            {...register('bio')}
          />
        </section>

        <section className="border-t border-line pt-6">
          <h2 className="text-16 font-semibold text-ink">Password</h2>
          <p className="text-13 text-mute mt-1">Update your account password.</p>
          <Link to="/change-password" className="inline-flex mt-3 text-13 font-medium text-accent underline underline-offset-4">
            Change password
          </Link>
        </section>

        {/* Payment Settings Section */}
        <section className="space-y-4 border-t border-line pt-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-16 font-semibold text-ink">UPI Payment Settings</h2>
                <span className="text-[11px] font-medium tracking-wide uppercase px-1.5 py-0.5 bg-emerald-50 text-ok border border-emerald-200 rounded-sm">
                  Peer-to-Peer
                </span>
              </div>
              <p className="text-13 text-mute mt-0.5">
                Required for students to buy your items. Buyers scan your UPI QR and pay directly to your account.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* UPI Form Left */}
            <div className="lg:col-span-7 space-y-4">
              <Input
                label="UPI ID (VPA)"
                placeholder="yourname@okbank or number@upi"
                error={errors.upiId?.message}
                hint="Your valid UPI virtual payment address"
                rightAddon={
                  watchedUpiId ? (
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="text-mute hover:text-ink p-1 cursor-pointer"
                      title="Copy UPI ID"
                    >
                      {copied ? <Check className="w-4 h-4 text-ok" /> : <Copy className="w-4 h-4" />}
                    </button>
                  ) : null
                }
                {...register('upiId')}
              />

              <Input
                label="Payee Account Name"
                placeholder="Name as registered with your UPI bank"
                error={errors.upiName?.message}
                hint="Shows on the buyer's payment confirmation screen"
                {...register('upiName')}
              />

              <div className="p-3 bg-surface border border-line rounded-sm space-y-1.5 text-12 text-mute">
                <div className="flex items-center gap-1.5 font-medium text-ink">
                  <Shield className="w-3.5 h-3.5 text-accent" />
                  <span>How Camp-Exchange Payments Work</span>
                </div>
                <p>
                  1. Buyers scan this dynamic QR in Google Pay, PhonePe, or Paytm.
                </p>
                <p>
                  2. They transfer the exact amount and upload the screenshot proof.
                </p>
                <p>
                  3. You manually verify the money in your bank app before confirming the sale.
                </p>
              </div>
            </div>

            {/* Live QR Preview Right */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-5 bg-surface border border-line rounded-sm text-center">
              <p className="text-12 font-medium uppercase tracking-wider text-mute mb-3">Live QR Preview</p>

              {watchedUpiId && isValidUpiId(watchedUpiId) ? (
                <div className="space-y-3 flex flex-col items-center">
                  <UpiQr
                    pa={watchedUpiId}
                    pn={watchedUpiName || 'CampExchange Seller'}
                    size={160}
                  />
                  <div className="text-center">
                    <p className="text-13 font-mono font-medium text-ink">{watchedUpiId}</p>
                    <p className="text-12 text-mute">{watchedUpiName || 'Payee'}</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setTestModalOpen(true)}
                    leftIcon={<QrCode className="w-3.5 h-3.5" />}
                  >
                    Test QR Code
                  </Button>
                </div>
              ) : (
                <div className="py-8 px-4 text-center">
                  <AlertCircle className="w-8 h-8 text-faint mx-auto mb-2" />
                  <p className="text-13 font-medium text-mute">Enter a valid UPI ID</p>
                  <p className="text-12 text-faint mt-1">Live QR will be generated automatically</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Save CTA */}
        <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isUpdatingProfile}
            disabled={!isDirty}
          >
            Save Changes
          </Button>
        </div>
      </form>

      {/* Test QR Modal */}
      <Modal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        title="Test UPI QR Code"
        description="Scan this QR code with any UPI app on your phone to verify your UPI ID and Payee Name."
      >
        <div className="flex flex-col items-center space-y-4 py-2">
          {watchedUpiId && (
            <UpiQr
              pa={watchedUpiId}
              pn={watchedUpiName || 'CampExchange Seller'}
              size={220}
            />
          )}
          <div className="text-center space-y-1">
            <p className="text-14 font-mono font-semibold text-ink">{watchedUpiId}</p>
            <p className="text-13 text-mute">Payee: {watchedUpiName}</p>
            <p className="text-12 text-ok pt-1">
              ✓ Generated strictly from standard upi://pay URI
            </p>
          </div>
          <Button variant="secondary" onClick={() => setTestModalOpen(false)} className="w-full">
            Done
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ProfilePage;
