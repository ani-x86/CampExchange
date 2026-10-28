import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, X, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useToast } from './ui/Toast';

export interface ProofUploaderProps {
  onSubmit: (proofUrl: string, utr?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export const ProofUploader: React.FC<ProofUploaderProps> = ({ onSubmit, isSubmitting = false }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [utr, setUtr] = useState('');
  const [utrError, setUtrError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Listen for paste (Ctrl+V) anywhere on the page
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const pastedFile = items[i].getAsFile();
          if (pastedFile) {
            handleFileSelect(pastedFile);
            toast({
              type: 'info',
              title: 'Screenshot pasted',
              description: 'Image captured from clipboard.',
            });
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        type: 'error',
        title: 'File too large',
        description: 'Screenshot must be under 5MB.',
      });
      return;
    }

    setFile(selectedFile);
    const localUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(localUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const clearSelection = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        type: 'warn',
        title: 'Screenshot required',
        description: 'Please upload or paste your UPI payment screenshot.',
      });
      return;
    }

    if (utr && !/^\d{12}$/.test(utr)) {
      setUtrError('UTR / Reference number must be 12 digits');
      return;
    }
    setUtrError('');

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'proof');

      const uploadRes = await api.post<{ url: string }>('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await onSubmit(uploadRes.data.url, utr || undefined);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Submission failed',
        description: err.response?.data?.error?.message || 'Could not upload payment proof.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div>
        <label className="text-13 font-semibold text-ink flex items-center justify-between">
          <span>Upload Payment Proof</span>
          <span className="text-11 text-mute font-normal">Drag-and-drop or Paste (Ctrl+V)</span>
        </label>
        <p className="text-12 text-mute mt-0.5">
          Screenshot of the successful transfer screen from Google Pay, PhonePe, or Paytm.
        </p>
      </div>

      {previewUrl ? (
        <div className="relative border border-line rounded-sm p-2 bg-surface flex items-center gap-4">
          <div className="w-24 h-24 sm:w-28 sm:h-28 bg-bg border border-line rounded-sm overflow-hidden shrink-0">
            <img src={previewUrl} alt="Proof preview" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-13 font-semibold text-ok">
              <CheckCircle2 className="w-4 h-4" />
              <span>Screenshot ready</span>
            </div>
            <p className="text-12 text-mute truncate mt-0.5">{file?.name || 'clipboard_screenshot.png'}</p>
            <p className="text-11 text-faint">
              {file ? `${(file.size / 1024).toFixed(0)} KB` : 'Ready to submit'}
            </p>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="p-1.5 text-mute hover:text-ink hover:bg-bg rounded-sm transition-colors cursor-pointer mr-1"
            title="Remove screenshot"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-sm p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors',
            dragOver
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-line hover:border-lineStrong hover:bg-surface text-mute'
          )}
        >
          <UploadCloud className="w-8 h-8 text-faint mb-2" />
          <p className="text-13 font-medium text-ink">
            Click to upload, drag & drop, or paste with <kbd className="font-mono text-11 px-1 bg-surface border border-line rounded-sm">Ctrl+V</kbd>
          </p>
          <p className="text-12 text-faint mt-1">PNG, JPG, or WebP up to 5MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />
        </div>
      )}

      {/* UTR Reference input */}
      <Input
        label="12-Digit UPI Ref / UTR Number (optional)"
        placeholder="e.g. 429810482910"
        value={utr}
        onChange={(e) => {
          setUtr(e.target.value.trim());
          if (utrError) setUtrError('');
        }}
        error={utrError}
        hint="Helps the seller quickly locate your payment in their bank transaction history"
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isUploading || isSubmitting}
        disabled={!file}
        className="w-full"
      >
        Submit Payment Proof
      </Button>
    </form>
  );
};
