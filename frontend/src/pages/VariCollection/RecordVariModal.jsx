import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '../../components/common/Modal';
import { TamilTextInput } from '../../components/common/TamilTextInput';
import { pangaliApi } from '../../api/pangaliApi';
import { AlertCircle } from 'lucide-react';

export function RecordVariModal({ isOpen, onClose, onSubmit, loading, initialPangaliId = '', initialAmount = null }) {
  const [pangalis, setPangalis] = useState([]);
  const [serverError, setServerError] = useState('');

  const currentYear = new Date().getFullYear();
  const defaultFY = `${currentYear}-${currentYear + 1}`;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (isOpen) {
      setServerError('');
      reset({
        pangaliId: initialPangaliId || '',
        financialYear: defaultFY,
        amount: initialAmount !== null ? initialAmount : 15000,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'CASH',
        notes: '',
      });
      pangaliApi
        .getPangalis({ isActive: 'true', limit: 500 })
        .then((res) => {
          if (res.success) setPangalis(res.data || []);
        })
        .catch(() => {});
    }
  }, [isOpen, reset, defaultFY]);

  const handleFormSubmit = async (data) => {
    setServerError('');
    try {
      await onSubmit({
        ...data,
        amount: Number(data.amount),
      });
    } catch (err) {
      setServerError(err.message || 'Failed to record Vari payment');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Pangali Vari Payment" maxWidth="max-w-md">
      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
            Pangali Family <span className="text-rose-500">*</span>
          </label>
          <select
            {...register('pangaliId', { required: 'Please select a Pangali family' })}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
          >
            <option value="">-- Select Pangali --</option>
            {pangalis.map((p) => (
              <option key={p._id} value={p._id}>
                {p.pangaliCode} — {p.familyName} ({p.houseName || 'Village'})
              </option>
            ))}
          </select>
          {errors.pangaliId && (
            <p className="text-xs text-rose-600 mt-1">{errors.pangaliId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Financial Year <span className="text-rose-500">*</span>
            </label>
            <select
              {...register('financialYear', { required: 'Financial year is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            >
              <option value="2024-2025">2024-2025</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              min={1}
              inputMode="decimal"
              {...register('amount', {
                required: 'Amount is required',
                min: { value: 1, message: 'Must be greater than 0' },
              })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none font-bold text-stone-900 min-h-touch"
              placeholder="5000"
            />
            {errors.amount && (
              <p className="text-xs text-rose-600 mt-1">{errors.amount.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Payment Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              {...register('paymentDate', { required: 'Date is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Payment Method <span className="text-rose-500">*</span>
            </label>
            <select
              {...register('paymentMethod', { required: 'Method is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-temple-500 focus:outline-none font-medium min-h-touch"
            >
              <option value="CASH">CASH</option>
              <option value="UPI">UPI / GPay / PhonePe</option>
              <option value="BANK">Bank Transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <TamilTextInput
              {...field}
              label="Notes / Receipt Remarks"
              placeholder="e.g. Paid during festival / திருவிழா"
            />
          )}
        />

        <div className="sticky bottom-0 bg-white border-t border-stone-200 pt-4 mt-6 flex justify-end gap-3 pb-safe">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 md:flex-initial px-4 py-2.5 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-xl hover:bg-stone-50 min-h-touch"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 md:flex-initial px-5 py-2.5 text-sm font-bold text-white bg-temple-600 rounded-xl hover:bg-temple-700 disabled:opacity-50 min-h-touch"
          >
            {loading ? 'Processing...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
