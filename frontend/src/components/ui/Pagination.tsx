import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Pagination as PaginationType } from '../../types';

export interface PaginationProps {
  pagination: PaginationType;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ pagination, onPageChange }) => {
  const { page, totalPages, total, limit, hasPrev, hasNext } = pagination;

  if (totalPages <= 1 && total <= limit) {
    return null;
  }

  // Generate page numbers
  const pages: number[] = [];
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 text-xs text-slate-400">
      <div>
        Showing <span className="font-medium text-slate-200">{startItem}</span> to{' '}
        <span className="font-medium text-slate-200">{endItem}</span> of{' '}
        <span className="font-medium text-slate-200">{total}</span> results
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={!hasPrev || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {startPage > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="min-w-[32px] h-8 px-2 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
            >
              1
            </button>
            {startPage > 2 && <span className="px-1 text-slate-500">...</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-medium transition-all ${
              p === page
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {p}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-1 text-slate-500">...</span>}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="min-w-[32px] h-8 px-2 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          disabled={!hasNext || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
