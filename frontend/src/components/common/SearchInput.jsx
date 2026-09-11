import { Search, X } from 'lucide-react';

export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative w-full max-w-xs">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-stone-400" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-9 pr-8 py-2 border border-stone-300 rounded-lg bg-white text-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-temple-500 focus:border-temple-500 transition-colors"
        placeholder={placeholder}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-stone-400 hover:text-stone-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
