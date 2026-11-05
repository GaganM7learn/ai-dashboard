import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Award, 
  Target, 
  Coins, 
  Lightbulb, 
  Activity, 
  Settings,
  ShieldCheck,
  Building2
} from 'lucide-react';

export type TabId = 
  | 'overview' 
  | 'analytics' 
  | 'predictions' 
  | 'rankings' 
  | 'selection' 
  | 'spending' 
  | 'insights' 
  | 'performance' 
  | 'settings';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  selectedCount?: number;
}

const NAV_ITEMS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'analytics', label: 'Customer Analytics', icon: Users },
  { id: 'predictions', label: 'Purchase Predictions', icon: TrendingUp },
  { id: 'rankings', label: 'Customer Rankings', icon: Award },
  { id: 'selection', label: 'Marketing Selection', icon: Target },
  { id: 'spending', label: 'Spending Forecast', icon: Coins },
  { id: 'insights', label: 'Business Insights', icon: Lightbulb },
  { id: 'performance', label: 'Model Performance', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, selectedCount = 20 }) => {
  return (
    <aside className="w-64 bg-[#0B1528] text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
          <Building2 className="w-5 h-5 text-slate-950" />
        </div>
        <div>
          <div className="font-semibold text-white tracking-tight text-sm flex items-center gap-1.5">
            Customer Intelligence
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono font-medium">AI</span>
          </div>
          <div className="text-[11px] text-slate-400">Enterprise Retail Suite</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Analytics & Predictions
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.id === 'selection' && selectedCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-slate-950 text-white' : 'bg-slate-800 text-amber-300 border border-slate-700'
                }`}>
                  {selectedCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800">
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-medium text-slate-200">Production Engine v2.1</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Models calibrated against strict 30d temporal cohorts. Cap £2,000 enforced.
          </p>
        </div>
      </div>
    </aside>
  );
};

