import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pangaliApi } from '../../api/pangaliApi';
import { formatINR } from '../../utils/money';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  ArrowLeft,
  Users,
  Home,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

export function PangaliDetailPage() {
  const { id } = useParams();
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      setError('');
      try {
        const res = await pangaliApi.getPangaliSummary(id);
        if (res.success && res.data) {
          setSummaryData(res.data);
        } else {
          setError(res.message || 'Failed to load Pangali details');
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch Pangali details');
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, [id]);

  if (loading) return <LoadingSpinner size="lg" />;

  if (error || !summaryData) {
    return (
      <div className="space-y-4">
        <Link
          to="/pangalis"
          className="inline-flex items-center text-sm font-semibold text-temple-700 hover:underline"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Pangalis List
        </Link>
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-xl text-rose-700 text-sm">
          {error || 'Pangali record not found'}
        </div>
      </div>
    );
  }

  const { pangali, vari, contributions, fund } = summaryData;

  const totalExpected = vari?.totalExpectedPaise || 0;
  const totalPaid = vari?.totalPaidPaise || 0;
  const remaining = vari?.remainingPaise || 0;
  const percentagePaid = totalExpected > 0 ? Math.min(100, Math.round((totalPaid / totalExpected) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link
          to="/pangalis"
          className="inline-flex items-center text-sm font-semibold text-temple-700 hover:text-temple-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Pangalis Directory
        </Link>
      </div>

      {/* Pangali Info Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-temple-50 text-temple-700 flex items-center justify-center font-bold text-xl border border-temple-200 shadow-2xs shrink-0">
              PNG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                  {pangali.pangaliCode}
                </span>
                <StatusBadge status={pangali.isActive} type="active" />
              </div>
              <h1 className="text-2xl font-bold font-serif text-stone-900 mt-1">
                {pangali.familyName}
              </h1>
              {pangali.houseName && (
                <p className="text-sm text-stone-600 flex items-center gap-1.5 mt-0.5">
                  <Home className="w-3.5 h-3.5 text-stone-400" />
                  <span>{pangali.houseName}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Contact details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-5 text-sm">
          <div className="flex items-center gap-2 text-stone-700">
            <Phone className="w-4 h-4 text-stone-400 shrink-0" />
            <span>{pangali.phone || 'No phone recorded'}</span>
          </div>
          <div className="flex items-center gap-2 text-stone-700">
            <Users className="w-4 h-4 text-stone-400 shrink-0" />
            <span>{pangali.memberCount} Members in Family</span>
          </div>
          <div className="flex items-center gap-2 text-stone-700">
            <MapPin className="w-4 h-4 text-stone-400 shrink-0" />
            <span>{pangali.address || 'Village Address —'}</span>
          </div>
          <div className="flex items-center gap-2 text-stone-700">
            <FileText className="w-4 h-4 text-stone-400 shrink-0" />
            <span className="truncate">{pangali.notes || 'No notes'}</span>
          </div>
        </div>
      </div>

      {/* Vari Financial Summary Progress Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <h3 className="text-lg font-bold font-serif text-stone-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-temple-600" />
          <span>Annual Vari Collection Ledger</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <p className="text-xs font-semibold text-stone-500 uppercase">Annual Expected Vari</p>
            <p className="text-xl font-bold text-stone-900 mt-1">{formatINR(totalExpected)}</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
            <p className="text-xs font-semibold text-emerald-700 uppercase">Total Paid</p>
            <p className="text-xl font-bold text-emerald-800 mt-1">{formatINR(totalPaid)}</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
            <p className="text-xs font-semibold text-amber-800 uppercase">Remaining Due</p>
            <p className="text-xl font-bold text-amber-900 mt-1">{formatINR(remaining)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs font-bold text-stone-600 mb-1.5">
            <span>Payment Progress ({percentagePaid}%)</span>
            <span>
              {formatINR(totalPaid)} / {formatINR(totalExpected)}
            </span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-temple-600 h-full transition-all duration-500 rounded-full"
              style={{ width: `${percentagePaid}%` }}
            />
          </div>
        </div>
      </div>

      {/* Contributions Feed */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <h3 className="text-lg font-bold font-serif text-stone-900 mb-3">
          Special Contributions History
        </h3>
        {!contributions || contributions.length === 0 ? (
          <p className="text-sm text-stone-500 italic py-4">
            No special contributions recorded for this Pangali yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-700">
              <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Receipt No</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {contributions.map((c) => (
                  <tr key={c._id}>
                    <td className="p-3 font-medium">{c.contributionType}</td>
                    <td className="p-3">{new Date(c.date).toLocaleDateString()}</td>
                    <td className="p-3 font-mono text-xs">{c.receiptNumber || '—'}</td>
                    <td className="p-3 text-right font-bold">{formatINR(c.amountPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fund Advances Section */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <h3 className="text-lg font-bold font-serif text-stone-900 mb-3">
          Temple Fund Advances & Repayments
        </h3>
        {!fund?.advances || fund.advances.length === 0 ? (
          <p className="text-sm text-stone-500 italic py-4">
            No active fund advances recorded for this Pangali family.
          </p>
        ) : (
          <div className="space-y-4">
            {fund.advances.map((advance) => (
              <div key={advance._id} className="border border-stone-200 rounded-xl p-4 bg-stone-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-stone-900">{advance.recipientName}</h4>
                    <p className="text-xs text-stone-500">
                      Rate: {advance.interestRatePercent}% ({advance.interestType})
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-white border border-stone-200 rounded">
                    Status: {advance.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <div>
                    <span className="text-stone-500">Principal:</span>{' '}
                    <span className="font-bold">{formatINR(advance.principalPaise)}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">Outstanding:</span>{' '}
                    <span className="font-bold text-rose-700">
                      {formatINR(advance.principalOutstandingPaise)}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500">Interest Paid:</span>{' '}
                    <span className="font-bold text-emerald-700">
                      {formatINR(advance.interestPaidPaise)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
