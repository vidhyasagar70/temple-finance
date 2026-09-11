export function StatusBadge({ status, type = 'active' }) {
  if (type === 'active') {
    const isActive = Boolean(status);
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          isActive
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-rose-50 text-rose-700 border-rose-200'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
            isActive ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        />
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  }

  if (type === 'role') {
    const roleStyles = {
      ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
      COMMITTEE_MEMBER: 'bg-amber-50 text-amber-700 border-amber-200',
      VIEWER: 'bg-stone-100 text-stone-700 border-stone-200',
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
          roleStyles[status] || roleStyles.VIEWER
        }`}
      >
        {status ? status.replace('_', ' ') : 'VIEWER'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800 border border-stone-200">
      {String(status)}
    </span>
  );
}
