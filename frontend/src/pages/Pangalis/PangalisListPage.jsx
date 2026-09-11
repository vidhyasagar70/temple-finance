import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { pangaliApi } from '../../api/pangaliApi';
import { useAuth } from '../../hooks/useAuth';
import { SearchInput } from '../../components/common/SearchInput';
import { Pagination } from '../../components/common/Pagination';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PangaliFormModal } from './PangaliFormModal';
import { MobileFilterSheet } from '../../components/common/MobileFilterSheet';
import { downloadExport } from '../../utils/exportHelper';
import { Plus, Eye, Edit3, UserX, AlertCircle, Download, FileSpreadsheet, XCircle } from 'lucide-react';

export function PangalisListPage() {
  const { user } = useAuth();
  const isViewer = user?.role === 'VIEWER';
  const isAdmin = user?.role === 'ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('search') || '';
  const statusFilter = searchParams.get('isActive') || 'true';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [pangalis, setPangalis] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPangali, setEditingPangali] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [deactivatingId, setDeactivatingId] = useState(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

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

  const fetchPangalis = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: currentPage,
        limit: 10,
      };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== 'all') params.isActive = statusFilter;

      const res = await pangaliApi.getPangalis(params);
      if (res.success) {
        setPangalis(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setError(res.message || 'Failed to fetch Pangalis list');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching Pangalis');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter]);

  useEffect(() => {
    fetchPangalis();
  }, [fetchPangalis]);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const activeFilters = {
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== 'all' && { isActive: statusFilter }),
      };
      await downloadExport('/pangalis/export', 'Pangalis_Master_List', activeFilters, format);
    } catch (err) {
      alert(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleSavePangali = async (formData) => {
    setFormSubmitting(true);
    try {
      if (editingPangali) {
        await pangaliApi.updatePangali(editingPangali._id, formData);
      } else {
        await pangaliApi.createPangali(formData);
      }
      setIsFormOpen(false);
      setEditingPangali(null);
      fetchPangalis();
    } catch (err) {
      throw err;
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingId) return;
    setDeactivateLoading(true);
    try {
      await pangaliApi.deactivatePangali(deactivatingId);
      setDeactivatingId(null);
      fetchPangalis();
    } catch (err) {
      setError(err.message || 'Failed to deactivate Pangali');
    } finally {
      setDeactivateLoading(false);
    }
  };

  const activeFilterCount = (searchQuery ? 1 : 0) + (statusFilter !== 'true' ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-900">Pangalis Directory</h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Master list of village temple families and member records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Header export shortcuts */}
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
                setEditingPangali(null);
                setIsFormOpen(true);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-temple-600 hover:bg-temple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all min-h-touch"
            >
              <Plus className="w-4 h-4" />
              <span>Add Pangali</span>
            </button>
          )}
        </div>
      </div>

      {/* Responsive Filter Control */}
      <div className="bg-white rounded-xl border border-stone-200 p-3 sm:p-4 shadow-2xs">
        <MobileFilterSheet
          activeFilterCount={activeFilterCount}
          onClearFilters={handleClearFilters}
          onExportCSV={() => handleExport('csv')}
          onExportXLSX={() => handleExport('xlsx')}
          exporting={exporting}
        >
          <div className="w-full md:w-72">
            <SearchInput
              value={searchQuery}
              onChange={(val) => updateParam('search', val)}
              placeholder="Search family, house, phone..."
            />
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
            <div className="flex flex-col md:flex-row md:items-center gap-1.5">
              <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => updateParam('isActive', e.target.value)}
                className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-temple-500 min-h-touch"
              >
                <option value="true">Active Families Only</option>
                <option value="false">Deactivated Only</option>
                <option value="all">All Records</option>
              </select>
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

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Records Listing: Cards below md:, Table on desktop */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : pangalis.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <p className="text-base font-semibold">No Pangalis found</p>
            <p className="text-xs text-stone-400 mt-1">
              Try adjusting search parameters or create a new record.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Stacked Cards Layout (< md) */}
            <div className="md:hidden divide-y divide-stone-100 p-3 space-y-3">
              {pangalis.map((p) => (
                <div key={p._id} className="bg-stone-50/60 p-4 rounded-xl border border-stone-200 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-stone-200 text-stone-800 px-2 py-0.5 rounded">
                          {p.pangaliCode}
                        </span>
                        <StatusBadge status={p.isActive} type="active" />
                      </div>
                      <h3 className="font-serif font-bold text-base text-stone-900 mt-1">
                        {p.familyName}
                      </h3>
                      <p className="text-xs text-stone-500">{p.houseName || 'Village Address'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-600 pt-2 border-t border-stone-200/80">
                    <span className="font-mono">{p.phone || 'No phone'}</span>
                    <span>{p.memberCount} Members</span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Link
                      to={`/pangalis/${p._id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-temple-700 bg-temple-50 border border-temple-200 rounded-lg hover:bg-temple-100 transition-colors min-h-touch"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </Link>

                    {!isViewer && (
                      <button
                        onClick={() => {
                          setEditingPangali(p);
                          setIsFormOpen(true);
                        }}
                        className="px-3 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors min-h-touch"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}

                    {isAdmin && p.isActive && (
                      <button
                        onClick={() => setDeactivatingId(p._id)}
                        className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors min-h-touch"
                        title="Deactivate"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-600 uppercase tracking-wider">
                    <th className="p-4">Pangali Code</th>
                    <th className="p-4">Family Name</th>
                    <th className="p-4">House Name</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4 text-center">Members</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm text-stone-800">
                  {pangalis.map((p) => (
                    <tr key={p._id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="p-4 font-mono font-bold text-stone-900">{p.pangaliCode}</td>
                      <td className="p-4 font-semibold text-stone-900">{p.familyName}</td>
                      <td className="p-4 text-stone-600">{p.houseName || '—'}</td>
                      <td className="p-4 font-mono text-stone-600">{p.phone || '—'}</td>
                      <td className="p-4 text-center font-medium">{p.memberCount}</td>
                      <td className="p-4 text-center">
                        <StatusBadge status={p.isActive} type="active" />
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Link
                          to={`/pangalis/${p._id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-temple-700 bg-temple-50 border border-temple-200 rounded-lg hover:bg-temple-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </Link>

                        {!isViewer && (
                          <button
                            onClick={() => {
                              setEditingPangali(p);
                              setIsFormOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}

                        {isAdmin && p.isActive && (
                          <button
                            onClick={() => setDeactivatingId(p._id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                            title="Deactivate Pangali record"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Deactivate</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <Pagination
          pagination={pagination}
          onPageChange={(page) => updateParam('page', page.toString())}
        />
      </div>

      {/* Form Modal */}
      <PangaliFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingPangali(null);
        }}
        onSubmit={handleSavePangali}
        initialData={editingPangali}
        loading={formSubmitting}
      />

      {/* Confirm Deactivation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deactivatingId)}
        onClose={() => setDeactivatingId(null)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Pangali Record"
        message="Deactivating will exclude this Pangali from active collection rosters, but preserve financial history in the immutable ledger. Proceed?"
        confirmText="Deactivate"
        isDangerous={true}
        loading={deactivateLoading}
      />
    </div>
  );
}
