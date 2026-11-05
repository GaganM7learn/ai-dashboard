import React from 'react';
import { Coins, ShoppingBag, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { SpendingForecastData } from '../../types';

interface SpendingViewProps {
  data: SpendingForecastData | null;
  isLoading: boolean;
}

export const SpendingView: React.FC<SpendingViewProps> = ({ data, isLoading }) => {
  if (isLoading || !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-7 h-7 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Aggregating 30-day monetary spending forecast...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Total Projected Spend</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            £{data.total_predicted_spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Cumulative 30-day forward spend</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Mean Purchase Value</span>
            <ShoppingBag className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            £{data.average_predicted_spend.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Per active eligible customer</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Median Purchase Value</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            £{data.median_predicted_spend.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Robust 50th percentile</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Maximum Individual Spend</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            £{data.max_predicted_spend.toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            Enforced £2,000 cap respected
          </div>
        </div>
      </div>

      {/* Spending Distribution Histogram */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Projected Spend Distribution</h2>
            <p className="text-xs text-slate-500">Number of customers falling within each predicted monetary tier</p>
          </div>
          <div className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium">
            30-Day Window Horizon
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.spend_distribution} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip 
                formatter={(val: any) => [`${val} Customers`, 'Cohort Size']}
                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#F8FAFC', fontSize: '12px' }}
              />
              <Bar dataKey="count" fill="#F59E0B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Highest Predicted Spenders */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Highest Projected Value Customers
          </h3>
          <p className="text-[11px] text-slate-500">Top individual predicted spenders for high-ticket account management</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Customer ID</th>
                <th className="py-3 px-4">Forecast Purchase Value</th>
                <th className="py-3 px-4">Purchase Probability</th>
                <th className="py-3 px-4">Expected Business Value</th>
                <th className="py-3 px-4">Historical Orders</th>
                <th className="py-3 px-4">Recency</th>
                <th className="py-3 px-4 text-center">Shortlist Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.top_spenders.map((cust) => (
                <tr key={cust.customer_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">{cust.customer_id}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">£{cust.predicted_purchase_value.toFixed(2)}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{(cust.purchase_probability * 100).toFixed(1)}%</td>
                  <td className="py-3 px-4 font-bold text-blue-700">£{cust.expected_business_value.toFixed(2)}</td>
                  <td className="py-3 px-4 text-slate-600">{cust.historical_frequency} orders</td>
                  <td className="py-3 px-4 text-slate-600">{cust.recency_days}d ago</td>
                  <td className="py-3 px-4 text-center">
                    {cust.is_selected ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Selected
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

