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
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { dashboardApi } from '../../api/dashboardApi';
import { formatINR, paiseToWords } from '../../utils/money';
import { downloadExport } from '../../utils/exportHelper';

export function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

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

  const handleExport = async (format) => {
    setExporting(true);
    try {
      await downloadExport('/dashboard/export', 'Dashboard_Financial_Summary', {}, format);
    } catch (err) {
      alert(err.message || 'Export failed.');
    } finally {
      setExporting(false);
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
      title: 'பங்காளிகள் வரி வசூல் மொத்தம்',
      rawPaise: variTotal,
      value: loading ? '...' : formatINR(variTotal),
      words: loading ? '' : paiseToWords(variTotal),
      subtitle: `${summary?.pangaliCount || 0} பங்காளிகள் (${summary?.variCount || 0} வசூல்கள்)`,
      notice: 'வரி கணக்கு ஏடு',
      icon: Users,
      link: '/vari-collection',
      accentColor: 'border-l-4 border-l-amber-600 bg-amber-50/40 hover:bg-amber-50/70',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
      iconBg: 'text-amber-700 bg-amber-100/80',
      valueColor: 'text-amber-950 font-serif font-black text-2xl sm:text-3xl tracking-tight',
      wordsColor: 'text-amber-800 font-serif font-medium italic text-[11px] mt-1 leading-snug',
    },
    {
      id: 'donations',
      title: 'பண நன்கொடைகள் மொத்தம்',
      rawPaise: donationTotal,
      value: loading ? '...' : formatINR(donationTotal),
      words: loading ? '' : paiseToWords(donationTotal),
      subtitle: `${summary?.donationCount || 0} பண நன்கொடைகள் பதிவுகள்`,
      notice: 'நன்கொடை ஏடு',
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
      title: 'வரி வசூல் + நன்கொடை மொத்தம்',
      rawPaise: combinedVariAndDonation,
      value: loading ? '...' : formatINR(combinedVariAndDonation),
      words: loading ? '' : paiseToWords(combinedVariAndDonation),
      subtitle: 'வரி வசூல் மற்றும் பண நன்கொடை கூட்டுத்தொகை',
      notice: 'கூட்டுத்தொகை',
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
      title: 'கோவில் செலவுகள் மொத்தம்',
      rawPaise: expenseTotal,
      value: loading ? '...' : formatINR(expenseTotal),
      words: loading ? '' : paiseToWords(expenseTotal),
      subtitle: 'கும்பாபிஷேகம், திருப்பணி & பொது பராமரிப்பு',
      notice: 'செலவு ஏடு',
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
      title: 'சிற்பி வேலை செலவுகள்',
      rawPaise: sirpiTotal,
      value: loading ? '...' : formatINR(sirpiTotal),
      words: loading ? '' : paiseToWords(sirpiTotal),
      subtitle: `சிற்பி வேலை செலுத்துதல்கள் (${summary?.sirpiCount || 0} பதிவுகள்)`,
      notice: 'சிற்பி செலவு ஏடு',
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
      title: 'தற்போதைய நிலுவை இருப்பு',
      rawPaise: currentBalance,
      value: loading ? '...' : formatINR(currentBalance),
      words: loading ? '' : paiseToWords(currentBalance),
      subtitle: 'அனைத்து செலவுகளுக்கும் போக உள்ள நிகர ரொக்க இருப்பு',
      notice: 'நிகர கணக்கு இருப்பு',
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
      title: 'பொருள் வடிவிலான பங்களிப்புகள்',
      value: loading ? '...' : formatINR(summary?.totalContributionReceivedPaise || 0),
      words: loading ? '' : paiseToWords(summary?.totalContributionReceivedPaise || 0),
      subtitle: 'பொருட்கள் மற்றும் வரவுகள்',
      icon: HeartHandshake,
      link: '/contributions',
    },
    {
      title: 'பெறப்பட்ட வட்டி மொத்தம்',
      value: loading ? '...' : formatINR(summary?.totalInterestReceivedPaise || 0),
      words: loading ? '' : paiseToWords(summary?.totalInterestReceivedPaise || 0),
      subtitle: 'வங்கி & கடன் வட்டி வருவாய்கள்',
      icon: Percent,
      link: '/interest',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header with Title and Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900">நிதி நிலை மேலோட்டம்</h1>
          <p className="text-sm text-stone-600 mt-0.5">
            மைய கணக்கு ஏட்டிலிருந்து நேரடி நிதி விபரங்கள் (Real-time Financial Dashboard)
          </p>
        </div>

        {/* Dashboard Export Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            title="Export Excel (With Temple Logo Banner)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Notice Badge */}
      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-3 text-amber-950 shadow-2xs">
        <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold">மின்னணு கணக்கு ஏடு நேரலையில் உள்ளது</h4>
          <p className="text-xs text-amber-900/80 mt-0.5">
            அனைத்து நிதி அளவீடுகளும் (சிற்பி செலவுகள் உட்பட) நேரடி கணக்கு ஏட்டின் அடிப்படையில் துல்லியமாக காட்டப்படுகின்றன.
          </p>
        </div>
      </div>

      {/* Core Dashboard Cards */}
      <div>
        <h2 className="text-base font-bold font-serif text-stone-800 mb-4 flex items-center gap-2">
          <Scale className="w-4 h-4 text-amber-600" />
          <span>முக்கிய நிதி சுருக்கம் (Core Financial Summary)</span>
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
                      className={`text-xs font-bold ${
                        card.isDark ? 'text-amber-300' : 'text-stone-800'
                      }`}
                    >
                      {card.title}
                    </span>
                    <div className={`w-9 h-9 rounded-xl shadow-2xs flex items-center justify-center shrink-0 ${card.iconBg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="mt-3">
                    {/* Rupee Amount */}
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
                    பார்க்க <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Secondary Metrics */}
      <h2 className="text-base font-bold font-serif text-stone-800 pt-2">கூடுதல் கணக்கு விபரம் (Additional Ledger Summary)</h2>
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
        <h3 className="text-lg font-bold font-serif text-stone-900 mb-2">நிதி கணக்கு மேலாண்மை அமைப்பு</h3>
        <p className="text-sm text-stone-600 leading-relaxed">
          அருள்மிகு சூராயம்மன் கோவில் நிதி மேலாண்மை அமைப்பு மூலம் பங்காளிகள் வரி செலுத்தல், நன்கொடைகள், பொதுச் செலவுகள் மற்றும் சிற்பி செலவுகள் நேரடி கணக்கு ஏட்டிலிருந்து துல்லியமாக கணக்கிடப்பட்டு பராமரிக்கப்படுகின்றன.
        </p>
      </div>
    </div>
  );
}

