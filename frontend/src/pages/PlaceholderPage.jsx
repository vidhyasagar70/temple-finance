import { Construction, Clock } from 'lucide-react';

export function PlaceholderPage({ title, description, icon: Icon }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-temple-50 text-temple-700 flex items-center justify-center border border-temple-200 shadow-2xs">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900">{title}</h1>
          {description && <p className="text-sm text-stone-600">{description}</p>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[360px]">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-200">
          <Construction className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold font-serif text-stone-900">Module Under Development</h3>
        <p className="text-sm text-stone-500 max-w-md mt-2 leading-relaxed">
          This module is under development — backend API coming soon. The navigation structure and router contracts are fully prepared.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-600">
          <Clock className="w-3.5 h-3.5 text-stone-400" />
          <span>Planned in upcoming release</span>
        </div>
      </div>
    </div>
  );
}
