import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { festivalApi } from '../../api/festivalApi';
import { useAuth } from '../../hooks/useAuth';
import { formatINR } from '../../utils/money';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AddFestivalModal } from './AddFestivalModal';
import { Plus, Calendar, Eye, Edit3, AlertCircle } from 'lucide-react';

export function FestivalsListPage() {
  const { user } = useAuth();
  const isViewer = user?.role === 'VIEWER';

  const [festivals, setFestivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFestival, setEditingFestival] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchFestivals = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await festivalApi.getFestivals({ year: selectedYear, limit: 100 });
      if (res.success) {
        setFestivals(res.data || []);
      } else {
        setError(res.message || 'Failed to load festivals');
      }
    } catch (err) {
      setError(err.message || 'Error loading festivals');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchFestivals();
  }, [fetchFestivals]);

  const handleSaveFestival = async (data) => {
    setSubmitting(true);
    try {
      if (editingFestival) {
        await festivalApi.updateFestival(editingFestival._id, data);
      } else {
        await festivalApi.createFestival(data);
      }
      setIsModalOpen(false);
      setEditingFestival(null);
      fetchFestivals();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-900">Temple Festivals</h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Manage annual temple festival budgets, special event dates, and financial summaries.
          </p>
        </div>

        {!isViewer && (
          <button
            onClick={() => {
              setEditingFestival(null);
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-temple-600 hover:bg-temple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all min-h-touch"
          >
            <Plus className="w-4 h-4" />
            <span>Add Festival</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-stone-200 p-3 sm:p-4 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-stone-500" />
          <label className="text-xs font-bold text-stone-600 uppercase">Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-bold bg-white text-stone-800 focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cards Grid */}
      {loading ? (
        <LoadingSpinner size="lg" />
      ) : festivals.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-500 shadow-2xs">
          No festivals recorded for {selectedYear} yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {festivals.map((f) => (
            <div
              key={f._id}
              className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-temple-700 bg-temple-50 border border-temple-200 px-2.5 py-0.5 rounded-full">
                    Year {f.year}
                  </span>
                  {!isViewer && (
                    <button
                      onClick={() => {
                        setEditingFestival(f);
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg min-h-touch min-w-[44px] flex items-center justify-center"
                      title="Edit festival budget & dates"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <h3 className="text-lg sm:text-xl font-bold font-serif text-stone-900 mt-2">{f.name}</h3>
                <p className="text-xs text-stone-500 mt-1">
                  {new Date(f.startDate).toLocaleDateString()} —{' '}
                  {new Date(f.endDate).toLocaleDateString()}
                </p>

                {f.description && (
                  <p className="text-xs text-stone-600 mt-2 line-clamp-2">{f.description}</p>
                )}

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-500 uppercase">
                    Sanctioned Budget
                  </span>
                  <span className="text-base sm:text-lg font-bold text-stone-900">
                    {formatINR(f.budgetPaise)}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100">
                <Link
                  to={`/festivals/${f._id}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-temple-700 bg-temple-50 hover:bg-temple-100 border border-temple-200 rounded-xl transition-colors min-h-touch"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Festival Detail</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <AddFestivalModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingFestival(null);
        }}
        onSubmit={handleSaveFestival}
        initialData={editingFestival}
        loading={submitting}
      />
    </div>
  );
}
