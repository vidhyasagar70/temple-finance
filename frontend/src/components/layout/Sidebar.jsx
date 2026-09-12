import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import logo from '../../assets/logo.jpeg';
import {
  LayoutDashboard,
  Users,
  Receipt,
  HeartHandshake,
  Gift,
  Landmark,
  Percent,
  CreditCard,
  Hammer,
  Calendar,
  BookOpen,
  FileText,
  UserCheck,
  Settings,
  X,
} from 'lucide-react';

export function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Pangalis', path: '/pangalis', icon: Users },
    { name: 'Vari Collection', path: '/vari-collection', icon: Receipt },
    { name: 'Contributions', path: '/contributions', icon: HeartHandshake },
    { name: 'Donations', path: '/donations', icon: Gift },
    { name: 'Temple Fund', path: '/temple-fund', icon: Landmark },
    { name: 'Interest', path: '/interest', icon: Percent },
    { name: 'Expenses', path: '/expenses', icon: CreditCard },
    { name: 'Sirpi Expenses', path: '/sirpi-expenses', icon: Hammer },
    { name: 'Festivals', path: '/festivals', icon: Calendar },
    { name: 'Ledger', path: '/ledger', icon: BookOpen },
    { name: 'Reports', path: '/reports', icon: FileText },
    ...(isAdmin
      ? [
          { name: 'Users', path: '/users', icon: UserCheck },
          { name: 'Settings', path: '/settings', icon: Settings },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/60 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-forest-700 text-stone-100 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:sticky md:top-0 shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-forest-600">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow overflow-hidden border border-amber-300 shrink-0 p-0.5">
              <img src={logo} alt="Logo" className="w-full h-full object-cover rounded-full" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-sm font-bold text-amber-100 leading-tight truncate" title="அருள்மிகு சூராயம்மன் கோவில் துணை">
                அருள்மிகு சூராயம்மன் கோவில் துணை
              </h1>
              <p className="text-[10px] text-emerald-200 tracking-wider uppercase font-semibold">
                நிதி நிர்வாக அமைப்பு
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-stone-300 hover:text-white p-2 min-h-touch min-w-[44px] flex items-center justify-center"
            aria-label="Close Sidebar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-touch ${
                    isActive
                      ? 'bg-temple-600 text-white font-semibold shadow-xs'
                      : 'text-stone-200 hover:bg-forest-600 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0 opacity-90" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-forest-600 bg-forest-800/50 text-xs text-stone-300 pb-safe">
          <p className="font-semibold text-amber-200">அருள்மிகு சூராயம்மன் கோவில்</p>
          <p className="text-[11px] text-emerald-300/80">கணக்கு & நிதி நிர்வாக அமைப்பு</p>
        </div>
      </aside>
    </>
  );
}
