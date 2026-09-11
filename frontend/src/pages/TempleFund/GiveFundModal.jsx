import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '../../components/common/Modal';
import { TamilTextInput } from '../../components/common/TamilTextInput';
import { pangaliApi } from '../../api/pangaliApi';
import { AlertCircle } from 'lucide-react';

export function GiveFundModal({ isOpen, onClose, onSubmit, loading }) {
  const [pangalis, setPangalis] = useState([]);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm();

  const recipientType = watch('recipientType');

  useEffect(() => {
    if (isOpen) {
      setServerError('');
      reset({
        recipientType: 'PANGALI',
        pangaliId: '',
        recipientName: '',
        principal: '',
        interestType: 'MONTHLY',
        interestRatePercent: 12,
        startDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        purpose: '',
        notes: '',
      });

      pangaliApi
        .getPangalis({ isActive: 'true', limit: 500 })
        .then((res) => {
          if (res.success) setPangalis(res.data || []);
        })
        .catch(() => {});
    }
  }, [isOpen, reset]);

  const handleFormSubmit = async (data) => {
    setServerError('');
    try {
      let name = data.recipientName;
      if (data.recipientType === 'PANGALI') {
        const found = pangalis.find((p) => p._id === data.pangaliId);
        if (found) name = found.familyName;
      }

      await onSubmit({
        ...data,
        recipientName: name,
        principal: Number(data.principal),
        interestRatePercent: Number(data.interestRatePercent),
      });
    } catch (err) {
      setServerError(err.message || 'Failed to disburse fund advance');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Give Temple Fund Advance" maxWidth="max-w-lg">
      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
            Recipient Category <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label
              className={`flex items-center justify-center p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors min-h-touch ${
                recipientType === 'PANGALI'
                  ? 'bg-temple-50 border-temple-500 text-temple-800'
                  : 'bg-white border-stone-300 text-stone-600'
              }`}
            >
              <input
                type="radio"
                value="PANGALI"
                {...register('recipientType')}
                className="sr-only"
              />
              <span>Pangali Family</span>
            </label>
            <label
              className={`flex items-center justify-center p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors min-h-touch ${
                recipientType === 'INDIVIDUAL'
                  ? 'bg-temple-50 border-temple-500 text-temple-800'
                  : 'bg-white border-stone-300 text-stone-600'
              }`}
            >
              <input
                type="radio"
                value="INDIVIDUAL"
                {...register('recipientType')}
                className="sr-only"
              />
              <span>Individual / Other</span>
            </label>
          </div>
        </div>

        {recipientType === 'PANGALI' ? (
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Select Pangali Family <span className="text-rose-500">*</span>
            </label>
            <select
              {...register('pangaliId', { required: 'Pangali family is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-temple-500 focus:outline-none font-medium min-h-touch"
            >
              <option value="">-- Select Pangali Family --</option>
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
        ) : (
          <Controller
            name="recipientName"
            control={control}
            rules={{ required: 'Recipient name is required' }}
            render={({ field }) => (
              <TamilTextInput
                {...field}
                label="Recipient Full Name"
                required={true}
                placeholder="e.g. Murugan / முருகன்"
                error={errors.recipientName?.message}
              />
            )}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Principal Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              min={1}
              inputMode="decimal"
              {...register('principal', {
                required: 'Principal is required',
                min: { value: 1, message: 'Must be > 0' },
              })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-temple-500 focus:outline-none text-stone-900 min-h-touch"
              placeholder="50000"
            />
            {errors.principal && (
              <p className="text-xs text-rose-600 mt-1">{errors.principal.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Interest Type <span className="text-rose-500">*</span>
            </label>
            <select
              {...register('interestType', { required: 'Interest type is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-temple-500 focus:outline-none font-medium min-h-touch"
            >
              <option value="SIMPLE">SIMPLE INTEREST</option>
              <option value="MONTHLY">MONTHLY INTEREST</option>
              <option value="YEARLY">YEARLY INTEREST</option>
              <option value="CUSTOM">CUSTOM / MANUAL</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Rate (% p.a.) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              min={0}
              inputMode="decimal"
              {...register('interestRatePercent', { required: 'Rate is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none font-bold min-h-touch"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Disburse Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              {...register('startDate', { required: 'Start date is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Due Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              {...register('dueDate', { required: 'Due date is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            />
          </div>
        </div>

        <Controller
          name="purpose"
          control={control}
          render={({ field }) => (
            <TamilTextInput
              {...field}
              label="Purpose / Loan Notes"
              placeholder="e.g. Agriculture / விவசாயம் / Festival advance"
            />
          )}
        />

        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <TamilTextInput
              {...field}
              label="Additional Notes"
              multiline={true}
              rows={2}
              placeholder="Remarks or terms..."
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
            {loading ? 'Disbursing...' : 'Disburse Fund Advance'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
