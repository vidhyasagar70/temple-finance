import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { donationApi } from '../../api/donationApi';
import { festivalApi } from '../../api/festivalApi';
import { useAuth } from '../../hooks/useAuth';
import { formatINR } from '../../utils/money';
import { Pagination } from '../../components/common/Pagination';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { StatCard } from '../../components/common/StatCard';
import { AddDonationModal } from './AddDonationModal';
import { MobileFilterSheet } from '../../components/common/MobileFilterSheet';
import { downloadExport } from '../../utils/exportHelper';
import { Plus, XCircle, AlertCircle, Download, FileSpreadsheet, Search, Gift, CheckCircle2, Edit3, Trash2 } from 'lucide-react';

const PURPOSES = [
  'GENERAL_TEMPLE_FUND',
  'RENOVATION',
  'FESTIVAL',
  'ANNADHANAM',
  'POOJA',
  'CONSTRUCTION',
  'OTHER',
];

export function DonationsPage() {
  const { user } = useAuth();
  const isViewer = user?.role === 'VIEWER';
  const isAdmin = user?.role === 'ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();

  const filterType = searchParams.get('donationType') || '';
  const filterPurpose = searchParams.get('purpose') || '';
  const filterFestival = searchParams.get('festivalId') || '';
  const search = searchParams.get('search') || '';
  const minAmount = searchParams.get('minAmount') || '';
  const maxAmount = searchParams.get('maxAmount') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [donations, setDonations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [summary, setSummary] = useState({ totalDonationPaise: 0, totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const [festivalsList, setFestivalsList] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [deletingDonation, setDeletingDonation] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const fetchSummary = useCallback(async () => {
    try {
      const res = await donationApi.getDonationSummary();
      if (res.success && res.data) {
        setSummary(res.data);
      }
    } catch {
      // ignore summary errors gracefully
    }
  }, []);

  useEffect(() => {
    festivalApi.getFestivals({ limit: 100 }).then((res) => {
      if (res.success) setFestivalsList(res.data || []);
    });
    fetchSummary();
  }, [fetchSummary]);

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: currentPage,
        limit: 10,
      };
      if (filterType) params.donationType = filterType;
      if (filterPurpose) params.purpose = filterPurpose;
      if (filterFestival) params.festivalId = filterFestival;
      if (search) params.search = search;
      if (minAmount) params.minAmount = minAmount;
      if (maxAmount) params.maxAmount = maxAmount;

      const res = await donationApi.getDonations(params);
      if (res.success) {
        setDonations(res.data || []);
        if (res.pagination) setPagination(res.pagination);
      } else {
        setError(res.message || 'Failed to fetch donations');
      }
    } catch (err) {
      setError(err.message || 'Error fetching donations');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterPurpose, filterFestival, search, minAmount, maxAmount, currentPage]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const activeFilters = {
        ...(filterType && { donationType: filterType }),
        ...(filterPurpose && { purpose: filterPurpose }),
        ...(filterFestival && { festivalId: filterFestival }),
        ...(search && { search }),
        ...(minAmount && { minAmount }),
        ...(maxAmount && { maxAmount }),
      };
      await downloadExport('/donations/export', 'Donations_List', activeFilters, format);
    } catch (err) {
      alert(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveDonation = async (data) => {
    setSubmitting(true);
    try {
      if (editingDonation) {
        await donationApi.updateDonation(editingDonation._id, data);
      } else {
        await donationApi.createDonation(data);
      }
      setIsAddModalOpen(false);
      setEditingDonation(null);
      fetchDonations();
      fetchSummary();
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingDonation) return;
    setDeleteLoading(true);
    try {
      await donationApi.deleteDonation(deletingDonation._id);
      setDeletingDonation(null);
      fetchDonations();
      fetchSummary();
    } catch (err) {
      setError(err.message || 'Failed to delete donation record');
    } finally {
      setDeleteLoading(false);
    }
  };

  const activeFilterCount =
    (filterType ? 1 : 0) +
    (filterPurpose ? 1 : 0) +
    (filterFestival ? 1 : 0) +
    (search ? 1 : 0) +
    (minAmount ? 1 : 0) +
    (maxAmount ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-900">Donations Ledger</h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Cash donations from devotees and the public.
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
                setEditingDonation(null);
                setIsAddModalOpen(true);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-temple-600 hover:bg-temple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all min-h-touch"
            >
              <Plus className="w-4 h-4" />
              <span>Record Donation</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Cash Donations Received"
          value={formatINR(summary.totalDonationPaise)}
          subtitle="Total active cash collected"
          icon={Gift}
          color="temple"
        />
        <StatCard
          title="Total Donation Records"
          value={`${summary.totalCount} Entries`}
          subtitle="Active cash donation entries"
          icon={CheckCircle2}
          color="temple"
        />
      </div>

      {/* Filter Section */}
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
                placeholder="Search donor name, receipt #, notes..."
                value={search}
                onChange={(e) => updateParam('search', e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm bg-white font-medium text-stone-700 focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
              />
            </div>

            <select
              value={filterPurpose}
              onChange={(e) => updateParam('purpose', e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white font-medium text-stone-700 focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            >
              <option value="">All Purposes</option>
              {PURPOSES.map((p) => (
                <option key={p} value={p}>
                  {p.replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            <select
              value={filterFestival}
              onChange={(e) => updateParam('festivalId', e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white font-medium text-stone-700 focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            >
              <option value="">All Festivals</option>
              {festivalsList.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name} ({f.year})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="Min ₹"
                value={minAmount}
                onChange={(e) => updateParam('minAmount', e.target.value)}
                className="w-20 sm:w-24 px-2.5 py-2 border border-stone-300 rounded-lg text-sm bg-white font-medium text-stone-700 focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
              />
              <span className="text-stone-400 text-xs font-bold">–</span>
              <input
                type="number"
                placeholder="Max ₹"
                value={maxAmount}
                onChange={(e) => updateParam('maxAmount', e.target.value)}
                className="w-20 sm:w-24 px-2.5 py-2 border border-stone-300 rounded-lg text-sm bg-white font-medium text-stone-700 focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
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
        ) : donations.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            No donations recorded matching the criteria.
          </div>
        ) : (
          <>
            {/* Mobile Cards View (< md) */}
            <div className="md:hidden divide-y divide-stone-100 p-3 space-y-3">
              {donations.map((d) => {
                const isMaterial = d.donationType === 'MATERIAL';
                const isCancelled = d.status === 'CANCELLED';

                return (
                  <div
                    key={d._id}
                    className={`bg-stone-50/60 p-4 rounded-xl border border-stone-200 space-y-3 ${
                      isCancelled ? 'opacity-50 line-through' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-serif font-bold text-base text-stone-900">
                          {d.donorName}
                        </h3>
                        {d.receiptNumber && (
                          <span className="text-xs font-mono text-temple-700 block">
                            {d.receiptNumber}
                          </span>
                        )}
                        <span className="text-xs text-stone-500 font-medium">
                          {d.purpose.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border mb-1 ${
                            isMaterial
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {d.donationType}
                        </span>
                        <div className="text-sm font-bold text-stone-900">
                          {isMaterial ? d.itemDescription : formatINR(d.amountPaise)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-stone-600 pt-2 border-t border-stone-200/80">
                      <span>Date: {new Date(d.donationDate).toLocaleDateString()}</span>
                      <StatusBadge status={d.status} type="active" />
                    </div>

                    {!isCancelled && !isViewer && (
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => {
                            setEditingDonation(d);
                            setIsAddModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-temple-700 bg-temple-50 border border-temple-200 rounded-lg hover:bg-temple-100 min-h-touch"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setDeletingDonation(d)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 min-h-touch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-600 uppercase tracking-wider">
                    <th className="p-4">Donor Name</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Purpose</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-center">Status</th>
                    {!isViewer && <th className="p-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm text-stone-800">
                  {donations.map((d) => {
                    const isCancelled = d.status === 'CANCELLED';

                    return (
                      <tr
                        key={d._id}
                        className={`hover:bg-stone-50/80 transition-colors ${
                          isCancelled ? 'opacity-50 line-through bg-stone-50/50' : ''
                        }`}
                      >
                        <td className="p-4 font-semibold text-stone-900">
                          {d.donorName}{' '}
                          {d.receiptNumber && (
                            <span className="block text-xs font-mono font-normal text-temple-700">
                              {d.receiptNumber}
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-emerald-700 font-extrabold">
                          {formatINR(d.amountPaise)}
                        </td>
                        <td className="p-4 text-xs font-medium text-stone-700">
                          {d.purpose.replace(/_/g, ' ')}
                        </td>
                        <td className="p-4 text-xs">
                          {new Date(d.donationDate).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-center">
                          <StatusBadge status={d.status} type="active" />
                        </td>
                        {!isViewer && (
                          <td className="p-4 text-right">
                            {!isCancelled && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingDonation(d);
                                    setIsAddModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-temple-700 bg-temple-50 border border-temple-200 rounded hover:bg-temple-100"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => setDeletingDonation(d)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
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

      {/* Modal */}
      <AddDonationModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingDonation(null);
        }}
        onSubmit={handleSaveDonation}
        loading={submitting}
        initialData={editingDonation}
      />

      {/* Delete Dialog */}
      {deletingDonation && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-stone-900/60" onClick={() => setDeletingDonation(null)} />
            <div className="relative bg-white rounded-xl max-w-md w-full p-6 shadow-xl z-10 space-y-4">
              <h3 className="text-lg font-bold font-serif text-stone-900 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <span>Delete Donation Record</span>
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Are you sure you want to delete the donation record for{' '}
                <strong className="text-stone-900 font-bold">{deletingDonation.donorName}</strong> ({formatINR(deletingDonation.amountPaise)})?
                This action will cancel the donation and reverse any linked transaction in the central ledger.
              </p>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setDeletingDonation(null)}
                  disabled={deleteLoading}
                  className="px-4 py-2 text-xs font-medium text-stone-700 border border-stone-300 rounded-lg hover:bg-stone-50 min-h-touch"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 min-h-touch shadow-sm"
                >
                  {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
