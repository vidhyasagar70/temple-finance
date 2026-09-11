import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '../../components/common/Modal';
import { TamilTextInput } from '../../components/common/TamilTextInput';
import { paiseToRupees } from '../../utils/money';
import { AlertCircle } from 'lucide-react';

export function EditVariRosterModal({ isOpen, onClose, onSubmit, rosterItem, loading }) {
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm();

  const currentStatus = watch('variStatus');

  useEffect(() => {
    if (isOpen && rosterItem) {
      setServerError('');
      reset({
        pangaliCode: rosterItem.pangaliCode || '',
        familyName: rosterItem.familyName || '',
        houseName: rosterItem.houseName || '',
        amountCollected: rosterItem.totalPaidPaise ? paiseToRupees(rosterItem.totalPaidPaise) : 0,
        pendingAmount: rosterItem.remainingPaise ? paiseToRupees(rosterItem.remainingPaise) : 0,
        variStatus: rosterItem.variStatus || 'PENDING',
      });
    }
  }, [isOpen, rosterItem, reset]);

  const handleFormSubmit = async (data) => {
    setServerError('');
    try {
      await onSubmit({
        pangaliCode: data.pangaliCode,
        familyName: data.familyName,
        houseName: data.houseName,
        amountCollected: Number(data.amountCollected) || 0,
        pendingAmount: data.variStatus === 'PAID' || data.variStatus === 'EXEMPTED' ? 0 : Number(data.pendingAmount) || 0,
        variStatus: data.variStatus,
      });
    } catch (err) {
      setServerError(err.message || 'Failed to update record');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Vari Collection Record (${rosterItem?.pangaliCode || ''})`}
      maxWidth="max-w-xl"
    >
      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Pangali Code & Family Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Pangali Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...register('pangaliCode', { required: 'Pangali Code is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-touch"
              placeholder="e.g. PNG-0001"
            />
            {errors.pangaliCode && <p className="text-xs text-rose-600 mt-1">{errors.pangaliCode.message}</p>}
          </div>

          <Controller
            name="familyName"
            control={control}
            rules={{ required: 'Family Name is required' }}
            render={({ field }) => (
              <TamilTextInput
                {...field}
                label="Pangali Family Name"
                required={true}
                placeholder="e.g. முத்துராமன் குடும்பம்"
                error={errors.familyName?.message}
              />
            )}
          />
        </div>

        {/* House / Address */}
        <Controller
          name="houseName"
          control={control}
          render={({ field }) => (
            <TamilTextInput
              {...field}
              label="House / Address"
              placeholder="e.g. தெற்குத் தெரு / மேலத் தெரு"
            />
          )}
        />

        {/* Amount Collected & Pending Amount */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Amount Collected (₹)
            </label>
            <input
              type="number"
              step="any"
              min={0}
              inputMode="decimal"
              {...register('amountCollected', { min: 0 })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-touch"
              placeholder="e.g. 5000"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Pending Amount (₹)
            </label>
            <input
              type="number"
              step="any"
              min={0}
              inputMode="decimal"
              disabled={currentStatus === 'PAID' || currentStatus === 'EXEMPTED'}
              {...register('pendingAmount', { min: 0 })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-bold text-amber-900 focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-stone-100 disabled:opacity-60 min-h-touch"
              placeholder="e.g. 2000"
            />
          </div>
        </div>

        {/* Status selection */}
        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
            Collection Status
          </label>
          <select
            {...register('variStatus')}
            onChange={(e) => {
              const val = e.target.value;
              setValue('variStatus', val);
              if (val === 'PAID' || val === 'EXEMPTED') {
                setValue('pendingAmount', 0);
              }
            }}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white font-bold text-stone-800 focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-touch"
          >
            <option value="PAID">PAID (Fully Paid - ₹0 Pending)</option>
            <option value="PENDING">PENDING (Has Pending Balance)</option>
            <option value="EXEMPTED">EXEMPTED (Excused / Waived)</option>
          </select>
        </div>

        {/* Action Buttons */}
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
            {loading ? 'Saving...' : 'Update Record'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
