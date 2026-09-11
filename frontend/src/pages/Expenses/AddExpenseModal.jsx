import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '../../components/common/Modal';
import { TamilTextInput } from '../../components/common/TamilTextInput';
import { festivalApi } from '../../api/festivalApi';
import { paiseToRupees } from '../../utils/money';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

const DEFAULT_CATEGORIES = [
  'Pooja & Rituals',
  'Music & Sound',
  'Flowers & Garlands',
  'Provisions',
  'Electrical & Lighting',
  'Civil & Construction',
  'Decorations',
  'Annadhanam',
  'Priest Dakshinai',
  'Transportation',
  'Cleaning & Sanitation',
  'Miscellaneous',
];

export function AddExpenseModal({ isOpen, onClose, onSubmit, loading, initialData = null }) {
  const [festivals, setFestivals] = useState([]);
  const [customCategory, setCustomCategory] = useState('');
  const [serverError, setServerError] = useState('');
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  const isEdit = Boolean(initialData);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm();

  const selectedCategory = watch('category');

  useEffect(() => {
    if (isOpen) {
      setServerError('');
      setCustomCategory('');
      setShowOptionalFields(false);

      if (initialData) {
        const isCustomCat = initialData.category && !DEFAULT_CATEGORIES.includes(initialData.category);
        if (isCustomCat) {
          setCustomCategory(initialData.category);
          setShowOptionalFields(true);
        } else if (initialData.category || initialData.festivalId || initialData.billNumber || initialData.notes) {
          setShowOptionalFields(true);
        }

        reset({
          date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          amount: initialData.amountPaise ? paiseToRupees(initialData.amountPaise) : '',
          particularsTamil: initialData.descriptionTamil || initialData.description || '',
          descriptionEnglish: initialData.descriptionEnglish || initialData.description || '',
          eventOrOccasion: initialData.eventOrOccasion || '',
          category: isCustomCat ? 'CUSTOM' : (initialData.category || ''),
          paidTo: initialData.paidTo || '',
          paymentMethod: initialData.paymentMethod || 'CASH',
          festivalId: initialData.festivalId?._id || initialData.festivalId || '',
          billNumber: initialData.billNumber || '',
          notes: initialData.notes || '',
        });
      } else {
        reset({
          date: new Date().toISOString().split('T')[0],
          amount: '',
          particularsTamil: '',
          descriptionEnglish: '',
          eventOrOccasion: '',
          category: '',
          paidTo: '',
          paymentMethod: 'CASH',
          festivalId: '',
          billNumber: '',
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
  }, [isOpen, initialData, reset]);

  const handleFormSubmit = async (data) => {
    setServerError('');
    try {
      const finalCategory = data.category === 'CUSTOM' ? customCategory : data.category;
      const descEng = data.descriptionEnglish || '';
      const descTam = data.particularsTamil || '';
      const mainDesc = descEng || descTam || 'Expense';

      await onSubmit({
        date: data.date,
        amount: Number(data.amount),
        description: mainDesc,
        descriptionTamil: descTam,
        descriptionEnglish: descEng,
        eventOrOccasion: data.eventOrOccasion || undefined,
        category: finalCategory || undefined,
        paidTo: data.paidTo || 'Not recorded',
        paymentMethod: data.paymentMethod || 'CASH',
        festivalId: data.festivalId || undefined,
        billNumber: data.billNumber || undefined,
        notes: data.notes || undefined,
      });
    } catch (err) {
      setServerError(err.message || `Failed to ${isEdit ? 'update' : 'record'} expense`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Temple Expense Record' : 'Record New Expense'} maxWidth="max-w-lg">
      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Date & Amount */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Expense Date <span className="text-rose-500">*</span>
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
              placeholder="e.g. 7500"
            />
            {errors.amount && <p className="text-xs text-rose-600 mt-1">{errors.amount.message}</p>}
          </div>
        </div>

        {/* Descriptions (Tamil & English) */}
        <Controller
          name="particularsTamil"
          control={control}
          rules={{
            validate: (value, formValues) =>
              Boolean(value || formValues.descriptionEnglish) || 'Please provide at least a Tamil or English description',
          }}
          render={({ field }) => (
            <TamilTextInput
              {...field}
              label="Particulars / Description (Tamil)"
              placeholder="e.g. பூஜை சாமான் / நையாண்டி மேளம்"
              error={errors.particularsTamil?.message}
            />
          )}
        />

        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
            Description (English)
          </label>
          <input
            type="text"
            {...register('descriptionEnglish')}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-touch"
            placeholder="e.g. Pooja Items / Naiyandi Melam (Band)"
          />
        </div>

        {/* Event or Occasion */}
        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
            Event / Occasion Label (Optional)
          </label>
          <input
            type="text"
            {...register('eventOrOccasion')}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-touch"
            placeholder="e.g. Kumbabishekam preparation / மாசி கிளரி செலவு"
          />
        </div>

        {/* Payment Method */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Paid To (Optional)
            </label>
            <input
              type="text"
              {...register('paidTo')}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-touch"
              placeholder="e.g. Vendor name or leave blank"
            />
          </div>
        </div>

        {/* Expandable Optional Details */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowOptionalFields(!showOptionalFields)}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 focus:outline-none"
          >
            {showOptionalFields ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showOptionalFields ? 'Hide Category & Extra Options' : '+ Show Optional Category & Extra Details'}
          </button>
        </div>

        {showOptionalFields && (
          <div className="space-y-4 pt-2 border-t border-stone-100 bg-stone-50/50 p-3 rounded-xl">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Category (Optional)
              </label>
              <select
                {...register('category')}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium min-h-touch"
              >
                <option value="">-- No Category --</option>
                {DEFAULT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="CUSTOM">+ Add Custom Category</option>
              </select>
            </div>

            {selectedCategory === 'CUSTOM' && (
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Custom Category Name
                </label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-touch"
                  placeholder="e.g. Sound System Rental"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Festival (Optional Link)
                </label>
                <select
                  {...register('festivalId')}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-touch"
                >
                  <option value="">-- General Expense --</option>
                  {festivals.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.name} ({f.year})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Bill / Voucher No.
                </label>
                <input
                  type="text"
                  {...register('billNumber')}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-touch"
                  placeholder="e.g. INV-1082"
                />
              </div>
            </div>

            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TamilTextInput
                  {...field}
                  label="Notes / Committee Remarks"
                  multiline={true}
                  rows={2}
                  placeholder="Approved by committee..."
                />
              )}
            />
          </div>
        )}

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
            {loading ? 'Saving...' : isEdit ? 'Update Expense' : 'Add Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
