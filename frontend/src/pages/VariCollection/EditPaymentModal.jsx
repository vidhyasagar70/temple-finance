import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '../../components/common/Modal';
import { TamilTextInput } from '../../components/common/TamilTextInput';
import { paiseToRupees } from '../../utils/money';
import { AlertCircle } from 'lucide-react';

export function EditPaymentModal({ isOpen, onClose, onSubmit, payment, loading }) {
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (isOpen && payment) {
      setServerError('');
      reset({
        amount: paiseToRupees(payment.amountPaise),
        paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : '',
        paymentMethod: payment.paymentMethod || 'CASH',
        notes: payment.notes || '',
      });
    }
  }, [isOpen, payment, reset]);

  const handleFormSubmit = async (data) => {
    setServerError('');
    try {
      await onSubmit(payment._id, {
        ...data,
        amount: Number(data.amount),
      });
    } catch (err) {
      setServerError(err.message || 'Failed to update payment record');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Receipt — ${payment?.receiptNumber || ''}`}
      maxWidth="max-w-md"
    >
      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
            Pangali Family
          </label>
          <input
            type="text"
            disabled
            value={`${payment?.pangaliId?.pangaliCode || ''} — ${payment?.pangaliId?.familyName || ''}`}
            className="w-full px-3 py-2 border border-stone-200 bg-stone-100 rounded-lg text-sm font-semibold text-stone-700"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-bold text-stone-900 focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            />
            {errors.amount && <p className="text-xs text-rose-600 mt-1">{errors.amount.message}</p>}
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

        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <TamilTextInput
              {...field}
              label="Notes / Receipt Remarks"
              placeholder="e.g. Corrected amount / திருத்தப்பட்ட தொகை"
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
            {loading ? 'Saving...' : 'Update Receipt'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
