import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.pages <= 1) return null;

  const { page, pages, total, limit } = pagination;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-stone-200 sm:px-6">
      <div>
        <p className="text-xs sm:text-sm text-stone-700 font-medium">
          Showing <span className="font-semibold text-stone-900">{start}</span> to{' '}
          <span className="font-semibold text-stone-900">{end}</span> of{' '}
          <span className="font-semibold text-stone-900">{total}</span> results
        </p>
      </div>
      <div>
        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-stone-300 bg-white text-xs sm:text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-touch"
            aria-label="Previous Page"
          >
            <ChevronLeft className="h-4 w-4 mr-0.5" />
            <span>Prev</span>
          </button>
          <span className="relative inline-flex items-center px-3 py-2 border border-stone-300 bg-stone-50 text-xs sm:text-sm font-bold text-stone-800">
            {page} / {pages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
            className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-stone-300 bg-white text-xs sm:text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-touch"
            aria-label="Next Page"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4 ml-0.5" />
          </button>
        </nav>
      </div>
    </div>
  );
}
