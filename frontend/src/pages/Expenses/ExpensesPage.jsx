import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { expenseApi } from '../../api/expenseApi';
import { festivalApi } from '../../api/festivalApi';
import { useAuth } from '../../hooks/useAuth';
import { formatINR } from '../../utils/money';
import { Pagination } from '../../components/common/Pagination';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AddExpenseModal } from './AddExpenseModal';
import { DateExpenseDetailsModal } from './DateExpenseDetailsModal';
import { MobileFilterSheet } from '../../components/common/MobileFilterSheet';
import { downloadExport } from '../../utils/exportHelper';
import { Plus, XCircle, AlertCircle, Download, FileSpreadsheet, Calendar, Eye, Receipt } from 'lucide-react';

export function ExpensesPage() {
  const { user } = useAuth();
  const isViewer = user?.role === 'VIEWER';
  const isAdmin = user?.role === 'ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();

  const filterCategory = searchParams.get('category') || '';
  const filterFestival = searchParams.get('festivalId') || '';
  const filterMethod = searchParams.get('paymentMethod') || '';
  const filterFromDate = searchParams.get('from') || '';
  const filterToDate = searchParams.get('to') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [dateGroups, setDateGroups] = useState([]);
  const [grandTotalPaise, setGrandTotalPaise] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const [festivalsList, setFestivalsList] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedDateGroup, setSelectedDateGroup] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

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

  useEffect(() => {
    festivalApi.getFestivals({ limit: 100 }).then((res) => {
      if (res.success) setFestivalsList(res.data || []);
    });
  }, []);

  const fetchExpensesByDate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: currentPage,
        limit: 10,
      };
      if (filterCategory) params.category = filterCategory;
      if (filterFestival) params.festivalId = filterFestival;
      if (filterMethod) params.paymentMethod = filterMethod;
      if (filterFromDate) params.from = filterFromDate;
      if (filterToDate) params.to = filterToDate;

      const res = await expenseApi.getExpensesByDate(params);
      if (res.success) {
        setDateGroups(res.data || []);
        setGrandTotalPaise(res.grandTotalPaise || 0);
        if (res.pagination) setPagination(res.pagination);

        // Keep detail modal updated if open
        if (selectedDateGroup) {
          const updated = (res.data || []).find((g) => g.date === selectedDateGroup.date);
          if (updated) setSelectedDateGroup(updated);
        }
      } else {
        setError(res.message || 'Failed to fetch date-grouped expenses');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching expenses');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterFestival, filterMethod, filterFromDate, filterToDate, currentPage]);

  useEffect(() => {
    fetchExpensesByDate();
  }, [fetchExpensesByDate]);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const activeFilters = {
        ...(filterCategory && { category: filterCategory }),
        ...(filterFestival && { festivalId: filterFestival }),
        ...(filterMethod && { paymentMethod: filterMethod }),
        ...(filterFromDate && { from: filterFromDate }),
        ...(filterToDate && { to: filterToDate }),
      };
      await downloadExport('/expenses/export', 'Renovation_Expenses_Itemized', activeFilters, format);
    } catch (err) {
      alert(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const [editingExpense, setEditingExpense] = useState(null);

  const handleSaveExpense = async (data) => {
    setSubmitting(true);
    try {
      if (editingExpense) {
        await expenseApi.updateExpense(editingExpense._id, data);
      } else {
        await expenseApi.createExpense(data);
      }
      setIsAddModalOpen(false);
      setEditingExpense(null);
      fetchExpensesByDate();
    } finally {
      setSubmitting(false);
    }
  };

  const openDateModal = (group) => {
    setSelectedDateGroup(group);
    setIsDetailsModalOpen(true);
  };

  const activeFilterCount =
    (filterCategory ? 1 : 0) +
    (filterFestival ? 1 : 0) +
    (filterMethod ? 1 : 0) +
    (filterFromDate ? 1 : 0) +
    (filterToDate ? 1 : 0);

  const formatDateDisplay = (dateStr) => {
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-900">Temple Expenses Ledger</h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Date-wise breakdown of renovation, Kumbabishekam, ritual, and operational costs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="p-2 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors border border-stone-300 disabled:opacity-50 min-h-touch min-w-[44px] flex items-center justify-center"
            title="Download Itemized CSV"
          >
            <Download className="w-4 h-4 text-stone-700" />
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            disabled={exporting}
            className="p-2 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-300 disabled:opacity-50 min-h-touch min-w-[44px] flex items-center justify-center"
            title="Download Itemized Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
          </button>

          {!isViewer && (
            <button
              onClick={() => {
                setEditingExpense(null);
                setIsAddModalOpen(true);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all min-h-touch"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Grand Total Summary Card */}
      <div className="bg-gradient-to-r from-slate-900 via-stone-900 to-amber-950 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Receipt className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 block mb-1">
              {activeFilterCount > 0 ? 'Filtered Total Spent' : 'Grand Total Spent'}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {formatINR(grandTotalPaise)}
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              Across {pagination.total} recorded expense dates
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs bg-slate-800/60 px-4 py-3 rounded-xl border border-slate-700/80">
          <div className="text-right">
            <div className="text-amber-400 font-semibold">Date-Wise View Active</div>
            <div className="text-slate-400 text-[11px]">Click "View" on any date to inspect line items</div>
          </div>
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
            <select
              value={filterFestival}
              onChange={(e) => updateParam('festivalId', e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white font-medium text-stone-700 focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-touch"
            >
              <option value="">All Festivals / Events</option>
              {festivalsList.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name} ({f.year})
                </option>
              ))}
            </select>

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

      {/* Date-Grouped Main List */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : dateGroups.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            No expenses found matching the selected filters.
          </div>
        ) : (
          <>
            {/* Mobile Cards View (< md) */}
            <div className="md:hidden divide-y divide-stone-100 p-3 space-y-3">
              {dateGroups.map((group) => (
                <div
                  key={group.date}
                  className="bg-stone-50/70 p-4 rounded-xl border border-stone-200 space-y-3 hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-slate-900 font-bold font-serif text-base">
                        <Calendar className="w-4 h-4 text-amber-600" />
                        <span>{formatDateDisplay(group.date)}</span>
                      </div>
                      <span className="text-xs font-mono text-slate-500 block mt-0.5">{group.date}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-extrabold text-amber-700 block">
                        {formatINR(group.totalAmountPaise)}
                      </span>
                      <span className="inline-block px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[11px] font-medium mt-0.5">
                        {group.itemCount} {group.itemCount === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-200 flex justify-end">
                    <button
                      onClick={() => openDateModal(group)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors min-h-touch"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-600" />
                      <span>View Items ({group.itemCount})</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-600 uppercase tracking-wider">
                    <th className="p-4">Date</th>
                    <th className="p-4">Formatted Date</th>
                    <th className="p-4 text-center">Number of Items</th>
                    <th className="p-4 text-right">Total Spent That Day</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm text-stone-800">
                  {dateGroups.map((group) => (
                    <tr key={group.date} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-mono text-xs font-semibold text-slate-600">{group.date}</td>
                      <td className="p-4 font-serif font-bold text-slate-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-600" />
                        <span>{formatDateDisplay(group.date)}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-semibold rounded-full border border-slate-200">
                          {group.itemCount} {group.itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-extrabold text-amber-800 text-base">
                        {formatINR(group.totalAmountPaise)}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => openDateModal(group)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-600" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <Pagination pagination={pagination} onPageChange={(page) => updateParam('page', page.toString())} />
      </div>

      {/* Date Expense Details Modal */}
      <DateExpenseDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        dateGroup={selectedDateGroup}
        isAdmin={isAdmin}
        isCommitteeOrAdmin={!isViewer}
        onExpenseCancelled={fetchExpensesByDate}
        onEditExpense={(item) => {
          setEditingExpense(item);
          setIsAddModalOpen(true);
        }}
      />

      {/* Add / Edit Expense Modal */}
      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingExpense(null);
        }}
        onSubmit={handleSaveExpense}
        loading={submitting}
        initialData={editingExpense}
      />
    </div>
  );
}
