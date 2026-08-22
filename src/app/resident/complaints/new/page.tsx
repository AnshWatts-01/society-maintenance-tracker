"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { uploadFileDirect } from "@/lib/storage/clientUpload";
import { PhotoDropzone } from "@/components/PhotoDropzone";
import { COMPLAINT_CATEGORIES, CATEGORY_LABELS } from "@/lib/utils/constants";
import type { Complaint } from "@/types";

type Stage = "idle" | "uploading" | "saving";

const DESCRIPTION_MAX = 2000;

export default function NewComplaintPage() {
  const router = useRouter();
  const [category, setCategory] = useState<(typeof COMPLAINT_CATEGORIES)[number]>("PLUMBING");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");

  // Storage backend, decided at build time: Supabase Storage (direct-to-cloud
  // signed URLs) when configured, otherwise the zero-config first-party
  // pipeline (POST /api/photos). Residents see the same upload either way.
  const useCloudStorage = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  const submitting = stage !== "idle";
  const stageLabel = useMemo(() => {
    switch (stage) {
      case "uploading": return "Uploading photo…";
      case "saving": return "Saving complaint…";
      default: return "Submit complaint";
    }
  }, [stage]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      let photoPath: string | undefined;
      let photoId: string | undefined;

      if (file) {
        setStage("uploading");
        if (useCloudStorage) {
          const target = await apiFetch<{ uploadUrl: string; path: string }>("/api/uploads/sign-url", {
            method: "POST",
            body: JSON.stringify({ fileName: file.name, mimeType: file.type, fileSizeBytes: file.size }),
          });
          await uploadFileDirect(target.uploadUrl, file);
          photoPath = target.path;
        } else {
          const formData = new FormData();
          formData.append("file", file);
          const response = await fetch("/api/photos", { method: "POST", body: formData });
          const uploaded = await response.json();
          if (!response.ok) throw new ApiError(uploaded?.error ?? "Upload failed", response.status);
          photoId = uploaded.photoId;
        }
      }

      setStage("saving");
      const { complaint } = await apiFetch<{ complaint: Complaint }>("/api/complaints", {
        method: "POST",
        body: JSON.stringify({ category, description, photoPath, photoId }),
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
      <p className="eyebrow">New entry</p>
      <h1 className="page-title mt-1">Raise a Complaint</h1>
      <div className="title-rule" />
      <p className="page-sub">The more detail you give, the faster the admin can act on it.</p>

      <form onSubmit={handleSubmit} className="card mt-7 space-y-6 p-6 sm:p-8">
        {error && <p className="alert-error">{error}</p>}

        <div>
          <label className="label" htmlFor="category">Category</label>
          <select
            id="category"
            className="input"
            value={category}
            disabled={submitting}
            onChange={(e) => setCategory(e.target.value as (typeof COMPLAINT_CATEGORIES)[number])}
          >
            {COMPLAINT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label className="label" htmlFor="description">Description</label>
            <span className="text-xs tabular-nums text-ink-mute">
              {description.length}/{DESCRIPTION_MAX}
            </span>
          </div>
          <textarea
            id="description"
            required
            minLength={10}
            maxLength={DESCRIPTION_MAX}
            rows={5}
            className="input"
            placeholder="E.g. Kitchen tap has been leaking continuously since yesterday morning…"
            value={description}
            disabled={submitting}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Photo of the issue (optional)</label>
          <PhotoDropzone file={file} onFileChange={setFile} onError={setError} disabled={submitting} />
        </div>

        <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
          {submitting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper/40 border-t-paper" />
          )}
          {stageLabel}
        </button>
      </form>
    </div>
  );
}
