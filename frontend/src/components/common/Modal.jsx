import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col justify-end md:justify-center md:items-center md:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal / Mobile Sheet Container */}
      <div
        className={`relative w-full h-[100dvh] md:h-auto md:max-h-[90vh] flex flex-col bg-white text-left shadow-xl transition-all rounded-t-2xl md:rounded-xl overflow-hidden z-10 ${maxWidth}`}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 sm:px-6 sm:py-4 shrink-0">
          <h3 className="text-base sm:text-lg font-bold text-stone-900 font-serif truncate pr-2">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors min-h-touch min-w-[44px] flex items-center justify-center shrink-0"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 pb-safe">
          {children}
        </div>
      </div>
    </div>
  );
}
