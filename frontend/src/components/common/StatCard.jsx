export function StatCard({ title, value, subtitle, icon: Icon, color = 'temple', notice }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{title}</p>
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-temple-50 text-temple-700 flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-3">
        <h3 className="text-2xl font-bold text-stone-900 tracking-tight">{value}</h3>
        {subtitle && <p className="text-xs text-stone-500 mt-1">{subtitle}</p>}
        {notice && (
          <span className="inline-block mt-2 text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
            {notice}
          </span>
        )}
      </div>
    </div>
  );
}
