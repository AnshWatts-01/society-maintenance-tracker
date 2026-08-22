export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-parch px-4 py-3">
      <button
        type="button"
        className="btn-secondary"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        &larr; Previous
      </button>
      <span className="text-sm tabular-nums text-ink-mute">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="btn-secondary"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next &rarr;
      </button>
    </div>
  );
}
