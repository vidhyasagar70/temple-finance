import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '../../components/common/Modal';
import { TamilTextInput } from '../../components/common/TamilTextInput';
import { paiseToRupees } from '../../utils/money';
import { AlertCircle } from 'lucide-react';

export function AddSirpiExpenseModal({ isOpen, onClose, onSubmit, loading, initialData = null }) {
  const [serverError, setServerError] = useState('');
  const isEdit = Boolean(initialData);

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
      if (initialData) {
        reset({
          date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          paidThrough: initialData.paidThrough || '',
          receivedBy: initialData.receivedBy || '',
          amount: initialData.amountPaise ? paiseToRupees(initialData.amountPaise) : '',
          paymentMethod: initialData.paymentMethod || 'CASH',
          notes: initialData.notes || '',
        });
      } else {
        reset({
          date: new Date().toISOString().split('T')[0],
          paidThrough: '',
          receivedBy: '',
          amount: '',
          paymentMethod: 'CASH',
          notes: '',
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const handleFormSubmit = async (data) => {
    setServerError('');
    try {
      await onSubmit({
        date: data.date,
        paidThrough: data.paidThrough,
        receivedBy: data.receivedBy,
        amount: Number(data.amount),
        paymentMethod: data.paymentMethod || 'CASH',
        notes: data.notes || undefined,
      });
    } catch (err) {
      setServerError(err.message || `Failed to ${isEdit ? 'update' : 'record'} Sirpi expense`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit Sculpture / Sirpi Expense" : "Record Sculpture / Sirpi Expense"} maxWidth="max-w-lg">
      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              {...register('date', { required: 'Date is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-touch"
            />
            {errors.date && <p className="text-xs text-rose-600 mt-1">{errors.date.message}</p>}
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
                min: { value: 1, message: 'Must be > 0' },
              })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-touch"
              placeholder="e.g. 10000"
            />
            {errors.amount && <p className="text-xs text-rose-600 mt-1">{errors.amount.message}</p>}
          </div>
        </div>

        <Controller
          name="paidThrough"
          control={control}
          rules={{ required: 'Paid through (வசமிருந்தவர்) is required' }}
          render={({ field }) => (
            <TamilTextInput
              {...field}
              label="Paid Through / வசமிருந்தவர்"
              required={true}
              placeholder="e.g. D. முத்துராமன் வசம்"
              error={errors.paidThrough?.message}
            />
          )}
        />

        <Controller
          name="receivedBy"
          control={control}
          rules={{ required: 'Received by (பெற்றவர்) is required' }}
          render={({ field }) => (
            <TamilTextInput
              {...field}
              label="Received By / சிற்பி / பெற்றவர்"
              required={true}
              placeholder="e.g. து. முத்துராமன்"
              error={errors.receivedBy?.message}
            />
          )}
        />

        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
            Payment Method
          </label>
          <select
            {...register('paymentMethod')}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium min-h-touch"
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
              label="Notes / Description"
              multiline={true}
              rows={2}
              placeholder="Sculpture work stage payment..."
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
            className="flex-1 md:flex-initial px-5 py-2.5 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-50 min-h-touch shadow-sm"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Sirpi Expense' : 'Add Sirpi Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
