import React from 'react';
import { RefreshCw, Bell, Search, Sparkles, Upload, Download } from 'lucide-react';
import { TabId } from './Sidebar';

interface HeaderProps {
  activeTab: TabId;
  onRefresh: () => void;
  isRefreshing: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenUpload: () => void;
}

const TAB_TITLES: Record<TabId, { title: string; subtitle: string }> = {
  overview: {
    title: 'Executive Overview',
    subtitle: 'High-level purchase propensity metrics, predicted revenue, and marketing opportunities.'
  },
  analytics: {
    title: 'Customer Analytics',
    subtitle: 'Deep-dive into customer RFM metrics, activity lifecycles, and return behavior patterns.'
  },
  predictions: {
    title: 'Customer Purchase Predictions',
    subtitle: 'Granular 30-day forward predictions, calibrated probabilities, and estimated purchase values.'
  },
  rankings: {
    title: 'Customer Rankings',
    subtitle: 'Customers ranked strictly by Expected Business Value (P × Value) for optimal resource allocation.'
  },
  selection: {
    title: 'Marketing Shortlist Selection',
    subtitle: 'Targeted customer cohort allocated according to the official 20% budget constraint (cap 20).'
  },
  spending: {
    title: 'Spending Forecast',
    subtitle: 'Projected monetary purchase value distribution with enforced £2,000 per-customer cap.'
  },
  insights: {
    title: 'Business Insights',
    subtitle: 'Actionable cohort intelligence derived from actual behavioral patterns and model signals.'
  },
  performance: {
    title: 'Model Performance & Validation',
    subtitle: 'Offline cross-validation benchmarks, Brier score error, ECE calibration, and value metrics.'
  },
  settings: {
    title: 'System Settings & Constraints',
    subtitle: 'Scoring parameters, budget rules, value boundaries, and pipeline health monitor.'
  }
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onRefresh,
  isRefreshing,
  searchQuery,
  onSearchChange,
  onOpenUpload
}) => {
  const current = TAB_TITLES[activeTab];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-xs">
      <div>
        <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          {current.title}
          <span className="inline-flex items-center gap-1 text-[11px] font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            <Sparkles className="w-3 h-3 text-amber-500" /> Next 30 Days
          </span>
        </h1>
        <p className="text-[11px] text-slate-500 hidden sm:block truncate max-w-xl">
          {current.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Quick Search */}
        <div className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Customer ID..."
            className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Upload Worksheet Button */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-all active:scale-95 shadow-2xs"
          title="Upload an Excel worksheet (.xlsx) to compute predictions"
        >
          <Upload className="w-3.5 h-3.5 text-amber-600" />
          <span>Upload Worksheet</span>
        </button>

        {/* Export Excel Button */}
        <a
          href="/api/predictions/export"
          download="customer_purchase_predictions.xlsx"
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95 shadow-2xs"
          title="Download predictions as an Excel spreadsheet"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Excel</span>
        </a>

        {/* Currency badge */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Currency: <span className="font-semibold text-slate-900">£ GBP</span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95 disabled:opacity-50 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-500' : 'text-slate-500'}`} />
          <span className="hidden sm:inline">{isRefreshing ? 'Computing...' : 'Refresh'}</span>
        </button>

        {/* Notifications Icon */}
        <div className="relative p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1.5 right-1.5 ring-2 ring-white"></span>
        </div>
      </div>
    </header>
  );
};

