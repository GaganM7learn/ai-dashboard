import React from 'react';
import { Award, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { CustomerPrediction } from '../../types';

interface RankingsViewProps {
  rankings: {
    total_ranked: number;
    cumulative_curve: { rank_pct: number; cumulative_value_pct: number; customer_count: number }[];
    top_rankings: CustomerPrediction[];
  } | null;
  isLoading: boolean;
}

export const RankingsView: React.FC<RankingsViewProps> = ({ rankings, isLoading }) => {
  if (isLoading || !rankings) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-7 h-7 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Computing official business value ranking curve...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-xl shadow-md border border-blue-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">
              <Award className="w-4 h-4 text-amber-400" /> Official Business Value Ranking Criterion
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Expected Business Value (EBV) = Purchase Probability × Forecast Value
            </h2>
            <p className="text-xs text-blue-200/80 mt-1 max-w-2xl">
              Customers are sorted in strict descending order of expected revenue yield. The official 20% budget constraint allocates resources to the steep left portion of the cumulative value curve.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-lg border border-white/20 text-center min-w-[140px]">
            <div className="text-[11px] text-blue-200">Total Ranked Cohort</div>
            <div className="text-2xl font-bold text-white">{rankings.total_ranked}</div>
            <div className="text-[10px] text-amber-300 font-medium mt-0.5">100% Eligible Evaluated</div>
          </div>
        </div>
      </div>

      {/* Cumulative Value Curve */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" /> Cumulative Expected Revenue Curve (Pareto Lift)
            </h3>
            <p className="text-xs text-slate-500">
              Visualizes the concentration of expected value across customer percentiles.
            </p>
          </div>
          <div className="text-xs bg-amber-50 text-amber-800 px-3 py-1 rounded-full border border-amber-200 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Top 20% Yields ~60% of Value
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rankings.cumulative_curve} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="rank_pct" 
                tick={{ fontSize: 11, fill: '#64748B' }} 
                tickFormatter={(val) => `Top ${val}%`} 
                axisLine={{ stroke: '#CBD5E1' }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#64748B' }} 
                tickFormatter={(val) => `${val}%`} 
                domain={[0, 100]}
                axisLine={false}
              />
              <Tooltip 
                formatter={(val: any) => [`${val}% of Total Value`, 'Cumulative Share']}
                labelFormatter={(lbl) => `Top ${lbl}% Ranked Customers`}
                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#F8FAFC', fontSize: '12px' }}
              />
              <Line 
                type="monotone" 
                dataKey="cumulative_value_pct" 
                stroke="#F59E0B" 
                strokeWidth={3} 
                dot={{ r: 3, fill: '#F59E0B' }} 
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Ranked Customer Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Top Ranked Customers Leaderboard
          </h3>
          <span className="text-xs text-slate-500">Showing top 50 ranked customer profiles</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Rank Position</th>
                <th className="py-3 px-4">Customer ID</th>
                <th className="py-3 px-4">Purchase Likelihood</th>
                <th className="py-3 px-4">Forecast Purchase Value</th>
                <th className="py-3 px-4">Expected Business Value (EBV)</th>
                <th className="py-3 px-4 text-center">Shortlist Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rankings.top_rankings.map((cust) => (
                <tr key={cust.customer_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      cust.business_value_rank <= 3
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : cust.business_value_rank <= 20
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      #{cust.business_value_rank}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">{cust.customer_id}</td>
                  <td className="py-2.5 px-4 font-semibold text-slate-800">
                    {(cust.purchase_probability * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">
                    £{cust.predicted_purchase_value.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-blue-700">
                    £{cust.expected_business_value.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {cust.is_selected ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Shortlisted
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

