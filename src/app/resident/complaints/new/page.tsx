"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { uploadFileDirect } from "@/lib/storage/clientUpload";
import { COMPLAINT_CATEGORIES, CATEGORY_LABELS, MAX_PHOTO_SIZE_BYTES, ALLOWED_PHOTO_MIME_TYPES } from "@/lib/utils/constants";
import type { Complaint } from "@/types";

type Stage = "idle" | "requesting-url" | "uploading" | "saving";

export default function NewComplaintPage() {
  const router = useRouter();
  const [category, setCategory] = useState<(typeof COMPLAINT_CATEGORIES)[number]>("PLUMBING");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");

  // NEXT_PUBLIC_ vars are inlined at build time, so this is the same signal
  // the server uses to decide whether uploads are available. Hiding the
  // field beats offering it and failing at submit time.
  const photoUploadsEnabled = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const submitting = stage !== "idle";
  const stageLabel = useMemo(() => {
    switch (stage) {
      case "requesting-url": return "Preparing upload…";
      case "uploading": return "Uploading photo…";
      case "saving": return "Saving complaint…";
      default: return "Submit Complaint";
    }
  }, [stage]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const selected = event.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!ALLOWED_PHOTO_MIME_TYPES.includes(selected.type as (typeof ALLOWED_PHOTO_MIME_TYPES)[number])) {
      setError("Only JPEG, PNG, or WebP photos are allowed.");
      event.target.value = "";
      return;
    }
    if (selected.size > MAX_PHOTO_SIZE_BYTES) {
      setError(`Photo must be smaller than ${MAX_PHOTO_SIZE_BYTES / (1024 * 1024)} MB.`);
      event.target.value = "";
      return;
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      let photoPath: string | undefined;

      if (file) {
        setStage("requesting-url");
        const target = await apiFetch<{ uploadUrl: string; path: string; publicUrl: string }>(
          "/api/uploads/sign-url",
          {
            method: "POST",
            body: JSON.stringify({ fileName: file.name, mimeType: file.type, fileSizeBytes: file.size }),
          }
        );

        setStage("uploading");
        await uploadFileDirect(target.uploadUrl, file);
        // Only the path is sent on; the server derives the display URL.
        photoPath = target.path;
      }

      setStage("saving");
      const { complaint } = await apiFetch<{ complaint: Complaint }>("/api/complaints", {
        method: "POST",
        body: JSON.stringify({ category, description, photoPath }),
      });

      router.push(`/resident/complaints/${complaint.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setStage("idle");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Raise a Complaint</h1>
      <p className="mt-1 text-sm text-slate-500">Give as much detail as you can — it helps admin prioritize.</p>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-5 p-6">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div>
          <label className="label" htmlFor="category">Category</label>
          <select
            id="category"
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value as (typeof COMPLAINT_CATEGORIES)[number])}
          >
            {COMPLAINT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea
            id="description"
            required
            minLength={10}
            maxLength={2000}
            rows={5}
            className="input"
            placeholder="E.g. Kitchen tap has been leaking continuously since yesterday morning…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {photoUploadsEnabled && (
          <div>
            <label className="label" htmlFor="photo">Photo (optional)</label>
            <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="text-sm" />
            <p className="mt-1 text-xs text-slate-400">JPEG, PNG, or WebP · up to 5 MB</p>
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Selected preview" className="mt-3 h-40 w-40 rounded-lg object-cover" />
            )}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {stageLabel}
        </button>
      </form>
    </div>
  );
}
