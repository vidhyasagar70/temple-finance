import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '../../components/common/Modal';
import { TamilTextInput } from '../../components/common/TamilTextInput';
import { AlertCircle } from 'lucide-react';

export function AddFestivalModal({ isOpen, onClose, onSubmit, loading, initialData = null }) {
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
          name: initialData.name || '',
          startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '',
          endDate: initialData.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '',
          year: initialData.year || new Date().getFullYear(),
          description: initialData.description || '',
          budget: initialData.budgetPaise ? initialData.budgetPaise / 100 : '',
        });
      } else {
        reset({
          name: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          year: new Date().getFullYear(),
          description: '',
          budget: '',
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const handleFormSubmit = async (data) => {
    setServerError('');
    try {
      await onSubmit({
        ...data,
        year: Number(data.year),
        budget: data.budget ? Number(data.budget) : 0,
      });
    } catch (err) {
      setServerError(err.message || 'Failed to save festival');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Festival (${initialData?.name})` : 'Create New Festival Event'}
      maxWidth="max-w-md"
    >
      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Controller
          name="name"
          control={control}
          rules={{ required: 'Festival name is required' }}
          render={({ field }) => (
            <TamilTextInput
              {...field}
              label="Festival Name"
              required={true}
              placeholder="e.g. Panguni Uthiram / பங்குனி உத்திரம்"
              error={errors.name?.message}
            />
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Start Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              {...register('startDate', { required: 'Start date is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            />
            {errors.startDate && (
              <p className="text-xs text-rose-600 mt-1">{errors.startDate.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              End Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              {...register('endDate', { required: 'End date is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            />
            {errors.endDate && (
              <p className="text-xs text-rose-600 mt-1">{errors.endDate.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Festival Year <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              inputMode="numeric"
              {...register('year', { required: 'Year is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none font-bold min-h-touch"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Sanctioned Budget (₹)
            </label>
            <input
              type="number"
              step="any"
              min={0}
              inputMode="decimal"
              {...register('budget')}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none font-bold text-stone-900 min-h-touch"
              placeholder="50000"
            />
          </div>
        </div>

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TamilTextInput
              {...field}
              label="Description"
              multiline={true}
              rows={2}
              placeholder="Details about festival rituals, annadhanam / அன்னதானம்..."
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
            {loading ? 'Saving...' : isEdit ? 'Update Festival' : 'Create Festival'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
