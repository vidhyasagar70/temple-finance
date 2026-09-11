import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { sirpiExpenseApi } from '../../api/sirpiExpenseApi';
import { useAuth } from '../../hooks/useAuth';
import { formatINR, paiseToWords } from '../../utils/money';
import { Pagination } from '../../components/common/Pagination';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AddSirpiExpenseModal } from './AddSirpiExpenseModal';
import { MobileFilterSheet } from '../../components/common/MobileFilterSheet';
import { downloadExport } from '../../utils/exportHelper';
import { Plus, XCircle, AlertCircle, Download, FileSpreadsheet, Hammer, Calendar, Ban, Edit3 } from 'lucide-react';

export function SirpiExpensesPage() {
  const { user } = useAuth();
  const isViewer = user?.role === 'VIEWER';
  const isAdmin = user?.role === 'ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();

  const filterSearch = searchParams.get('search') || '';
  const filterMethod = searchParams.get('paymentMethod') || '';
  const filterFromDate = searchParams.get('from') || '';
  const filterToDate = searchParams.get('to') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [records, setRecords] = useState([]);
  const [grandTotalPaise, setGrandTotalPaise] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    if (key !== 'page') {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setSearchParams({});
  };

  const fetchSirpiExpenses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: currentPage,
        limit: 10,
      };
      if (filterSearch) params.search = filterSearch;
      if (filterMethod) params.paymentMethod = filterMethod;
      if (filterFromDate) params.from = filterFromDate;
      if (filterToDate) params.to = filterToDate;

      const res = await sirpiExpenseApi.getSirpiExpenses(params);
      if (res.success) {
        setRecords(res.data || []);
        setGrandTotalPaise(res.grandTotalPaise || 0);
        if (res.pagination) setPagination(res.pagination);
      } else {
        setError(res.message || 'Failed to fetch Sirpi expenses');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching Sirpi expenses');
    } finally {
      setLoading(false);
    }
  }, [filterSearch, filterMethod, filterFromDate, filterToDate, currentPage]);

  useEffect(() => {
    fetchSirpiExpenses();
  }, [fetchSirpiExpenses]);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const activeFilters = {
        ...(filterSearch && { search: filterSearch }),
        ...(filterMethod && { paymentMethod: filterMethod }),
        ...(filterFromDate && { from: filterFromDate }),
        ...(filterToDate && { to: filterToDate }),
      };
      await downloadExport('/sirpi-expenses/export', 'Sirpi_Accounts_Export', activeFilters, format);
    } catch (err) {
      alert(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveExpense = async (data) => {
    setSubmitting(true);
    try {
      if (editingRecord) {
        await sirpiExpenseApi.updateSirpiExpense(editingRecord._id, data);
      } else {
        await sirpiExpenseApi.createSirpiExpense(data);
      }
      setIsAddModalOpen(false);
      setEditingRecord(null);
      fetchSirpiExpenses();
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingId || !cancelReason) return;
    setCancelLoading(true);
    try {
      await sirpiExpenseApi.cancelSirpiExpense(cancellingId, cancelReason);
      setCancellingId(null);
      setCancelReason('');
      fetchSirpiExpenses();
    } catch (err) {
      setError(err.message || 'Failed to cancel record');
    } finally {
      setCancelLoading(false);
    }
  };

  const activeFilterCount =
    (filterSearch ? 1 : 0) +
    (filterMethod ? 1 : 0) +
    (filterFromDate ? 1 : 0) +
    (filterToDate ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-900 flex items-center gap-2">
            <Hammer className="w-6 h-6 text-amber-700" />
            <span>Sirpi Expenses (சிற்பி கணக்கு)</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Sculpture work payments, contractor advances, and sculptor (சிற்பி) ledger accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="p-2 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors border border-stone-300 disabled:opacity-50 min-h-touch min-w-[44px] flex items-center justify-center"
            title="Download CSV"
          >
            <Download className="w-4 h-4 text-stone-700" />
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            disabled={exporting}
            className="p-2 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-300 disabled:opacity-50 min-h-touch min-w-[44px] flex items-center justify-center"
            title="Download Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
          </button>

          {!isViewer && (
            <button
              onClick={() => {
                setEditingRecord(null);
                setIsAddModalOpen(true);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all min-h-touch"
            >
              <Plus className="w-4 h-4" />
              <span>Add Sirpi Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Grand Total Summary Card */}
      <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-amber-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Hammer className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 block mb-1">
              Total Sirpi Sculpture Expenses
            </span>
            <div className="text-2xl sm:text-3xl font-serif font-black text-amber-300 tracking-tight">
              {formatINR(grandTotalPaise)}
            </div>
            <p className="text-xs font-serif italic text-amber-200/90 mt-1">
              {paiseToWords(grandTotalPaise)}
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-300 bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-700">
          <div className="font-semibold text-amber-400">Deducted from Ledger Balance</div>
          <div className="text-slate-400 text-[11px]">Automatically accounted in central ledger balance</div>
        </div>
      </div>

      {/* Responsive Filter Sheet */}
      <div className="bg-white rounded-xl border border-stone-200 p-3 sm:p-4 shadow-2xs">
        <MobileFilterSheet
          activeFilterCount={activeFilterCount}
          onClearFilters={handleClearFilters}
          onExportCSV={() => handleExport('csv')}
          onExportXLSX={() => handleExport('xlsx')}
          exporting={exporting}
        >
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full">
            <input
              type="text"
              placeholder="Search paid through or received by..."
              value={filterSearch}
              onChange={(e) => updateParam('search', e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white font-medium text-stone-700 focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-touch md:w-64"
            />

            <select
              value={filterMethod}
              onChange={(e) => updateParam('paymentMethod', e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white font-medium text-stone-700 focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-touch"
            >
              <option value="">All Payment Methods</option>
              <option value="CASH">CASH</option>
              <option value="UPI">UPI</option>
              <option value="BANK">BANK</option>
            </select>

            <div className="flex items-center gap-1.5 text-xs text-stone-600">
              <span>From:</span>
              <input
                type="date"
                value={filterFromDate}
                onChange={(e) => updateParam('from', e.target.value)}
                className="px-2 py-1.5 border border-stone-300 rounded text-xs bg-white focus:outline-none min-h-touch"
              />
              <span>To:</span>
              <input
                type="date"
                value={filterToDate}
                onChange={(e) => updateParam('to', e.target.value)}
                className="px-2 py-1.5 border border-stone-300 rounded text-xs bg-white focus:outline-none min-h-touch"
              />
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="hidden md:inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 ml-2 min-h-touch"
              >
                <XCircle className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </MobileFilterSheet>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Listing View */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            No Sirpi expense records found matching the filters.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-600 uppercase tracking-wider">
                    <th className="p-4">#</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Paid Through / வசமிருந்தவர்</th>
                    <th className="p-4">Received By / பெற்றவர்</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4">Payment</th>
                    <th className="p-4 text-center">Status</th>
                    {!isViewer && <th className="p-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm text-stone-800">
                  {records.map((rec, idx) => {
                    const isCancelled = rec.status === 'CANCELLED';
                    return (
                      <tr
                        key={rec._id}
                        className={`hover:bg-stone-50/80 transition-colors ${
                          isCancelled ? 'opacity-50 line-through bg-stone-50/50' : ''
                        }`}
                      >
                        <td className="p-4 text-xs font-mono text-stone-400">{rec.sno || idx + 1}</td>
                        <td className="p-4 font-medium flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-amber-600" />
                          <span>{new Date(rec.date).toLocaleDateString('en-GB')}</span>
                        </td>
                        <td className="p-4 font-bold text-stone-900">{rec.paidThrough}</td>
                        <td className="p-4 font-semibold text-amber-900 bg-amber-50/60 rounded-lg">{rec.receivedBy}</td>
                        <td className="p-4 text-right font-serif font-black text-stone-900 text-base">
                          {formatINR(rec.amountPaise)}
                        </td>
                        <td className="p-4 text-xs font-medium text-stone-600">{rec.paymentMethod || 'CASH'}</td>
                        <td className="p-4 text-center">
                          <StatusBadge status={rec.status} type="active" />
                        </td>
                        {!isViewer && (
                          <td className="p-4 text-right">
                            {!isCancelled && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingRecord(rec);
                                    setIsAddModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded hover:bg-slate-200"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() => {
                                      setCancellingId(rec._id);
                                      setCancelReason('');
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                    <span>Cancel</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <Pagination pagination={pagination} onPageChange={(page) => updateParam('page', page.toString())} />
      </div>

      {/* Add / Edit Modal */}
      <AddSirpiExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRecord(null);
        }}
        onSubmit={handleSaveExpense}
        loading={submitting}
        initialData={editingRecord}
      />

      {/* Cancel Confirmation Dialog */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-stone-900/60" onClick={() => setCancellingId(null)} />
            <div className="relative bg-white rounded-xl max-w-sm w-full p-6 shadow-xl z-10 space-y-4">
              <h3 className="text-lg font-bold font-serif text-stone-900">Cancel Sirpi Expense Record</h3>
              <p className="text-xs text-stone-600">
                Cancelling this record will reverse its linked ledger entry.
              </p>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Reason for Cancellation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-touch"
                  placeholder="e.g. Duplicate entry or correction"
                />
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setCancellingId(null)}
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
