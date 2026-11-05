import React from 'react';
import { 
  Target, 
  CheckCircle2, 
  Download, 
  TrendingUp, 
  ShieldCheck, 
  DollarSign, 
  Mail, 
  Send
} from 'lucide-react';
import { MarketingSelectionData } from '../../types';

interface SelectionViewProps {
  data: MarketingSelectionData | null;
  isLoading: boolean;
}

export const SelectionView: React.FC<SelectionViewProps> = ({ data, isLoading }) => {
  if (isLoading || !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-7 h-7 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Extracting official marketing shortlist...</p>
        </div>
      </div>
    );
  }

  const exportShortlistCSV = () => {
    const headers = ['Rank', 'Customer ID', 'Purchase Probability', 'Predicted Value (£)', 'Expected Business Value (£)', 'Recency Days', 'Historical Orders'];
    const rows = data.selected_customers.map(c => [
      c.business_value_rank,
      c.customer_id,
      (c.purchase_probability * 100).toFixed(1) + '%',
      c.predicted_purchase_value.toFixed(2),
      c.expected_business_value.toFixed(2),
      c.recency_days,
      c.historical_frequency
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `marketing_campaign_shortlist.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Selected Count */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Allocated Shortlist</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {data.selected_count} <span className="text-xs font-normal text-slate-500">/ {data.total_eligible_customers} eligible</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Exact 20% Budget Rule (Cap: {data.official_budget_cap})</span>
          </div>
        </div>

        {/* Selected Pipeline Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Shortlist Pipeline Revenue</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            £{data.total_predicted_revenue.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Expected Value: £{data.total_expected_business_value.toFixed(2)}
          </div>
        </div>

        {/* Campaign Cost */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Outreach Campaign Cost</span>
            <Mail className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            £{data.estimated_campaign_cost.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            £5.00 fixed cost per targeted customer
          </div>
        </div>

        {/* Projected Net Profit */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Projected Net Margin</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight">
            +£{data.projected_net_profit.toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            25% net gross margin assumption
          </div>
        </div>
      </div>

      {/* Action Header Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Official Marketing Campaign Cohort</h2>
          </div>
          <p className="text-xs text-slate-500">
            Selected using the official competition selection function in `solution.py`. Ineligible customers are strictly excluded.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportShortlistCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Shortlist CSV</span>
          </button>

          <button
            onClick={() => alert(`Simulating marketing dispatch to ${data.selected_count} high-intent customers...`)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-all shadow-sm shadow-amber-500/20 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Dispatch Campaign</span>
          </button>
        </div>
      </div>

      {/* Shortlist Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Priority Rank</th>
                <th className="py-3 px-4">Customer ID</th>
                <th className="py-3 px-4">Purchase Likelihood</th>
                <th className="py-3 px-4">Predicted Value (£)</th>
                <th className="py-3 px-4">Expected Business Value</th>
                <th className="py-3 px-4">Historical Orders</th>
                <th className="py-3 px-4">Recency</th>
                <th className="py-3 px-4">Segment</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.selected_customers.map((cust) => (
                <tr key={cust.customer_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-bold text-xs">
                      #{cust.business_value_rank}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{cust.customer_id}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900">
                      {(cust.purchase_probability * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    £{cust.predicted_purchase_value.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 font-bold text-blue-700">
                    £{cust.expected_business_value.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{cust.historical_frequency} purchases</td>
                  <td className="py-3 px-4 text-slate-600">{cust.recency_days}d ago</td>
                  <td className="py-3 px-4">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                      {cust.customer_category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Shortlisted
                    </span>
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

