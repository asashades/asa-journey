'use client';

import { useState, useRef } from 'react';
import { PhotoIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

interface MediaItem {
  id: string;
  fileKey: string;
  publicUrl: string;
  type: 'image' | 'audio';
  caption?: string;
}

interface ImageUploadProps {
  onUploadComplete?: (media: MediaItem) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
}

export default function ImageUpload({
  onUploadComplete,
  maxFiles = 3,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
}: ImageUploadProps) {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || !user) return;
    if (uploads.length >= maxFiles) {
      alert(`max ${maxFiles} files at a time`);
      return;
    }

    setUploading(true);
    setProgress(0);

    const validFiles = Array.from(files).filter((file) =>
      acceptedTypes.includes(file.type)
    );

    if (validFiles.length === 0) {
      alert('invalid file type. supported: jpg, png, gif, webp');
      setUploading(false);
      return;
    }

    const remaining = maxFiles - uploads.length;
    const filesToUpload = validFiles.slice(0, remaining);

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      try {
        setProgress(((i + 0.5) / filesToUpload.length) * 100);

        const response = await fetch('/api/r2/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileType: file.type.startsWith('image/') ? 'image' : 'audio',
            userId: user.uid,
          }),
        });

        if (!response.ok) {
          throw new Error('failed to get upload url');
        }

        const { uploadUrl, publicUrl, fileKey } = await response.json();

        // Upload file to R2
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('upload failed');
        }

        const mediaItem: MediaItem = {
          id: crypto.randomUUID(),
          fileKey,
          publicUrl,
          type: file.type.startsWith('image/') ? 'image' : 'audio',
        };

        setUploads((prev) => [...prev, mediaItem]);
        onUploadComplete?.(mediaItem);

        setProgress(((i + 1) / filesToUpload.length) * 100);
      } catch (error) {
        console.error('upload error:', error);
        alert(`failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    setProgress(0);
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  return (
    <div className="space-y-3">
      {/* Uploaded Files Preview */}
      {uploads.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {uploads.map((upload) => (
            <div key={upload.id} className="relative group">
              {upload.type === 'image' ? (
                <img
                  src={upload.publicUrl}
                  alt="uploaded"
                  className="w-full h-20 object-cover rounded-lg border border-[#4A4560]"
                />
              ) : (
                <div className="w-full h-20 bg-[#2F2B3A] rounded-lg border border-[#4A4560] flex items-center justify-center">
                  <span className="text-2xl">🎵</span>
                </div>
              )}
              <button
                onClick={() => removeUpload(upload.id)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-[#EF4444] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone */}
      {uploads.length < maxFiles && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-[#C049FF] bg-[#C049FF]/10'
              : 'border-[#4A4560] hover:border-[#8B8AA0]'
          }`}
        >
          {uploading ? (
            <div className="space-y-2">
              <div className="w-full h-2 bg-[#2F2B3A] rounded-full overflow-hidden">
                <div
                  className="h-full gradient-brand transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-[#8B8AA0]">uploading... {Math.round(progress)}%</p>
            </div>
          ) : (
            <div className="space-y-2">
              <PhotoIcon className="w-8 h-8 mx-auto text-[#8B8AA0]" />
              <p className="text-sm text-[#8B8AA0]">
                drop files here or click to upload
              </p>
              <p className="text-xs text-[#4A4560]">
                max {maxFiles} files ({uploads.length}/{maxFiles})
              </p>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />
    </div>
  );
}
