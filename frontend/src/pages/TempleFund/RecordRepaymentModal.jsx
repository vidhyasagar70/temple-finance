import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '../../components/common/Modal';
import { TamilTextInput } from '../../components/common/TamilTextInput';
import { AlertCircle } from 'lucide-react';

export function RecordRepaymentModal({ isOpen, onClose, onSubmit, loading, advanceName = '' }) {
  const [serverError, setServerError] = useState('');

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
        type: 'PRINCIPAL_REPAYMENT',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'CASH',
        notes: '',
      });
    }
  }, [isOpen, reset]);

  const handleFormSubmit = async (data) => {
    setServerError('');
    try {
      await onSubmit({
        ...data,
        amount: Number(data.amount),
      });
    } catch (err) {
      setServerError(err.message || 'Failed to record repayment');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Repayment — ${advanceName}`}
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
            Repayment Type <span className="text-rose-500">*</span>
          </label>
          <select
            {...register('type', { required: 'Type is required' })}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-temple-500 focus:outline-none font-bold min-h-touch"
          >
            <option value="PRINCIPAL_REPAYMENT">PRINCIPAL REPAYMENT (Reduces Outstanding Principal)</option>
            <option value="INTEREST_PAYMENT">INTEREST PAYMENT (Recorded as Interest Income)</option>
          </select>
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
                min: { value: 1, message: 'Must be > 0' },
              })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-temple-500 focus:outline-none text-stone-900 min-h-touch"
              placeholder="5000"
            />
            {errors.amount && (
              <p className="text-xs text-rose-600 mt-1">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Repayment Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              {...register('date', { required: 'Date is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            />
          </div>
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
            <option value="UPI">UPI</option>
            <option value="BANK">Bank Transfer</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <TamilTextInput
              {...field}
              label="Notes / Receipt Remarks"
              placeholder="e.g. Monthly interest paid / வட்டி செலுத்தியது"
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
            {loading ? 'Recording...' : 'Submit Repayment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
