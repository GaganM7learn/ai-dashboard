import React from 'react';
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Sparkles, 
  ArrowRight 
} from 'lucide-react';
import { BusinessInsightsData } from '../../types';

interface InsightsViewProps {
  data: BusinessInsightsData | null;
  isLoading: boolean;
  onNavigateTab: (tab: any) => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ data, isLoading, onNavigateTab }) => {
  if (isLoading || !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-7 h-7 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Extracting behavioral business insights from cohort data...</p>
        </div>
      </div>
    );
  }

  const { summary, insights_cards } = data;

  const getCardStyle = (type: string) => {
    switch (type) {
      case 'opportunity':
        return {
          border: 'border-blue-200',
          bg: 'bg-blue-50/50',
          badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Sparkles,
          iconColor: 'text-blue-600'
        };
      case 'warning':
        return {
          border: 'border-amber-200',
          bg: 'bg-amber-50/50',
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: AlertTriangle,
          iconColor: 'text-amber-600'
        };
      case 'success':
        return {
          border: 'border-emerald-200',
          bg: 'bg-emerald-50/50',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: TrendingUp,
          iconColor: 'text-emerald-600'
        };
      default:
        return {
          border: 'border-rose-200',
          bg: 'bg-rose-50/50',
          badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: RotateCcw,
          iconColor: 'text-rose-600'
        };
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 mb-1">High Propensity Cohort</div>
          <div className="text-2xl font-bold text-blue-600">{summary.high_probability_cohort_size}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            £{summary.high_probability_pipeline_value.toFixed(2)} pipeline value
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 mb-1">At-Risk Churn Segment</div>
          <div className="text-2xl font-bold text-amber-600">{summary.churn_risk_cohort_size}</div>
          <div className="text-[11px] text-slate-500 mt-1">Dormant past 60 days</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 mb-1">Momentum Upsell Segment</div>
          <div className="text-2xl font-bold text-emerald-600">{summary.momentum_cohort_size}</div>
          <div className="text-[11px] text-slate-500 mt-1">Active in last 30d with repeat orders</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 mb-1">High Return Accounts</div>
          <div className="text-2xl font-bold text-rose-600">{summary.high_return_cohort_size}</div>
          <div className="text-[11px] text-slate-500 mt-1">&gt; 15% historical return rate</div>
        </div>
      </div>

      {/* Structured Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {insights_cards.map((card) => {
          const style = getCardStyle(card.type);
          const Icon = style.icon;
          return (
            <div
              key={card.id}
              className={`p-6 rounded-xl border ${style.border} ${style.bg} bg-white shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${style.badgeBg}`}>
                    {card.badge}
                  </span>
                  <Icon className={`w-4 h-4 ${style.iconColor}`} />
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-2">{card.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {card.description}
                </p>

                <div className="bg-white/80 p-3.5 rounded-lg border border-slate-200/80 mb-4">
                  <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Recommended Action
                  </div>
                  <div className="text-xs text-slate-800 font-medium">
                    {card.action}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 text-xs">
                <span className="font-semibold text-slate-900">{card.impact}</span>
                <button
                  onClick={() => onNavigateTab('predictions')}
                  className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  Inspect Cohort <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

