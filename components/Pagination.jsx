import { useState } from "react";

export const PAGE_SIZE = 10;

// Slices a list into pages of PAGE_SIZE. If the list shrinks (a filter, a
// reload) the page is clamped so it never points past the end.
export function usePaged(items, size = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, pages);
  const start = (current - 1) * size;
  return {
    pageItems: items.slice(start, start + size),
    page: current,
    pages,
    total,
    start,
    size,
    setPage,
  };
}

// Renders nothing for lists that fit on one page.
export default function Pagination({ paged, className = "" }) {
  const { page, pages, total, start, size, setPage } = paged;
  if (total <= size) return null;
  const end = Math.min(start + size, total);

  const btn =
    "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:enabled:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5 ${className}`}>
      <p className="text-xs text-zinc-500">
        Showing {start + 1}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button className={btn} disabled={page <= 1} onClick={() => setPage(page - 1)}>
          ← Prev
        </button>
        <span className="text-xs font-medium text-zinc-600">
          Page {page} of {pages}
        </span>
        <button className={btn} disabled={page >= pages} onClick={() => setPage(page + 1)}>
          Next →
        </button>
      </div>
    </div>
  );
}
