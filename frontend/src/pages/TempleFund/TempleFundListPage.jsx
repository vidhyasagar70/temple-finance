import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fundApi } from '../../api/fundApi';
import { useAuth } from '../../hooks/useAuth';
import { formatINR } from '../../utils/money';
import { Pagination } from '../../components/common/Pagination';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { GiveFundModal } from './GiveFundModal';
import { MobileFilterSheet } from '../../components/common/MobileFilterSheet';
import { downloadExport } from '../../utils/exportHelper';
import { Plus, Eye, AlertCircle, Download, FileSpreadsheet, XCircle } from 'lucide-react';

export function TempleFundListPage() {
  const { user } = useAuth();
  const isViewer = user?.role === 'VIEWER';

  const [searchParams, setSearchParams] = useSearchParams();

  const filterStatus = searchParams.get('status') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [advances, setAdvances] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const [isGiveModalOpen, setIsGiveModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const fetchAdvances = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: currentPage,
        limit: 10,
      };
      if (filterStatus) params.status = filterStatus;

      const res = await fundApi.getFundAdvances(params);
      if (res.success) {
        setAdvances(res.data || []);
        if (res.pagination) setPagination(res.pagination);
      } else {
        setError(res.message || 'Failed to fetch fund advances');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching fund advances');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, currentPage]);

  useEffect(() => {
    fetchAdvances();
  }, [fetchAdvances]);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const activeFilters = {
        ...(filterStatus && { status: filterStatus }),
      };
      await downloadExport('/temple-funds/export', 'Temple_Fund_Advances', activeFilters, format);
    } catch (err) {
      alert(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleGiveFund = async (data) => {
    setSubmitting(true);
    try {
      await fundApi.createFundAdvance(data);
      setIsGiveModalOpen(false);
      fetchAdvances();
    } finally {
      setSubmitting(false);
    }
  };

  const activeFilterCount = filterStatus ? 1 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-900">Temple Fund Advances</h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Track village fund disbursements given to Pangalis and individuals, outstanding balances, and interest receipts.
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
              onClick={() => setIsGiveModalOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-temple-600 hover:bg-temple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all min-h-touch"
            >
              <Plus className="w-4 h-4" />
              <span>Disburse Advance</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Sheet */}
      <div className="bg-white rounded-xl border border-stone-200 p-3 sm:p-4 shadow-2xs">
        <MobileFilterSheet
          activeFilterCount={activeFilterCount}
          onClearFilters={handleClearFilters}
          onExportCSV={() => handleExport('csv')}
          onExportXLSX={() => handleExport('xlsx')}
          exporting={exporting}
        >
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full">
            <select
              value={filterStatus}
              onChange={(e) => updateParam('status', e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white font-medium text-stone-700 focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PARTIALLY_REPAID">PARTIALLY REPAID</option>
              <option value="OVERDUE">OVERDUE</option>
              <option value="CLOSED">CLOSED</option>
              <option value="CANCELLED">CANCELLED</option>
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

      {/* Listing View */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : advances.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            No fund advances recorded matching the criteria.
          </div>
        ) : (
          <>
            {/* Mobile Cards View (< md) */}
            <div className="md:hidden divide-y divide-stone-100 p-3 space-y-3">
              {advances.map((adv) => {
                const isClosed = adv.status === 'CLOSED';
                const isOverdue = adv.status === 'OVERDUE';
                return (
                  <div
                    key={adv._id}
                    className="bg-stone-50/60 p-4 rounded-xl border border-stone-200 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-serif font-bold text-base text-stone-900">
                          {adv.recipientName}
                        </h3>
                        {adv.pangaliId?.pangaliCode && (
                          <span className="text-xs font-mono text-stone-500 block">
                            ({adv.pangaliId.pangaliCode})
                          </span>
                        )}
                        <span className="inline-block mt-1 px-2 py-0.5 bg-stone-200 rounded text-[10px] font-bold text-stone-700">
                          {adv.recipientType}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-semibold text-stone-500 block">Outstanding</span>
                        <span
                          className={`text-base font-extrabold ${
                            isClosed
                              ? 'text-stone-400'
                              : isOverdue
                              ? 'text-rose-700'
                              : 'text-amber-800'
                          }`}
                        >
                          {formatINR(adv.principalOutstandingPaise)}
                        </span>
                        <p className="text-[11px] text-stone-500">
                          Principal: {formatINR(adv.principalPaise)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-stone-600 pt-2 border-t border-stone-200/80">
                      <span>Due: {new Date(adv.dueDate).toLocaleDateString()}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isClosed
                            ? 'bg-stone-100 text-stone-600 border-stone-200'
                            : isOverdue
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : adv.status === 'PARTIALLY_REPAID'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {adv.status}
                      </span>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Link
                        to={`/temple-fund/${adv._id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-temple-700 bg-temple-50 border border-temple-200 rounded-lg hover:bg-temple-100 min-h-touch"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Advance Details</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-600 uppercase tracking-wider">
                    <th className="p-4">Recipient Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-right">Principal</th>
                    <th className="p-4 text-right">Outstanding</th>
                    <th className="p-4 text-right">Interest Paid</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm text-stone-800">
                  {advances.map((adv) => {
                    const isClosed = adv.status === 'CLOSED';
                    const isOverdue = adv.status === 'OVERDUE';
                    return (
                      <tr key={adv._id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="p-4 font-bold text-stone-900">
                          {adv.recipientName}{' '}
                          {adv.pangaliId?.pangaliCode && (
                            <span className="text-xs font-mono font-normal text-stone-500">
                              ({adv.pangaliId.pangaliCode})
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs font-medium">
                          <span className="px-2 py-0.5 bg-stone-100 border border-stone-200 rounded">
                            {adv.recipientType}
                          </span>
                        </td>
                        <td className="p-4 text-right font-semibold">
                          {formatINR(adv.principalPaise)}
                        </td>
                        <td
                          className={`p-4 text-right font-bold ${
                            isClosed
                              ? 'text-stone-400'
                              : isOverdue
                              ? 'text-rose-700 font-extrabold'
                              : 'text-amber-800'
                          }`}
                        >
                          {formatINR(adv.principalOutstandingPaise)}
                        </td>
                        <td className="p-4 text-right font-semibold text-emerald-700">
                          {formatINR(adv.interestPaidPaise)}
                        </td>
                        <td className="p-4 text-xs">
                          {new Date(adv.dueDate).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              isClosed
                                ? 'bg-stone-100 text-stone-600 border-stone-200'
                                : isOverdue
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : adv.status === 'PARTIALLY_REPAID'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {adv.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            to={`/temple-fund/${adv._id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-temple-700 bg-temple-50 border border-temple-200 rounded-lg hover:bg-temple-100 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Detail</span>
                          </Link>
                        </td>
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

      {/* Give Fund Modal */}
      <GiveFundModal
        isOpen={isGiveModalOpen}
        onClose={() => setIsGiveModalOpen(false)}
        onSubmit={handleGiveFund}
        loading={submitting}
      />
    </div>
  );
}
