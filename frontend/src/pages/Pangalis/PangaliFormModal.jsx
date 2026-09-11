import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '../../components/common/Modal';
import { TamilTextInput } from '../../components/common/TamilTextInput';
import { paiseToRupees } from '../../utils/money';
import { AlertCircle } from 'lucide-react';

export function PangaliFormModal({ isOpen, onClose, onSubmit, initialData = null, loading = false }) {
  const [serverError, setServerError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

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
      setFieldErrors({});
      if (initialData) {
        reset({
          familyName: initialData.familyName || '',
          houseName: initialData.houseName || '',
          phone: initialData.phone || '',
          address: initialData.address || '',
          memberCount: initialData.memberCount || 1,
          annualVariAmount: initialData.annualVariAmountPaise ? paiseToRupees(initialData.annualVariAmountPaise) : '',
          notes: initialData.notes || '',
        });
      } else {
        reset({
          familyName: '',
          houseName: '',
          phone: '',
          address: '',
          memberCount: 1,
          annualVariAmount: '',
          notes: '',
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const handleFormSubmit = async (data) => {
    setServerError('');
    setFieldErrors({});
    try {
      const formatted = {
        ...data,
        memberCount: Number(data.memberCount) || 1,
        annualVariAmount: data.annualVariAmount ? Number(data.annualVariAmount) : 0,
      };
      await onSubmit(formatted);
    } catch (err) {
      setServerError(err.message || 'Operation failed');
      if (err.details && Array.isArray(err.details)) {
        const errorMap = {};
        err.details.forEach((d) => {
          if (d.param) errorMap[d.param] = d.msg;
        });
        setFieldErrors(errorMap);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Pangali (${initialData?.pangaliCode})` : 'Add New Pangali Family'}
      maxWidth="max-w-xl"
    >
      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700 font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Single Column on mobile (< md), 2 columns on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="familyName"
            control={control}
            rules={{ required: 'Family name is required' }}
            render={({ field }) => (
              <TamilTextInput
                {...field}
                label="Family Name"
                required={true}
                placeholder="e.g. Periyaveettu / பெரியவீட்டு"
                error={errors.familyName?.message || fieldErrors.familyName}
              />
            )}
          />

          <Controller
            name="houseName"
            control={control}
            render={({ field }) => (
              <TamilTextInput
                {...field}
                label="House Name"
                placeholder="e.g. Vadakku Theru / வடக்கு தெரு"
                error={fieldErrors.houseName}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <input
              type="text"
              maxLength={10}
              inputMode="numeric"
              pattern="[0-9]*"
              {...register('phone', {
                pattern: {
                  value: /^$|^[0-9]{10}$/,
                  message: 'Must be 10 digits',
                },
              })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
              placeholder="9876543210"
            />
            {(errors.phone || fieldErrors.phone) && (
              <p className="text-xs text-rose-600 mt-1">
                {errors.phone?.message || fieldErrors.phone}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Member Count
            </label>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              {...register('memberCount', { min: 1 })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
            Annual Vari Target Amount (₹) (Optional)
          </label>
          <input
            type="number"
            step="any"
            min={0}
            inputMode="decimal"
            {...register('annualVariAmount', { min: 0 })}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            placeholder="e.g. 5000 (leave blank or 0 if none)"
          />
        </div>

        <Controller
          name="address"
          control={control}
          render={({ field }) => (
            <TamilTextInput
              {...field}
              label="Address"
              placeholder="Village street, Town, District"
              error={fieldErrors.address}
            />
          )}
        />

        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <TamilTextInput
              {...field}
              label="Notes / Details"
              multiline={true}
              rows={2}
              placeholder="Additional lineage or family notes..."
              error={fieldErrors.notes}
            />
          )}
        />

        {/* Sticky footer action buttons */}
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
            {loading ? 'Saving...' : isEdit ? 'Update Pangali' : 'Create Pangali'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
