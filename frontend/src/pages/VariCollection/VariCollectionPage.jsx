import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { variApi } from '../../api/variApi';
import { pangaliApi } from '../../api/pangaliApi';
import { useAuth } from '../../hooks/useAuth';
import { formatINR, paiseToRupees } from '../../utils/money';
import { StatCard } from '../../components/common/StatCard';
import { Pagination } from '../../components/common/Pagination';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { RecordVariModal } from './RecordVariModal';
import { EditTargetModal } from './EditTargetModal';
import { EditPendingModal } from './EditPendingModal';
import { EditVariRosterModal } from './EditVariRosterModal';
import { MobileFilterSheet } from '../../components/common/MobileFilterSheet';
import { downloadExport } from '../../utils/exportHelper';
import {
  Plus,
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp,
  Download,
  FileSpreadsheet,
  Search,
  Edit3,
  Trash2,
} from 'lucide-react';

export function VariCollectionPage() {
  const { user } = useAuth();
  const isViewer = user?.role === 'VIEWER';
  const isAdmin = user?.role === 'ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();

  const selectedFY = searchParams.get('financialYear') || '2026-2027';
  const filterStatus = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [summary, setSummary] = useState({ totalExpectedPaise: 0, totalPaidPaise: 0, remainingPaise: 0 });
  const [rosterData, setRosterData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [preSelectedPangaliId, setPreSelectedPangaliId] = useState('');
  const [preSelectedAmount, setPreSelectedAmount] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [editingTargetPangali, setEditingTargetPangali] = useState(null);
  const [targetSubmitting, setTargetSubmitting] = useState(false);

  const [editingPendingPangali, setEditingPendingPangali] = useState(null);
  const [pendingSubmitting, setPendingSubmitting] = useState(false);

  const [editingRosterItem, setEditingRosterItem] = useState(null);
  const [rosterSubmitting, setRosterSubmitting] = useState(false);

  const [deletingRosterItem, setDeletingRosterItem] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

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
    setSearchParams({ financialYear: selectedFY });
  };

  const fetchSummary = useCallback(async () => {
    try {
      const res = await variApi.getVariSummary({ financialYear: selectedFY });
      if (res.success && res.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch vari summary:', err);
    }
  }, [selectedFY]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        financialYear: selectedFY,
        page: currentPage,
        limit: 10,
      };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;

      const res = await variApi.getVariRoster(params);
      if (res.success) {
        setRosterData(res.data || []);
        if (res.pagination) setPagination(res.pagination);
      } else {
        setError(res.message || 'Failed to fetch Vari collection records');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while loading Vari collection data');
    } finally {
      setLoading(false);
    }
  }, [selectedFY, currentPage, search, filterStatus]);

  useEffect(() => {
    fetchSummary();
    fetchData();
  }, [fetchSummary, fetchData]);

  const handleOpenRecordModal = (pangaliId = '', pendingPaise = null) => {
    setPreSelectedPangaliId(pangaliId);
    setPreSelectedAmount(pendingPaise !== null ? paiseToRupees(pendingPaise) : null);
    setIsRecordModalOpen(true);
  };

  const handleRecordPayment = async (data) => {
    setSubmitting(true);
    try {
      await variApi.createVariPayment(data);
      setIsRecordModalOpen(false);
      fetchSummary();
      fetchData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveTargetVari = async (pangaliId, annualVariAmount) => {
    setTargetSubmitting(true);
    try {
      await variApi.updatePangaliTargetVari(pangaliId, annualVariAmount);
      setEditingTargetPangali(null);
      fetchSummary();
      fetchData();
    } finally {
      setTargetSubmitting(false);
    }
  };

  const handleSavePendingVari = async (pangaliId, pendingAmount) => {
    setPendingSubmitting(true);
    try {
      await variApi.updatePangaliPendingVari(pangaliId, pendingAmount);
      setEditingPendingPangali(null);
      fetchSummary();
      fetchData();
    } finally {
      setPendingSubmitting(false);
    }
  };

  const handleSaveRosterItem = async (data) => {
    if (!editingRosterItem) return;
    setRosterSubmitting(true);
    try {
      await variApi.updateVariRosterItem(editingRosterItem._id, {
        ...data,
        financialYear: selectedFY,
      });
      setEditingRosterItem(null);
      fetchSummary();
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to update record');
    } finally {
      setRosterSubmitting(false);
    }
  };

  const handleConfirmDeleteRoster = async () => {
    if (!deletingRosterItem) return;
    setDeleteSubmitting(true);
    try {
      await variApi.deleteVariRosterItem(deletingRosterItem._id, { financialYear: selectedFY });
      setDeletingRosterItem(null);
      fetchSummary();
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to delete record');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const activeFilters = {
        financialYear: selectedFY,
        ...(filterStatus && { status: filterStatus }),
        ...(search && { search }),
      };
      await downloadExport('/vari/export', `Vari_Collection_${selectedFY}`, activeFilters, format);
    } catch (err) {
      alert(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const activeFilterCount = (search ? 1 : 0) + (filterStatus ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-900">Vari Collection Ledger</h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Pangali amounts given, total collected, and manual pending balance tracking.
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
              onClick={() => handleOpenRecordModal('', null)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-temple-600 hover:bg-temple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all min-h-touch"
            >
              <Plus className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-temple-600" />
            <h3 className="font-bold font-serif text-stone-900">Collection Overview</h3>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-stone-600 uppercase">FY:</label>
            <select
              value={selectedFY}
              onChange={(e) => updateParam('financialYear', e.target.value)}
              className="px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-bold bg-white text-stone-800 focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            >
              <option value="2024-2025">FY 2024-2025</option>
              <option value="2025-2026">FY 2025-2026</option>
              <option value="2026-2027">FY 2026-2027</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="Total Amount Collected"
            value={formatINR(summary.totalPaidPaise)}
            subtitle="Total received from Pangalis"
            icon={CheckCircle2}
          />
          <StatCard
            title="Total Pending Amount"
            value={formatINR(summary.remainingPaise)}
            subtitle="Outstanding pending balances"
            icon={AlertCircle}
          />
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-stone-200 p-3 sm:p-4 shadow-2xs">
        <MobileFilterSheet
          activeFilterCount={activeFilterCount}
          onClearFilters={handleClearFilters}
          onExportCSV={() => handleExport('csv')}
          onExportXLSX={() => handleExport('xlsx')}
          exporting={exporting}
        >
          <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-3 w-full">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search Pangali family name, code, house..."
                value={search}
                onChange={(e) => updateParam('search', e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm bg-white font-medium text-stone-700 focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => updateParam('status', e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white font-medium text-stone-700 focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            >
              <option value="">All Payment Statuses</option>
              <option value="PAID">PAID (Fully Settled)</option>
              <option value="PENDING">PENDING (Has Pending Balance)</option>
            </select>

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

      {/* Main Table / Cards View */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : rosterData.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            No Pangali records match the current filter criteria.
          </div>
        ) : (
          <>
            {/* Mobile Stacked Cards Layout (< md) */}
            <div className="md:hidden divide-y divide-stone-100 p-3 space-y-3">
              {rosterData.map((item) => (
                <div key={item._id} className="bg-stone-50/60 p-4 rounded-xl border border-stone-200 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold bg-stone-200 text-stone-800 px-2 py-0.5 rounded">
                        {item.pangaliCode}
                      </span>
                      <h3 className="font-serif font-bold text-base text-stone-900 mt-1">
                        {item.familyName}
                      </h3>
                      <p className="text-xs text-stone-500">{item.houseName || 'Village'}</p>
                    </div>
                    <StatusBadge status={item.variStatus} type="active" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-stone-200 text-center text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">Amount Collected</span>
                      <span className="font-bold text-emerald-700 text-sm">{formatINR(item.totalPaidPaise)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-800 block">Pending Amount</span>
                      <span className="font-bold text-amber-900 text-sm">{formatINR(item.remainingPaise)}</span>
                    </div>
                  </div>

                  {!isViewer && (
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingRosterItem(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                        <span>Edit</span>
                      </button>

                      {!isViewer && (
                        <button
                          onClick={() => setDeletingRosterItem(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-600 uppercase tracking-wider">
                    <th className="p-4">Pangali Code</th>
                    <th className="p-4">Pangali Family</th>
                    <th className="p-4">House / Address</th>
                    <th className="p-4 text-right">Amount Collected</th>
                    <th className="p-4 text-right">Pending Amount</th>
                    <th className="p-4 text-center">Status</th>
                    {!isViewer && <th className="p-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm text-stone-800">
                  {rosterData.map((item) => (
                    <tr key={item._id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="p-4 font-mono font-bold text-stone-900">{item.pangaliCode}</td>
                      <td className="p-4 font-semibold text-stone-900">{item.familyName}</td>
                      <td className="p-4 text-stone-600 text-xs">{item.houseName || 'Village'}</td>
                      <td className="p-4 text-right font-bold text-emerald-700 text-base">
                        {formatINR(item.totalPaidPaise)}
                      </td>
                      <td className="p-4 text-right font-bold text-amber-900 text-base">
                        {formatINR(item.remainingPaise)}
                      </td>
                      <td className="p-4 text-center">
                        <StatusBadge status={item.variStatus} type="active" />
                      </td>
                      {!isViewer && (
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingRosterItem(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs"
                              title="Edit all fields of this Vari record"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                              <span>Edit</span>
                            </button>

                            {!isViewer && (
                              <button
                                onClick={() => setDeletingRosterItem(item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                                title="Delete Vari collection record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <Pagination pagination={pagination} onPageChange={(page) => updateParam('page', page.toString())} />
      </div>

      {/* Edit All Table Fields Modal */}
      <EditVariRosterModal
        isOpen={Boolean(editingRosterItem)}
        onClose={() => setEditingRosterItem(null)}
        onSubmit={handleSaveRosterItem}
        rosterItem={editingRosterItem}
        loading={rosterSubmitting}
      />

      {/* Delete Confirmation Dialog */}
      {deletingRosterItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-stone-900/60" onClick={() => setDeletingRosterItem(null)} />
            <div className="relative bg-white rounded-xl max-w-md w-full p-6 shadow-xl z-10 space-y-4">
              <h3 className="text-lg font-bold font-serif text-stone-900 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <span>Delete Vari Collection Record</span>
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Are you sure you want to delete the Vari collection record for{' '}
                <strong className="text-stone-900 font-bold">{deletingRosterItem.familyName} ({deletingRosterItem.pangaliCode})</strong>?
                This action will reverse all collected Vari payments in the central ledger for FY {selectedFY}.
              </p>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setDeletingRosterItem(null)}
                  disabled={deleteSubmitting}
                  className="px-4 py-2 text-xs font-medium text-stone-700 border border-stone-300 rounded-lg hover:bg-stone-50 min-h-touch"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteRoster}
                  disabled={deleteSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 min-h-touch shadow-sm"
                >
                  {deleteSubmitting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <RecordVariModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSubmit={handleRecordPayment}
        loading={submitting}
        initialPangaliId={preSelectedPangaliId}
        initialAmount={preSelectedAmount}
      />

      {/* Manual Pending Amount Modal */}
      <EditPendingModal
        isOpen={Boolean(editingPendingPangali)}
        onClose={() => setEditingPendingPangali(null)}
        onSubmit={handleSavePendingVari}
        pangali={editingPendingPangali}
        loading={pendingSubmitting}
      />

      {/* Edit Target Vari Modal */}
      <EditTargetModal
        isOpen={Boolean(editingTargetPangali)}
        onClose={() => setEditingTargetPangali(null)}
        onSubmit={handleSaveTargetVari}
        pangali={editingTargetPangali}
        loading={targetSubmitting}
      />
    </div>
  );
}
