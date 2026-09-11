import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fundApi } from '../../api/fundApi';
import { useAuth } from '../../hooks/useAuth';
import { formatINR } from '../../utils/money';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { RecordRepaymentModal } from './RecordRepaymentModal';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  ArrowLeft,
  Plus,
  XCircle,
  Calendar,
  Percent,
} from 'lucide-react';

export function FundDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isViewer = user?.role === 'VIEWER';
  const isAdmin = user?.role === 'ADMIN';

  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [repaySubmitting, setRepaySubmitting] = useState(false);

  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fundApi.getFundAdvance(id);
      if (res.success && res.data) {
        setDetailData(res.data);
      } else {
        setError(res.message || 'Failed to load advance detail');
      }
    } catch (err) {
      setError(err.message || 'Error fetching advance detail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  if (loading) return <LoadingSpinner size="lg" />;

  if (error || !detailData) {
    return (
      <div className="space-y-4">
        <Link
          to="/temple-fund"
          className="inline-flex items-center text-sm font-semibold text-temple-700 hover:underline min-h-touch"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Temple Fund List
        </Link>
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-xl text-rose-700 text-sm">
          {error || 'Fund advance record not found'}
        </div>
      </div>
    );
  }

  const { advance, transactions } = detailData;
  const isClosed = advance.status === 'CLOSED';
  const isCancelled = advance.status === 'CANCELLED';

  const activeRepayments = transactions.filter(
    (t) => t.type !== 'DISBURSEMENT' && t.status === 'ACTIVE'
  );
  const hasRepayments = activeRepayments.length > 0;

  const handleRecordRepayment = async (repayData) => {
    setRepaySubmitting(true);
    try {
      await fundApi.recordRepayment(id, repayData);
      setIsRepayModalOpen(false);
      loadDetail();
    } finally {
      setRepaySubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason) return;
    setCancelLoading(true);
    try {
      await fundApi.cancelFundAdvance(id, cancelReason);
      setCancelling(false);
      setCancelReason('');
      loadDetail();
    } catch (err) {
      setError(err.message || 'Failed to cancel fund advance');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          to="/temple-fund"
          className="inline-flex items-center text-sm font-semibold text-temple-700 hover:text-temple-800 min-h-touch"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Temple Fund Directory
        </Link>
      </div>

      {/* Advance Master Info */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-temple-700 bg-temple-50 border border-temple-200 px-3 py-1 rounded-full">
                {advance.recipientType}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-stone-100 text-stone-700 border-stone-200">
                Status: {advance.status}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-900 mt-2">
              {advance.recipientName}
            </h1>
            {advance.purpose && (
              <p className="text-xs sm:text-sm text-stone-600 mt-1">Purpose: {advance.purpose}</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {!isViewer && !isClosed && !isCancelled && (
              <button
                onClick={() => setIsRepayModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-temple-600 hover:bg-temple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all min-h-touch"
              >
                <Plus className="w-4 h-4" />
                <span>Record Repayment</span>
              </button>
            )}

            {isAdmin && !isCancelled && (
              <div className="relative group">
                <button
                  disabled={hasRepayments}
                  onClick={() => setCancelling(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-3 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed min-h-touch"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel Advance</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Financial Stat Grid (reflows to single col on mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <span className="text-xs font-semibold text-stone-500 uppercase">Original Principal</span>
            <p className="text-lg sm:text-xl font-bold text-stone-900 mt-1">
              {formatINR(advance.principalPaise)}
            </p>
          </div>

          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
            <span className="text-xs font-semibold text-amber-800 uppercase">Outstanding Principal</span>
            <p className="text-lg sm:text-xl font-bold text-amber-900 mt-1">
              {formatINR(advance.principalOutstandingPaise)}
            </p>
          </div>

          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
            <span className="text-xs font-semibold text-emerald-700 uppercase">Total Interest Paid</span>
            <p className="text-lg sm:text-xl font-bold text-emerald-800 mt-1">
              {formatINR(advance.interestPaidPaise)}
            </p>
          </div>

          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <span className="text-xs font-semibold text-stone-500 uppercase">Interest Terms</span>
            <p className="text-sm font-bold text-stone-800 mt-1.5 flex items-center gap-1">
              <Percent className="w-4 h-4 text-temple-600" />
              <span>
                {advance.interestRatePercent}% ({advance.interestType})
              </span>
            </p>
          </div>
        </div>

        {/* Dates */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 mt-4 pt-3 border-t border-stone-100 text-xs text-stone-600">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span>Disbursed: {new Date(advance.startDate).toLocaleDateString()}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span>Due Date: {new Date(advance.dueDate).toLocaleDateString()}</span>
          </span>
        </div>
      </div>

      {/* Transaction Timeline */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 shadow-xs">
        <h3 className="text-base sm:text-lg font-bold font-serif text-stone-900 mb-3">
          Chronological Transaction Timeline
        </h3>

        {transactions.length === 0 ? (
          <p className="text-sm text-stone-500 italic py-4">No transactions recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-600 uppercase tracking-wider">
                  <th className="p-3">Date</th>
                  <th className="p-3">Transaction Event</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Receipt No</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {transactions.map((txn) => {
                  const isDisbursement = txn.type === 'DISBURSEMENT';
                  const isPrincipalRepay = txn.type === 'PRINCIPAL_REPAYMENT';

                  return (
                    <tr key={txn._id} className="hover:bg-stone-50/80">
                      <td className="p-3 font-medium text-xs">
                        {new Date(txn.date).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            isDisbursement
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : isPrincipalRepay
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-purple-50 text-purple-800 border-purple-200'
                          }`}
                        >
                          {txn.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td
                        className={`p-3 text-right font-bold ${
                          isDisbursement ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {formatINR(txn.amountPaise)}
                      </td>
                      <td className="p-3 text-xs font-medium">{txn.paymentMethod}</td>
                      <td className="p-3 font-mono text-xs text-stone-600">
                        {txn.receiptNumber || '—'}
                      </td>
                      <td className="p-3 text-center">
                        <StatusBadge status={txn.status} type="active" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Repayment Modal */}
      <RecordRepaymentModal
        isOpen={isRepayModalOpen}
        onClose={() => setIsRepayModalOpen(false)}
        onSubmit={handleRecordRepayment}
        loading={repaySubmitting}
        advanceName={advance.recipientName}
      />

      {/* Cancel Dialog */}
      {cancelling && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-stone-900/60" onClick={() => setCancelling(false)} />
            <div className="relative bg-white rounded-xl max-w-sm w-full p-6 shadow-xl z-10 space-y-4">
              <h3 className="text-lg font-bold font-serif text-stone-900">Cancel Fund Advance</h3>
              <p className="text-xs text-stone-600">
                This will soft-cancel the advance disbursement and its linked ledger entry.
              </p>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Reason for Cancellation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
                  placeholder="e.g. Erroneously issued record"
                />
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setCancelling(false)}
                  disabled={cancelLoading}
                  className="px-3 py-2 text-xs font-medium text-stone-700 border border-stone-300 rounded-lg hover:bg-stone-50 min-h-touch"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={!cancelReason || cancelLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 min-h-touch"
                >
                  {cancelLoading ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
