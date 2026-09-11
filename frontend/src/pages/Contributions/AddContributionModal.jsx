import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '../../components/common/Modal';
import { TamilTextInput } from '../../components/common/TamilTextInput';
import { pangaliApi } from '../../api/pangaliApi';
import { festivalApi } from '../../api/festivalApi';
import { paiseToRupees } from '../../utils/money';
import { AlertCircle } from 'lucide-react';

const COMMON_TYPES = [
  'பொருட்கள் உதவி (Material / Service Offering)',
  'அன்னதான நன்கொடை (Annadhanam Contribution)',
  'Special Poojai Offering',
  'Festival Ubayam',
  'Lighting / Deepam',
  'Garland / Flower Offering',
  'Building Maintenance',
  'Youth Contribution',
  'General Contribution',
];

export function AddContributionModal({ isOpen, onClose, onSubmit, loading, initialData = null }) {
  const [pangalis, setPangalis] = useState([]);
  const [festivals, setFestivals] = useState([]);
  const [serverError, setServerError] = useState('');

  const isEdit = Boolean(initialData);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm();

  const personType = watch('personType');

  useEffect(() => {
    if (isOpen) {
      setServerError('');
      if (initialData) {
        reset({
          personType: initialData.personType || 'OTHER',
          pangaliId: initialData.pangaliId?._id || initialData.pangaliId || '',
          personName: initialData.personName || '',
          contributionType: initialData.contributionType || 'General Contribution',
          amount:
            initialData.amountPaise !== undefined && initialData.amountPaise > 0
              ? paiseToRupees(initialData.amountPaise)
              : '',
          date: initialData.date
            ? new Date(initialData.date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          paymentMethod: initialData.paymentMethod || 'CASH',
          festivalId: initialData.festivalId?._id || initialData.festivalId || '',
          notes: initialData.notes || '',
          details: initialData.details || '',
          place: initialData.place || '',
        });
      } else {
        reset({
          personType: 'OTHER',
          pangaliId: '',
          personName: '',
          contributionType: 'பொருட்கள் உதவி (Material / Service Offering)',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'CASH',
          festivalId: '',
          notes: '',
          details: '',
          place: '',
        });
      }

      pangaliApi
        .getPangalis({ limit: 500, isActive: 'true' })
        .then((res) => {
          if (res.success) setPangalis(res.data || []);
        })
        .catch(() => {});

      festivalApi
        .getFestivals({ limit: 100 })
        .then((res) => {
          if (res.success) setFestivals(res.data || []);
        })
        .catch(() => {});
    }
  }, [isOpen, reset, initialData]);

  const handleFormSubmit = async (data) => {
    setServerError('');
    try {
      const payload = {
        ...data,
        amount: data.amount && !isNaN(Number(data.amount)) ? Number(data.amount) : 0,
        pangaliId: data.personType === 'PANGALI' ? data.pangaliId : undefined,
        personName: data.personType === 'OTHER' ? data.personName : undefined,
        festivalId: data.festivalId || undefined,
      };
      await onSubmit(payload);
    } catch (err) {
      setServerError(err.message || 'Failed to record contribution');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Contribution / Offering' : 'Record Contribution / Special Offering'}
      maxWidth="max-w-2xl"
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
            Contributor Type <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label
              className={`flex items-center justify-center p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors min-h-touch ${
                personType === 'PANGALI'
                  ? 'bg-amber-50 border-amber-500 text-amber-900'
                  : 'bg-white border-stone-300 text-stone-600'
              }`}
            >
              <input type="radio" value="PANGALI" {...register('personType')} className="sr-only" />
              <span>Pangali Member</span>
            </label>
            <label
              className={`flex items-center justify-center p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors min-h-touch ${
                personType === 'OTHER'
                  ? 'bg-purple-50 border-purple-500 text-purple-900'
                  : 'bg-white border-stone-300 text-stone-600'
              }`}
            >
              <input type="radio" value="OTHER" {...register('personType')} className="sr-only" />
              <span>Non-Pangali / Devotee</span>
            </label>
          </div>
        </div>

        {personType === 'PANGALI' ? (
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Select Pangali <span className="text-rose-500">*</span>
            </label>
            <select
              {...register('pangaliId', {
                required: personType === 'PANGALI' ? 'Please select a Pangali' : false,
              })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            >
              <option value="">-- Choose Pangali --</option>
              {pangalis.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.familyName} ({p.pangaliCode}) {p.phone ? `- ${p.phone}` : ''}
                </option>
              ))}
            </select>
            {errors.pangaliId && (
              <p className="text-xs text-rose-600 mt-1">{errors.pangaliId.message}</p>
            )}
          </div>
        ) : (
          <Controller
            name="personName"
            control={control}
            rules={{ required: personType === 'OTHER' ? 'Contributor name is required' : false }}
            render={({ field }) => (
              <TamilTextInput
                {...field}
                label="Contributor Name"
                required={true}
                placeholder="e.g. Sundaram / சுந்தரம்"
                error={errors.personName?.message}
              />
            )}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Contribution Type <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              list="contribution-types-list"
              {...register('contributionType', { required: 'Contribution type is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
              placeholder="e.g. Annadhanam Contribution"
            />
            <datalist id="contribution-types-list">
              {COMMON_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            {errors.contributionType && (
              <p className="text-xs text-rose-600 mt-1">{errors.contributionType.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Amount (₹) <span className="text-stone-400 font-normal">(leave empty for in-kind/material)</span>
            </label>
            <input
              type="number"
              step="any"
              min={0}
              inputMode="decimal"
              {...register('amount')}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-bold text-stone-900 focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
              placeholder="500 or leave empty"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              {...register('date', { required: 'Date is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            />
            {errors.date && (
              <p className="text-xs text-rose-600 mt-1">{errors.date.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Payment Method
            </label>
            <select
              {...register('paymentMethod')}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            >
              <option value="CASH">CASH</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Linked Festival
            </label>
            <select
              {...register('festivalId')}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            >
              <option value="">-- General / Non-Festival --</option>
              {festivals.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name} ({f.year})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="place"
            control={control}
            render={({ field }) => (
              <TamilTextInput
                {...field}
                label="Place / Location"
                placeholder="e.g. S. Perumalpatti / மதுரை"
              />
            )}
          />

          <Controller
            name="details"
            control={control}
            render={({ field }) => (
              <TamilTextInput
                {...field}
                label="What they gave / Details"
                multiline={false}
                placeholder="e.g. Rice 50kg, Garland, Lamps, etc."
              />
            )}
          />
        </div>

        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <TamilTextInput
              {...field}
              label="Notes / Additional Details"
              multiline={true}
              rows={2}
              placeholder="Extra notes about the offering..."
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
            {loading ? 'Saving...' : isEdit ? 'Update Contribution' : 'Record Contribution'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
