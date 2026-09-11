import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div className="flex items-start gap-4 py-2">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            isDangerous ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
          }`}
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-stone-600">{message}</p>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-stone-100 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${
            isDangerous
              ? 'bg-rose-600 hover:bg-rose-700'
              : 'bg-temple-600 hover:bg-temple-700'
          }`}
        >
          {loading ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}
