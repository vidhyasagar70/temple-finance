import React, { useState, useEffect } from 'react';
import { Filter, X, RotateCcw, Check, Download, FileSpreadsheet } from 'lucide-react';

export function MobileFilterSheet({
  activeFilterCount = 0,
  onClearFilters,
  onApplyFilters,
  onExportCSV,
  onExportXLSX,
  exporting = false,
  children,
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleApply = () => {
    if (onApplyFilters) onApplyFilters();
    setIsOpen(false);
  };

  const handleClear = () => {
    if (onClearFilters) onClearFilters();
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Filter Trigger Button (< md) */}
      <div className="md:hidden flex items-center gap-2 w-full">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl text-xs font-bold text-stone-800 transition-colors min-h-touch"
        >
          <Filter className="w-4 h-4 text-stone-600" />
          <span>Filter Records</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 px-2 py-0.5 text-[10px] font-extrabold bg-temple-600 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Desktop Filter View (>= md) */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-4 w-full">
        {children}
      </div>

      {/* Mobile Filter Sheet Modal (< md) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Sheet */}
          <div className="relative z-10 w-full h-[90dvh] bg-white rounded-t-2xl flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white shrink-0">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-temple-700" />
                <h3 className="font-serif font-bold text-lg text-stone-900">Filter & Options</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-600 rounded-lg min-h-touch min-w-[44px] flex items-center justify-center"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Controls body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-safe">
              {children}

              {/* Export Buttons embedded in Mobile Filter Panel */}
              {(onExportCSV || onExportXLSX) && (
                <div className="pt-4 border-t border-stone-200 space-y-2">
                  <p className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                    Data Export Options
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {onExportCSV && (
                      <button
                        type="button"
                        onClick={() => {
                          onExportCSV();
                          setIsOpen(false);
                        }}
                        disabled={exporting}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl transition-colors disabled:opacity-50 min-h-touch"
                      >
                        <Download className="w-4 h-4 text-stone-600" />
                        <span>CSV Export</span>
                      </button>
                    )}

                    {onExportXLSX && (
                      <button
                        type="button"
                        onClick={() => {
                          onExportXLSX();
                          setIsOpen(false);
                        }}
                        disabled={exporting}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors disabled:opacity-50 min-h-touch"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Excel Export</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 z-20 p-4 border-t border-stone-200 bg-stone-50 flex gap-3 shrink-0 pb-safe">
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-bold text-stone-700 bg-white border border-stone-300 rounded-xl hover:bg-stone-100 min-h-touch"
              >
                <RotateCcw className="w-4 h-4 text-stone-500" />
                <span>Clear All</span>
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-bold text-white bg-temple-600 rounded-xl hover:bg-temple-700 min-h-touch shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Apply Filters</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
