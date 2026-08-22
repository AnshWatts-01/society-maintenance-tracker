"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ALLOWED_PHOTO_MIME_TYPES, MAX_PHOTO_SIZE_BYTES } from "@/lib/utils/constants";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

/**
 * Downscales large camera photos on-device (canvas → JPEG) before upload:
 * a 6 MB phone photo typically leaves here at ~300 KB, which keeps uploads
 * fast on society Wi-Fi and storage small. Falls back to the original file
 * when decoding fails (rare formats), letting the server's own validation
 * be the final gate.
 */
async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 700 * 1024) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PhotoDropzone({
  file,
  onFileChange,
  onError,
  disabled = false,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  onError: (message: string | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const acceptFile = useCallback(
    async (selected: File | undefined) => {
      onError(null);
      if (!selected) return;

      if (!ALLOWED_PHOTO_MIME_TYPES.includes(selected.type as (typeof ALLOWED_PHOTO_MIME_TYPES)[number])) {
        onError("Only JPEG, PNG, or WebP photos are accepted.");
        return;
      }
      if (selected.size > MAX_PHOTO_SIZE_BYTES * 4) {
        onError("That photo is too large even before compression. Please pick one under 20 MB.");
        return;
      }

      setProcessing(true);
      const prepared = await compressImage(selected);
      setProcessing(false);

      if (prepared.size > MAX_PHOTO_SIZE_BYTES) {
        onError(`Photo must be smaller than ${MAX_PHOTO_SIZE_BYTES / (1024 * 1024)} MB after compression.`);
        return;
      }
      onFileChange(prepared);
    },
    [onError, onFileChange]
  );

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    void acceptFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    void acceptFile(event.dataTransfer.files?.[0]);
  }

  if (file && previewUrl) {
    return (
      <div className="card flex items-center gap-4 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="Photo preview"
          className="h-20 w-20 shrink-0 rounded-lg border border-parch object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{file.name}</p>
          <p className="mt-0.5 text-xs text-ink-mute">{formatSize(file.size)} · ready to upload</p>
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0"
          onClick={() => onFileChange(null)}
          disabled={disabled}
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600 ${
        isDragging
          ? "border-gold-600 bg-gold-300/20"
          : "border-parch bg-paper hover:border-gold-500 hover:bg-gold-300/10"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <span className="flex h-10 w-10 rotate-45 items-center justify-center rounded-lg border border-gold-500 bg-white">
        <svg className="-rotate-45" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M9 12V3m0 0L5.5 6.5M9 3l3.5 3.5M3 12.5v1A1.5 1.5 0 0 0 4.5 15h9a1.5 1.5 0 0 0 1.5-1.5v-1"
            stroke="#8F6E2E"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-sm font-medium text-ink">
        {processing ? "Preparing photo…" : "Drag a photo here, or tap to browse"}
      </span>
      <span className="text-xs text-ink-mute">JPEG, PNG, or WebP · large photos are compressed automatically</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
      />
    </button>
  );
}
