import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { contributionApi } from '../../api/contributionApi';
import { festivalApi } from '../../api/festivalApi';
import { useAuth } from '../../hooks/useAuth';
import { AddContributionModal } from './AddContributionModal';
import { MobileFilterSheet } from '../../components/common/MobileFilterSheet';
import { Modal } from '../../components/common/Modal';
import { downloadExport } from '../../utils/exportHelper';
import {
  Plus,
  Search,
  XCircle,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Ban,
  Tag,
  Eye,
  Edit3,
  Package,
  MapPin,
  FileText,
  CalendarDays,
  CreditCard,
  Hash,
  Sparkles,
  X,
} from 'lucide-react';

export default function ContributionsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const personType = searchParams.get('personType') || '';
  const contributionType = searchParams.get('contributionType') || '';
  const paymentMethod = searchParams.get('paymentMethod') || '';
  const festivalId = searchParams.get('festivalId') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const status = searchParams.get('status') || '';
  const minAmount = searchParams.get('minAmount') || '';
  const maxAmount = searchParams.get('maxAmount') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [contributions, setContributions] = useState([]);
  const [types, setTypes] = useState([]);
  const [festivals, setFestivals] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelModalItem, setCancelModalItem] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [viewItem, setViewItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const isCommitteeOrAdmin = user?.role === 'ADMIN' || user?.role === 'COMMITTEE_MEMBER';
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    contributionApi
      .getTypes()
      .then((res) => {
        if (res.success) setTypes(res.data || []);
      })
      .catch(() => {});

    festivalApi
      .getFestivals({ limit: 100 })
      .then((res) => {
        if (res.success) setFestivals(res.data || []);
      })
      .catch(() => {});
  }, []);

  const fetchContributions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: 15,
        ...(search && { search }),
        ...(personType && { personType }),
        ...(contributionType && { contributionType }),
        ...(paymentMethod && { paymentMethod }),
        ...(festivalId && { festivalId }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(status && { status }),
        ...(minAmount && { minAmount }),
        ...(maxAmount && { maxAmount }),
      };
      const res = await contributionApi.getContributions(params);
      if (res.success) {
        setContributions(res.data || []);
        setPagination(res.pagination || { total: 0, pages: 1 });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch contributions.');
    } finally {
      setLoading(false);
    }
  }, [page, search, personType, contributionType, paymentMethod, festivalId, startDate, endDate, status, minAmount, maxAmount]);

  useEffect(() => {
    fetchContributions();
  }, [fetchContributions]);

  const updateFilter = (key, value) => {
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

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const activeFilters = {
        ...(search && { search }),
        ...(personType && { personType }),
        ...(contributionType && { contributionType }),
        ...(paymentMethod && { paymentMethod }),
        ...(festivalId && { festivalId }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(status && { status }),
        ...(minAmount && { minAmount }),
        ...(maxAmount && { maxAmount }),
      };
      await downloadExport('/contributions/export', 'Contributions_List', activeFilters, format);
    } catch (err) {
      alert(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleCreateContribution = async (data) => {
    setSubmitting(true);
    try {
      const res = await contributionApi.createContribution(data);
      if (res.success) {
        setIsAddOpen(false);
        fetchContributions();
      }
    } catch (err) {
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateContribution = async (data) => {
    setSubmitting(true);
    try {
      const res = await contributionApi.updateContribution(editingItem._id, data);
      if (res.success) {
        setEditingItem(null);
        fetchContributions();
      }
    } catch (err) {
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) return;
    setSubmitting(true);
    try {
      const res = await contributionApi.cancelContribution(cancelModalItem._id, cancelReason);
      if (res.success) {
        setCancelModalItem(null);
        setCancelReason('');
        fetchContributions();
      }
    } catch (err) {
      alert(err.message || 'Failed to cancel contribution');
    } finally {
      setSubmitting(false);
    }
  };

  const activeFilterCount =
    (search ? 1 : 0) +
    (personType ? 1 : 0) +
    (contributionType ? 1 : 0) +
    (paymentMethod ? 1 : 0) +
    (festivalId ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0) +
    (status ? 1 : 0) +
    (minAmount ? 1 : 0) +
    (maxAmount ? 1 : 0);

  const contributorNameOf = (c) =>
    c.personType === 'PANGALI'
      ? c.pangaliId?.familyName || c.pangaliId?.name || 'Unknown Pangali'
      : c.personName || 'Devotee';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-temple-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900">Contributions & Offerings</h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Material offerings, in-kind donations, festival contributions, and amounts received.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
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

          {isCommitteeOrAdmin && (
            <button
              onClick={() => {
                setEditingItem(null);
                setIsAddOpen(true);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-temple-600 text-white rounded-xl hover:bg-temple-700 font-medium text-xs sm:text-sm transition-colors shadow-sm min-h-touch"
            >
              <Plus className="w-4 h-4" />
              <span>Record Offering</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-3 sm:p-5 rounded-2xl shadow-sm border border-stone-200">
        <MobileFilterSheet
          activeFilterCount={activeFilterCount}
          onClearFilters={handleClearFilters}
          onExportCSV={() => handleExport('csv')}
          onExportXLSX={() => handleExport('xlsx')}
          exporting={exporting}
        >
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search donor, item, place, notes..."
              value={search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
            />
          </div>

          <select
            value={personType}
            onChange={(e) => updateFilter('personType', e.target.value)}
            className="w-full md:w-auto px-3 py-2 border border-stone-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
          >
            <option value="">All Person Types</option>
            <option value="PANGALI">Pangali Member</option>
            <option value="OTHER">Non-Pangali / Guest</option>
          </select>

          <select
            value={contributionType}
            onChange={(e) => updateFilter('contributionType', e.target.value)}
            className="w-full md:w-auto px-3 py-2 border border-stone-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
          >
            <option value="">All Contribution Types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={festivalId}
            onChange={(e) => updateFilter('festivalId', e.target.value)}
            className="w-full md:w-auto px-3 py-2 border border-stone-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
          >
            <option value="">All Festivals</option>
            {festivals.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => updateFilter('startDate', e.target.value)}
            className="w-full md:w-auto px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => updateFilter('endDate', e.target.value)}
            className="w-full md:w-auto px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
          />

          <select
            value={status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="w-full md:w-auto px-3 py-2 border border-stone-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active / Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {activeFilterCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="hidden md:inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 min-h-touch"
            >
              <XCircle className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </MobileFilterSheet>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Listing Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-500 text-sm font-medium">
            Loading contributions...
          </div>
        ) : contributions.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <p className="text-base font-semibold text-stone-700">No contributions found</p>
            <p className="text-xs text-stone-500 mt-1">Try adjusting your filters or record a new offering.</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (< md) */}
            <div className="md:hidden divide-y divide-stone-100 p-3 space-y-3">
              {contributions.map((c) => {
                const isCancelled = c.status === 'CANCELLED';
                const name = contributorNameOf(c);

                return (
                  <div
                    key={c._id}
                    className={`bg-stone-50/60 p-4 rounded-xl border border-stone-200 space-y-3 ${
                      isCancelled ? 'opacity-60 line-through' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-mono font-bold text-temple-700 block truncate">
                          {c.receiptNumber || 'No Receipt'}
                        </span>
                        <h3 className="font-serif font-bold text-base text-stone-900 mt-0.5 truncate">
                          {name}
                        </h3>
                        <span className="text-[11px] text-stone-500 font-semibold block truncate">{c.contributionType}</span>
                      </div>

                      <div className="text-right shrink-0">
                        {c.amountPaise > 0 ? (
                          <span className="text-base font-bold text-emerald-800 block whitespace-nowrap">
                            ₹{(c.amountPaise / 100).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-stone-500 bg-stone-200 px-2 py-0.5 rounded whitespace-nowrap">
                            In-kind
                          </span>
                        )}
                        {isCancelled ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded mt-1 inline-block">
                            Cancelled
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded mt-1 inline-block">
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    {c.details && (
                      <div className="bg-white p-3 rounded-lg border border-stone-200/80 text-[11px] text-stone-700 whitespace-pre-wrap">
                        <div className="flex items-start gap-1.5">
                          <Package className="w-3.5 h-3.5 text-temple-700 shrink-0 mt-0.5" />
                          <span className="font-semibold text-stone-800">Contributed:</span>
                          <span className="flex-1">{c.details}</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600 pt-1">
                      <div className="flex items-center gap-1 truncate">
                        <CalendarDays className="w-3 h-3 shrink-0 text-stone-400" />
                        <span className="truncate">{new Date(c.date).toLocaleDateString('en-IN')}</span>
                      </div>
                      {c.place && (
                        <div className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0 text-stone-400" />
                          <span className="truncate">{c.place}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200/60">
                      <button
                        onClick={() => setViewItem(c)}
                        className="px-3 py-1.5 text-[11px] font-bold text-temple-700 bg-temple-50 border border-temple-200 rounded-lg hover:bg-temple-100 min-h-touch inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>

                      {isCommitteeOrAdmin && !isCancelled && (
                        <button
                          onClick={() => setEditingItem(c)}
                          className="px-3 py-1.5 text-[11px] font-bold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 min-h-touch inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      )}

                      {isAdmin && !isCancelled && (
                        <button
                          onClick={() => setCancelModalItem(c)}
                          className="px-3 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 min-h-touch"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 border-b border-stone-200 font-bold uppercase text-stone-600 tracking-wider">
                  <tr>
                    <th className="p-4">Receipt #</th>
                    <th className="p-4">Contributor</th>
                    <th className="p-4">Contribution Type</th>
                    <th className="p-4">What they gave / Details</th>
                    <th className="p-4">Place</th>
                    <th className="p-4 text-right">Amount (₹)</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Status</th>
                    {isCommitteeOrAdmin && <th className="p-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {contributions.map((c) => {
                    const isCancelled = c.status === 'CANCELLED';
                    const name = contributorNameOf(c);

                    return (
                      <tr
                        key={c._id}
                        className={`hover:bg-stone-50 transition-colors ${
                          isCancelled ? 'bg-rose-50/40 text-stone-400' : ''
                        }`}
                      >
                        <td className="p-4 font-mono font-bold text-stone-900">
                          {c.receiptNumber || '—'}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-900">{name}</span>
                            {c.personType === 'PANGALI' ? (
                              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                                P
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-purple-100 text-purple-800 rounded-full border border-purple-200">
                                G
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-bold text-stone-800">{c.contributionType}</td>
                        <td className="p-4 text-stone-700 max-w-[260px]">
                          {c.details ? (
                            <span className="line-clamp-2">{c.details}</span>
                          ) : (
                            <span className="text-stone-400 italic">—</span>
                          )}
                        </td>
                        <td className="p-4 text-stone-600">
                          {c.place || <span className="text-stone-400 italic">—</span>}
                        </td>
                        <td className="p-4 text-sm font-bold text-right">
                          {c.amountPaise > 0 ? (
                            <span className="text-emerald-700">
                              ₹{(c.amountPaise / 100).toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-stone-400 font-semibold">In-kind</span>
                          )}
                        </td>
                        <td className="p-4">
                          {new Date(c.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="p-4">
                          {isCancelled ? (
                            <span className="px-2.5 py-1 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-full border border-rose-200 inline-flex items-center gap-1">
                              <Ban className="w-3 h-3" /> Cancelled
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                              Active
                            </span>
                          )}
                        </td>
                        {isCommitteeOrAdmin && (
                          <td className="p-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setViewItem(c)}
                              className="mr-1 px-2.5 py-1 text-[11px] font-bold text-temple-700 hover:text-temple-800 bg-temple-50 hover:bg-temple-100 rounded border border-temple-200 transition-colors inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            {!isCancelled && (
                              <button
                                onClick={() => setEditingItem(c)}
                                className="mr-1 px-2.5 py-1 text-[11px] font-bold text-stone-700 hover:text-stone-800 bg-white hover:bg-stone-50 rounded border border-stone-300 transition-colors inline-flex items-center gap-1"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Edit
                              </button>
                            )}
                            {isAdmin && !isCancelled && (
                              <button
                                onClick={() => setCancelModalItem(c)}
                                className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition-colors"
                              >
                                Cancel
                              </button>
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

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-stone-50 border-t border-stone-200 text-xs">
            <span className="text-stone-600">
              Page <strong className="text-stone-900">{page}</strong> of{' '}
              <strong className="text-stone-900">{pagination.pages}</strong>
            </span>

            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => updateFilter('page', (page - 1).toString())}
                className="px-3 py-1.5 font-medium bg-white border border-stone-300 rounded-lg hover:bg-stone-100 disabled:opacity-50 text-stone-700 min-h-touch"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => updateFilter('page', (page + 1).toString())}
                className="px-3 py-1.5 font-medium bg-white border border-stone-300 rounded-lg hover:bg-stone-100 disabled:opacity-50 text-stone-700 min-h-touch"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============ VIEW MODAL ============ */}
      {viewItem && (
        <Modal
          isOpen={Boolean(viewItem)}
          onClose={() => setViewItem(null)}
          title="Contribution / Offering Details"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5">
            {/* Header strip */}
            <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-temple-50 to-stone-50 p-4 rounded-xl border border-temple-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold bg-temple-100 text-temple-800 px-2.5 py-1 rounded border border-temple-200">
                    {viewItem.receiptNumber || 'No Receipt ID'}
                  </span>
                  {viewItem.status === 'CANCELLED' ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-full border border-rose-200">
                      Cancelled
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                      Active
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-serif font-bold text-stone-900 mt-2">
                  {contributorNameOf(viewItem)}
                </h2>
                <p className="text-sm text-stone-600 mt-0.5 font-semibold">{viewItem.contributionType}</p>
              </div>
              <div className="text-right">
                {viewItem.amountPaise > 0 ? (
                  <div className="text-2xl font-extrabold text-emerald-700">
                    ₹{(viewItem.amountPaise / 100).toLocaleString('en-IN')}
                  </div>
                ) : (
                  <div className="text-xs font-bold text-stone-500 bg-stone-200 px-3 py-1.5 rounded">
                    In-kind / Material Offering
                  </div>
                )}
              </div>
            </div>

            {/* Grid of details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                <CalendarDays className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Date</div>
                  <div className="text-sm font-semibold text-stone-900">
                    {new Date(viewItem.date).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                <MapPin className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Place / Location</div>
                  <div className="text-sm font-semibold text-stone-900 truncate">
                    {viewItem.place || <span className="text-stone-400 italic">Not specified</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                <Hash className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Person Type</div>
                  <div className="text-sm font-semibold text-stone-900">
                    {viewItem.personType === 'PANGALI' ? '👥 Pangali Member' : '👤 Guest / Devotee'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                <CreditCard className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Payment / Method</div>
                  <div className="text-sm font-semibold text-stone-900">
                    {viewItem.paymentMethod || <span className="text-stone-400 italic">N/A (material)</span>}
                  </div>
                </div>
              </div>

              {viewItem.festivalId && (
                <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg border border-blue-200 md:col-span-2">
                  <Tag className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">Festival / Event</div>
                    <div className="text-sm font-semibold text-blue-900">
                      {viewItem.festivalId.name || viewItem.festivalId} {viewItem.festivalId.year ? `(${viewItem.festivalId.year})` : ''}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* What they gave */}
            {viewItem.details && (
              <div className="bg-gradient-to-br from-emerald-50 to-white p-4 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-emerald-700" />
                  <div className="text-[11px] uppercase font-bold text-emerald-800 tracking-wider">
                    What they Contributed / Offered
                  </div>
                </div>
                <div className="text-base font-semibold text-stone-900 whitespace-pre-wrap leading-relaxed">
                  {viewItem.details}
                </div>
              </div>
            )}

            {/* Notes */}
            {viewItem.notes && (
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText className="w-4 h-4 text-stone-500" />
                  <div className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Notes / Extra Details</div>
                </div>
                <div className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">
                  {viewItem.notes}
                </div>
              </div>
            )}

            {/* Cancel info */}
            {viewItem.status === 'CANCELLED' && (
              <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
                <div className="flex items-center gap-2 mb-1">
                  <Ban className="w-4 h-4 text-rose-700" />
                  <div className="text-[10px] uppercase font-bold text-rose-800 tracking-wider">Cancellation Info</div>
                </div>
                <div className="text-xs text-rose-700">
                  <div><strong>Cancelled at:</strong> {new Date(viewItem.cancelledAt).toLocaleString('en-IN')}</div>
                  {viewItem.cancelReason && <div className="mt-1"><strong>Reason:</strong> {viewItem.cancelReason}</div>}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewItem(null)}
                className="px-5 py-2 text-sm font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl min-h-touch"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============ ADD / EDIT MODAL ============ */}
      <AddContributionModal
        isOpen={isAddOpen || Boolean(editingItem)}
        onClose={() => {
          setIsAddOpen(false);
          setEditingItem(null);
        }}
        onSubmit={editingItem ? handleUpdateContribution : handleCreateContribution}
        loading={submitting}
        initialData={editingItem}
      />

      {/* Cancel Confirmation Modal */}
      {cancelModalItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-xl border border-stone-200">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-bold text-stone-900">
                Cancel Contribution
              </h3>
              <button
                onClick={() => {
                  setCancelModalItem(null);
                  setCancelReason('');
                }}
                className="p-1 rounded hover:bg-stone-100"
              >
                <X className="w-4 h-4 text-stone-500" />
              </button>
            </div>
            <p className="text-xs text-stone-600 mb-1">
              <strong>Receipt #:</strong> {cancelModalItem.receiptNumber || '—'}
            </p>
            <p className="text-xs text-stone-600 mb-4">
              <strong>Contributor:</strong> {contributorNameOf(cancelModalItem)}
            </p>
            {cancelModalItem.amountPaise > 0 && (
              <p className="text-xs text-stone-600 mb-4">
                Cancelling will reverse the ledger transaction for{' '}
                <strong>₹{(cancelModalItem.amountPaise / 100).toLocaleString('en-IN')}</strong>.
              </p>
            )}

            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Duplicate entry / Incorrect amount"
              className="w-full p-3 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none mb-4 min-h-touch"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setCancelModalItem(null);
                  setCancelReason('');
                }}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg min-h-touch"
              >
                Back
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={submitting || !cancelReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 min-h-touch"
              >
                {submitting ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
