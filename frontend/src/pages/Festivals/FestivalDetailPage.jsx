import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { festivalApi } from '../../api/festivalApi';
import { formatINR } from '../../utils/money';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ArrowLeft, Calendar, TrendingDown, Gift } from 'lucide-react';

export function FestivalDetailPage() {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      setError('');
      try {
        const res = await festivalApi.getFestivalSummary(id);
        if (res.success && res.data) {
          setSummary(res.data);
        } else {
          setError(res.message || 'Failed to load festival summary');
        }
      } catch (err) {
        setError(err.message || 'Error fetching festival details');
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, [id]);

  if (loading) return <LoadingSpinner size="lg" />;

  if (error || !summary) {
    return (
      <div className="space-y-4">
        <Link
          to="/festivals"
          className="inline-flex items-center text-sm font-semibold text-temple-700 hover:underline min-h-touch"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Festivals List
        </Link>
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-xl text-rose-700 text-sm">
          {error || 'Festival record not found'}
        </div>
      </div>
    );
  }

  const { festival, budgetPaise, spentPaise, remainingPaise, expenses, donations } = summary;
  const isOverBudget = remainingPaise < 0;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          to="/festivals"
          className="inline-flex items-center text-sm font-semibold text-temple-700 hover:text-temple-800 min-h-touch"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Festivals Directory
        </Link>
      </div>

      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-temple-700 bg-temple-50 border border-temple-200 px-3 py-1 rounded-full">
              Year {festival.year} Festival
            </span>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-900 mt-2">{festival.name}</h1>
            <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {new Date(festival.startDate).toLocaleDateString()} —{' '}
                {new Date(festival.endDate).toLocaleDateString()}
              </span>
            </p>
          </div>
        </div>

        {festival.description && (
          <p className="text-xs sm:text-sm text-stone-600 mt-4 border-t border-stone-100 pt-3">
            {festival.description}
          </p>
        )}
      </div>

      {/* Budget vs Spent Summary Cards (reflow to single column on mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
          <p className="text-xs font-semibold text-stone-500 uppercase">Sanctioned Budget</p>
          <p className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">{formatINR(budgetPaise)}</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
          <p className="text-xs font-semibold text-rose-600 uppercase">Total Expenses Spent</p>
          <p className="text-xl sm:text-2xl font-bold text-rose-700 mt-1">{formatINR(spentPaise)}</p>
        </div>

        <div
          className={`p-4 sm:p-5 rounded-2xl border shadow-xs ${
            isOverBudget
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <p className="text-xs font-semibold uppercase">
            {isOverBudget ? 'Budget Deficit (Over Budget)' : 'Remaining Budget Surplus'}
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-1">{formatINR(remainingPaise)}</p>
        </div>
      </div>

      {/* Linked Expenses Section */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 shadow-xs">
        <h3 className="text-base sm:text-lg font-bold font-serif text-stone-900 mb-3 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-rose-600" />
          <span>Festival Expense Vouchers ({expenses.length})</span>
        </h3>

        {expenses.length === 0 ? (
          <p className="text-sm text-stone-500 italic py-4">
            No expenses linked to this festival event yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-700">
              <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                <tr>
                  <th className="p-3">Category</th>
                  <th className="p-3">Paid To</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Bill No</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {expenses.map((e) => (
                  <tr key={e._id}>
                    <td className="p-3 font-semibold text-stone-900">{e.category}</td>
                    <td className="p-3">{e.paidTo}</td>
                    <td className="p-3 text-xs">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="p-3 font-mono text-xs">{e.billNumber || '—'}</td>
                    <td className="p-3 text-right font-bold text-rose-700">
                      {formatINR(e.amountPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Linked Donations Section */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 shadow-xs">
        <h3 className="text-base sm:text-lg font-bold font-serif text-stone-900 mb-3 flex items-center gap-2">
          <Gift className="w-5 h-5 text-emerald-600" />
          <span>Festival Offerings & Donations ({donations.length})</span>
        </h3>

        {donations.length === 0 ? (
          <p className="text-sm text-stone-500 italic py-4">
            No donations specifically designated for this festival yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-700">
              <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                <tr>
                  <th className="p-3">Donor Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Details / Amount</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {donations.map((d) => (
                  <tr key={d._id}>
                    <td className="p-3 font-semibold text-stone-900">{d.donorName}</td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                          d.donationType === 'MATERIAL'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {d.donationType}
                      </span>
                    </td>
                    <td className="p-3 font-medium">
                      {d.donationType === 'CASH'
                        ? formatINR(d.amountPaise)
                        : `${d.itemDescription}${
                            d.estimatedValuePaise ? ` (Est. ${formatINR(d.estimatedValuePaise)})` : ''
                          }`}
                    </td>
                    <td className="p-3 text-xs">{new Date(d.donationDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
