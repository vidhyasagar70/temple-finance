import { useState } from 'react';
import { formatINR } from '../../utils/money';
import { StatusBadge } from '../../components/common/StatusBadge';
import { X, Calendar, AlertCircle, Ban, Edit3 } from 'lucide-react';
import { expenseApi } from '../../api/expenseApi';

export function DateExpenseDetailsModal({ dateGroup, isOpen, onClose, isAdmin, isCommitteeOrAdmin, onExpenseCancelled, onEditExpense }) {
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  if (!isOpen || !dateGroup) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleCancelExpense = async (id) => {
    if (!cancelReason.trim()) {
      setCancelError('Please provide a reason for cancellation');
      return;
    }
    setCancelLoading(true);
    setCancelError('');
    try {
      const res = await expenseApi.cancelExpense(id, cancelReason);
      if (res.success) {
        setCancellingId(null);
        setCancelReason('');
        if (onExpenseCancelled) onExpenseCancelled();
      } else {
        setCancelError(res.message || 'Failed to cancel expense');
      }
    } catch (err) {
      setCancelError(err.message || 'An error occurred during cancellation');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{formatDate(dateGroup.date)}</h2>
              <p className="text-xs text-slate-400 font-mono">{dateGroup.date}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400 block">Day Total</span>
              <span className="text-base font-bold text-amber-400">{formatINR(dateGroup.totalAmountPaise)}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-header info bar */}
        <div className="bg-amber-50/50 border-b border-amber-100/60 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
          <span>Showing <strong className="font-semibold">{dateGroup.items?.length || 0} line items</strong> recorded on this date</span>
          <span className="font-medium text-slate-500">Kumbabishekam & Renovation Expenses</span>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cancelError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{cancelError}</span>
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Particulars / Description</th>
                  <th className="px-4 py-3">Event / Occasion</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  {(isCommitteeOrAdmin || isAdmin) && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {dateGroup.items && dateGroup.items.map((item, idx) => (
                  <tr key={item._id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {item.descriptionTamil || item.description || '—'}
                      </div>
                      {item.descriptionEnglish && item.descriptionEnglish !== item.descriptionTamil && (
                        <div className="text-xs text-slate-500 mt-0.5">{item.descriptionEnglish}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.eventOrOccasion ? (
                        <span className="inline-block px-2.5 py-1 bg-amber-100/70 text-amber-800 text-xs font-medium rounded-full">
                          {item.eventOrOccasion}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.category ? (
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded">
                          {item.category}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatINR(item.amountPaise)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div>{item.paymentMethod || 'CASH'}</div>
                      {item.paidTo && item.paidTo !== 'Not recorded' && (
                        <div className="text-slate-400 text-[11px]">Paid to: {item.paidTo}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    {(isCommitteeOrAdmin || isAdmin) && (
                      <td className="px-4 py-3 text-right">
                        {item.status === 'ACTIVE' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                if (onEditExpense) onEditExpense(item);
                              }}
                              className="text-xs text-slate-700 hover:text-slate-900 font-medium hover:underline inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setCancellingId(item._id);
                                  setCancelReason('');
                                  setCancelError('');
                                }}
                                className="text-xs text-red-600 hover:text-red-800 font-medium hover:underline inline-flex items-center gap-1 bg-red-50 px-2 py-1 rounded"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                Cancel
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cancellation sub-form */}
          {cancellingId && (
            <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl space-y-3">
              <h4 className="text-sm font-semibold text-red-900 flex items-center gap-2">
                <Ban className="w-4 h-4" />
                Confirm Cancel Expense Item
              </h4>
              <input
                type="text"
                placeholder="Enter cancellation reason..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setCancellingId(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => handleCancelExpense(cancellingId)}
                  disabled={cancelLoading}
                  className="px-4 py-1.5 text-xs bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Total for date: <strong className="text-slate-800 font-bold">{formatINR(dateGroup.totalAmountPaise)}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
