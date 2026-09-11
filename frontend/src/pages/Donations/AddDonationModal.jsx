import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '../../components/common/Modal';
import { TamilTextInput } from '../../components/common/TamilTextInput';
import { festivalApi } from '../../api/festivalApi';
import { AlertCircle } from 'lucide-react';

const PURPOSES = [
  'GENERAL_TEMPLE_FUND',
  'RENOVATION',
  'FESTIVAL',
  'ANNADHANAM',
  'POOJA',
  'CONSTRUCTION',
  'OTHER',
];

export function AddDonationModal({ isOpen, onClose, onSubmit, loading, initialData = null }) {
  const [festivals, setFestivals] = useState([]);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm();

  const donationType = watch('donationType');

  useEffect(() => {
    if (isOpen) {
      setServerError('');
      if (initialData) {
        reset({
          donorName: initialData.donorName || '',
          phone: initialData.phone || '',
          amount: initialData.amountPaise ? (initialData.amountPaise / 100) : (initialData.amount || ''),
          donationDate: initialData.donationDate ? new Date(initialData.donationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          purpose: initialData.purpose || 'GENERAL_TEMPLE_FUND',
          paymentMethod: initialData.paymentMethod || 'CASH',
          festivalId: initialData.festivalId?._id || initialData.festivalId || '',
          notes: initialData.notes || '',
        });
      } else {
        reset({
          donorName: '',
          phone: '',
          amount: '',
          donationDate: new Date().toISOString().split('T')[0],
          purpose: 'GENERAL_TEMPLE_FUND',
          paymentMethod: 'CASH',
          festivalId: '',
          notes: '',
        });
      }

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
        donationType: 'CASH',
        amount: Number(data.amount),
        festivalId: data.festivalId || undefined,
      };
      await onSubmit(payload);
    } catch (err) {
      setServerError(err.message || 'Failed to record donation');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Cash Donation" : "Record Cash Donation"} maxWidth="max-w-lg">
      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="donorName"
            control={control}
            rules={{ required: 'Donor name is required' }}
            render={({ field }) => (
              <TamilTextInput
                {...field}
                label="Donor Full Name"
                required={true}
                placeholder="e.g. Ramanathan / இராமநாதன்"
                error={errors.donorName?.message}
              />
            )}
          />

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
                pattern: { value: /^$|^[0-9]{10}$/, message: 'Must be 10 digits' },
              })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
              placeholder="9876543210"
            />
            {errors.phone && (
              <p className="text-xs text-rose-600 mt-1">{errors.phone.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Donation Amount (₹) <span className="text-rose-500">*</span>
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
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-bold text-stone-900 focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
              placeholder="1001"
            />
            {errors.amount && (
              <p className="text-xs text-rose-600 mt-1">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Payment Method <span className="text-rose-500">*</span>
            </label>
            <select
              {...register('paymentMethod', {
                required: 'Method is required',
              })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            >
              <option value="CASH">CASH</option>
              <option value="UPI">UPI</option>
              <option value="BANK">Bank Transfer</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Donation Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              {...register('donationDate', { required: 'Date is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Purpose <span className="text-rose-500">*</span>
            </label>
            <select
              {...register('purpose', { required: 'Purpose is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            >
              {PURPOSES.map((p) => (
                <option key={p} value={p}>
                  {p.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
            Linked Festival (Optional)
          </label>
          <select
            {...register('festivalId')}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
          >
            <option value="">-- General Offering --</option>
            {festivals.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name} ({f.year})
              </option>
            ))}
          </select>
        </div>

        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <TamilTextInput
              {...field}
              label="Notes / Special Instructions"
              placeholder="e.g. Offered for special pooja / சிறப்பு பூஜை"
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
            {loading ? (initialData ? 'Updating...' : 'Recording...') : (initialData ? 'Update Donation' : 'Record Donation')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
