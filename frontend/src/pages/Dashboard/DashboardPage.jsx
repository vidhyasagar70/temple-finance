import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '../../components/common/StatCard';
import {
  Wallet,
  Gift,
  Percent,
  Users,
  ArrowRight,
  Coins,
  TrendingDown,
  Scale,
  HeartHandshake,
  CheckCircle2,
  Hammer,
} from 'lucide-react';
import { dashboardApi } from '../../api/dashboardApi';
import { formatINR, paiseToWords } from '../../utils/money';

export function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getSummary();
      if (res?.success) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const variTotal = summary?.totalVariReceivedPaise || 0;
  const donationTotal = summary?.totalDonationReceivedPaise || 0;
  const combinedVariAndDonation = summary?.totalVariAndDonationPaise ?? (variTotal + donationTotal);
  const expenseTotal = summary?.totalExpensePaise || 0;
  const sirpiTotal = summary?.totalSirpiExpensePaise || 0;
  const currentBalance = summary?.currentBalancePaise || 0;

  const coreCards = [
    {
      id: 'vari',
      title: 'Total Pangali Vari Collection',
      rawPaise: variTotal,
      value: loading ? '...' : formatINR(variTotal),
      words: loading ? '' : paiseToWords(variTotal),
      subtitle: `From ${summary?.pangaliCount || 0} registered Pangalis (${summary?.variCount || 0} payments)`,
      notice: 'Vari Ledger',
      icon: Users,
      link: '/vari',
      accentColor: 'border-l-4 border-l-amber-600 bg-amber-50/40 hover:bg-amber-50/70',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
      iconBg: 'text-amber-700 bg-amber-100/80',
      valueColor: 'text-amber-950 font-serif font-black text-2xl sm:text-3xl tracking-tight',
      wordsColor: 'text-amber-800 font-serif font-medium italic text-[11px] mt-1 leading-snug',
    },
    {
      id: 'donations',
      title: 'Total Cash Donations Received',
      rawPaise: donationTotal,
      value: loading ? '...' : formatINR(donationTotal),
      words: loading ? '' : paiseToWords(donationTotal),
      subtitle: `${summary?.donationCount || 0} cash offerings in Donations Ledger`,
      notice: 'Donations Ledger',
      icon: Gift,
      link: '/donations',
      accentColor: 'border-l-4 border-l-emerald-600 bg-emerald-50/40 hover:bg-emerald-50/70',
      badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      iconBg: 'text-emerald-700 bg-emerald-100/80',
      valueColor: 'text-emerald-950 font-serif font-black text-2xl sm:text-3xl tracking-tight',
      wordsColor: 'text-emerald-800 font-serif font-medium italic text-[11px] mt-1 leading-snug',
    },
    {
      id: 'combined',
      title: 'Vari Collection + Cash Donations',
      rawPaise: combinedVariAndDonation,
      value: loading ? '...' : formatINR(combinedVariAndDonation),
      words: loading ? '' : paiseToWords(combinedVariAndDonation),
      subtitle: 'Combined total from Vari + Cash Donations',
      notice: 'Sum of Vari & Cash',
      icon: Coins,
      link: '/reports',
      accentColor: 'border-l-4 border-l-blue-600 bg-blue-50/40 hover:bg-blue-50/70',
      badgeBg: 'bg-blue-100 text-blue-900 border-blue-200',
      iconBg: 'text-blue-700 bg-blue-100/80',
      valueColor: 'text-blue-950 font-serif font-black text-2xl sm:text-3xl tracking-tight',
      wordsColor: 'text-blue-800 font-serif font-medium italic text-[11px] mt-1 leading-snug',
    },
    {
      id: 'expenses',
      title: 'Temple Expenses Done',
      rawPaise: expenseTotal,
      value: loading ? '...' : formatINR(expenseTotal),
      words: loading ? '' : paiseToWords(expenseTotal),
      subtitle: 'Renovation, Kumbabishekam & operational costs',
      notice: 'Expenses Ledger',
      icon: TrendingDown,
      link: '/expenses',
      accentColor: 'border-l-4 border-l-rose-600 bg-rose-50/40 hover:bg-rose-50/70',
      badgeBg: 'bg-rose-100 text-rose-900 border-rose-200',
      iconBg: 'text-rose-700 bg-rose-100/80',
      valueColor: 'text-rose-950 font-serif font-black text-2xl sm:text-3xl tracking-tight',
      wordsColor: 'text-rose-800 font-serif font-medium italic text-[11px] mt-1 leading-snug',
    },
    {
      id: 'sirpi',
      title: 'Sirpi Expenses (சிற்பி செலவு)',
      rawPaise: sirpiTotal,
      value: loading ? '...' : formatINR(sirpiTotal),
      words: loading ? '' : paiseToWords(sirpiTotal),
      subtitle: `Sculpture work payments (${summary?.sirpiCount || 0} records)`,
      notice: 'Sirpi Ledger',
      icon: Hammer,
      link: '/sirpi-expenses',
      accentColor: 'border-l-4 border-l-orange-600 bg-orange-50/40 hover:bg-orange-50/70',
      badgeBg: 'bg-orange-100 text-orange-900 border-orange-200',
      iconBg: 'text-orange-700 bg-orange-100/80',
      valueColor: 'text-orange-950 font-serif font-black text-2xl sm:text-3xl tracking-tight',
      wordsColor: 'text-orange-800 font-serif font-medium italic text-[11px] mt-1 leading-snug',
    },
    {
      id: 'balance',
      title: 'Current Balance',
      rawPaise: currentBalance,
      value: loading ? '...' : formatINR(currentBalance),
      words: loading ? '' : paiseToWords(currentBalance),
      subtitle: 'Net available cash balance after all expenses',
      notice: 'Live Net Balance',
      icon: Wallet,
      link: '/reports',
      accentColor: 'border-l-4 border-l-slate-900 bg-slate-900 text-white hover:bg-slate-850 shadow-sm',
      badgeBg: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
      iconBg: 'text-amber-400 bg-slate-800',
      valueColor: 'text-amber-400 font-serif font-black text-2xl sm:text-3xl tracking-tight',
      wordsColor: 'text-slate-300 font-serif font-medium italic text-[11px] mt-1 leading-snug',
      isDark: true,
    },
  ];

  const secondaryCards = [
    {
      title: 'Total In-Kind Contributions',
      value: loading ? '...' : formatINR(summary?.totalContributionReceivedPaise || 0),
      words: loading ? '' : paiseToWords(summary?.totalContributionReceivedPaise || 0),
      subtitle: 'Material & non-cash estimates',
      icon: HeartHandshake,
      link: '/contributions',
    },
    {
      title: 'Total Interest Received',
      value: loading ? '...' : formatINR(summary?.totalInterestReceivedPaise || 0),
      words: loading ? '' : paiseToWords(summary?.totalInterestReceivedPaise || 0),
      subtitle: 'Fund advance & bank interest',
      icon: Percent,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900">Financial Overview</h1>
          <p className="text-sm text-stone-600 mt-0.5">
            Real-time financial breakdown derived strictly from the central immutable ledger.
          </p>
        </div>
      </div>

      {/* Notice Badge */}
      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-3 text-amber-950 shadow-2xs">
        <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold">Ledger Integration Active</h4>
          <p className="text-xs text-amber-900/80 mt-0.5">
            All financial metrics (including Sirpi Expenses) display live ledger totals with full rupee word representations. Current Balance reflects net cash balance.
          </p>
        </div>
      </div>

      {/* Core Dashboard Cards */}
      <div>
        <h2 className="text-base font-bold font-serif text-stone-800 mb-4 flex items-center gap-2">
          <Scale className="w-4 h-4 text-amber-600" />
          <span>Core Financial Summary</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coreCards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.id}
                to={card.link}
                className={`flex flex-col justify-between rounded-2xl border border-stone-200 p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 ${card.accentColor}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        card.isDark ? 'text-slate-300' : 'text-stone-700'
                      }`}
                    >
                      {card.title}
                    </span>
                    <div className={`w-9 h-9 rounded-xl shadow-2xs flex items-center justify-center shrink-0 ${card.iconBg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="mt-3">
                    {/* Rupee Amount with Styled Serif Typography */}
                    <div className={card.valueColor}>
                      {card.value}
                    </div>

                    {/* Amount in Words */}
                    {!loading && card.words && (
                      <p className={card.wordsColor}>
                        {card.words}
                      </p>
                    )}

                    <p className={`text-xs mt-2 font-medium ${card.isDark ? 'text-slate-400' : 'text-stone-600'}`}>
                      {card.subtitle}
                    </p>
                  </div>
                </div>

                <div className={`mt-4 flex items-center justify-between border-t pt-2.5 ${card.isDark ? 'border-slate-800' : 'border-stone-200/80'}`}>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${card.badgeBg}`}>
                    {card.notice}
                  </span>

                  <span className={`inline-flex items-center gap-1 text-xs font-bold ${card.isDark ? 'text-amber-400 hover:text-amber-300' : 'text-stone-800 hover:text-stone-950'}`}>
                    View <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Secondary Metrics */}
      <h2 className="text-base font-bold font-serif text-stone-800 pt-2">Additional Ledger Summary</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {secondaryCards.map((card) => (
          <Link key={card.title} to={card.link} className="block">
            <StatCard
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
            />
          </Link>
        ))}
      </div>

      {/* System Status Block */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs">
        <h3 className="text-lg font-bold font-serif text-stone-900 mb-2">Immutable Financial Accounting</h3>
        <p className="text-sm text-stone-600 leading-relaxed">
          The temple accounting system computes live financial balances derived strictly from verified ledger entries across Pangali Vari payments, Cash Donations, General Expenses, and Sirpi Expenses.
        </p>
      </div>
    </div>
  );
}
