import { useEffect, useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { paiseToRupees } from '../../utils/money';
import { AlertCircle } from 'lucide-react';

export function EditTargetModal({ isOpen, onClose, onSubmit, pangali, loading }) {
  const [amount, setAmount] = useState(15000);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && pangali) {
      setError('');
      setAmount(pangali.annualVariAmountPaise ? paiseToRupees(pangali.annualVariAmountPaise) : 15000);
    }
  }, [isOpen, pangali]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const val = Number(amount);
    if (isNaN(val) || val < 0) {
      setError('Please enter a valid non-negative target vari amount.');
      return;
    }
    try {
      await onSubmit(pangali._id, val);
    } catch (err) {
      setError(err.message || 'Failed to update target vari');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Target Vari — ${pangali?.familyName || ''}`}
      maxWidth="max-w-md"
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
            Assigned Target Vari (₹) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            step="any"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-bold text-stone-900 focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            placeholder="15000"
          />
          <p className="text-xs text-stone-500 mt-1">
            Default festival target is ₹15,000 per family. Adjusting this will recalculate pending amount due.
          </p>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-stone-200 pt-4 mt-6 flex justify-end gap-3 pb-safe">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-xl hover:bg-stone-50 min-h-touch"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-sm font-bold text-white bg-temple-600 rounded-xl hover:bg-temple-700 disabled:opacity-50 min-h-touch"
          >
            {loading ? 'Saving...' : 'Update Target'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
