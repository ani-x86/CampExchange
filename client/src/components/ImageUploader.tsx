import React, { useRef, useState } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  onChange,
  maxImages = 6,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      toast({
        type: 'warn',
        title: 'Limit reached',
        description: `You can upload a maximum of ${maxImages} images.`,
      });
      return;
    }

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        toast({
          type: 'error',
          title: 'File too large',
          description: `${file.name} is larger than 5MB.`,
        });
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'listing');

      try {
        const res = await api.post<{ url: string; thumbUrl: string }>('/uploads/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedUrls.push(res.data.url);
      } catch (err: any) {
        toast({
          type: 'error',
          title: 'Upload failed',
          description: err.response?.data?.error?.message || `Failed to upload ${file.name}`,
        });
      }
    }

    if (uploadedUrls.length > 0) {
      onChange([...images, ...uploadedUrls]);
    }
    setIsUploading(false);
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, idx) => idx !== index));
  };

  return (
    <div className="w-full space-y-3 text-left">
      <div className="flex items-center justify-between">
        <label className="text-12 font-medium text-mute select-none">
          Product Images ({images.length}/{maxImages})
        </label>
        <span className="text-11 text-faint">WebP/JPG/PNG up to 5MB</span>
      </div>

      {/* Grid of uploaded images + upload dropzone */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
        {images.map((url, idx) => (
          <div
            key={url + idx}
            className="group relative aspect-[4/3] bg-surface border border-line rounded-sm overflow-hidden"
          >
            <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black text-white rounded-sm opacity-90 transition-opacity cursor-pointer"
              aria-label="Remove image"
            >
              <X className="w-3 h-3" />
            </button>
            {idx === 0 && (
              <span className="absolute bottom-1 left-1 px-1 py-0.2 bg-black/70 text-white text-[10px] font-semibold uppercase tracking-wide rounded-sm">
                Cover
              </span>
            )}
          </div>
        ))}

        {images.length < maxImages && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              'aspect-[4/3] border border-dashed rounded-sm flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-colors',
              dragOver
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-line hover:border-lineStrong hover:bg-surface text-mute'
            )}
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
            ) : (
              <>
                <UploadCloud className="w-5 h-5 mb-1 text-faint" />
                <span className="text-11 font-medium text-ink">Add Photo</span>
                <span className="text-[10px] text-faint">or drop here</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
