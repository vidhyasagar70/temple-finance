import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../common/StatusBadge';
import { Menu, LogOut, User } from 'lucide-react';

export function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-stone-200 shadow-2xs pt-safe">
      <div className="flex items-center justify-between px-3 py-2.5 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 focus:outline-none min-h-touch min-w-[44px] flex items-center justify-center"
            aria-label="Open Sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="hidden md:inline-block text-xs font-semibold text-temple-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            அருள்மிகு சூராயம்மன் கோவில் துணை
          </span>
          <span className="md:hidden text-xs font-bold text-amber-900 font-serif truncate max-w-[180px] xs:max-w-[220px]">
            அருள்மிகு சூராயம்மன் கோவில் துணை
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-full bg-forest-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs sm:text-sm font-bold text-stone-800 leading-tight truncate max-w-[130px]">
                {user?.name || 'User'}
              </span>
              <span className="text-[11px] text-stone-500 font-mono">{user?.phone}</span>
            </div>
            <div className="hidden xs:block">
              <StatusBadge status={user?.role} type="role" />
            </div>
          </div>

          <div className="h-6 w-px bg-stone-200 hidden sm:block" />

          <button
            onClick={logout}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors min-h-touch"
            title="Sign out of system"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
