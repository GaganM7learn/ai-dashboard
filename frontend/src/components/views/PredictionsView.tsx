import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  CheckCircle2, 
  XCircle,
  Download
} from 'lucide-react';
import { CustomerPrediction } from '../../types';

interface PredictionsViewProps {
  customers: CustomerPrediction[];
  total: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  tierFilter: string;
  onTierChange: (t: string) => void;
  selectedFilter: string;
  onSelectedFilterChange: (s: string) => void;
  isLoading: boolean;
}

export const PredictionsView: React.FC<PredictionsViewProps> = ({
  customers,
  total,
  currentPage,
  pageSize,
  onPageChange,
  searchQuery,
  onSearchChange,
  tierFilter,
  onTierChange,
  selectedFilter,
  onSelectedFilterChange,
  isLoading
}) => {
  const [sortField, setSortField] = useState<'rank' | 'prob' | 'value' | 'spend'>('rank');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (field: 'rank' | 'prob' | 'value' | 'spend') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'rank');
    }
  };

  const sortedCustomers = [...customers].sort((a, b) => {
    let diff = 0;
    if (sortField === 'rank') diff = a.business_value_rank - b.business_value_rank;
    else if (sortField === 'prob') diff = b.purchase_probability - a.purchase_probability;
    else if (sortField === 'value') diff = b.predicted_purchase_value - a.predicted_purchase_value;
    else if (sortField === 'spend') diff = b.historical_spend - a.historical_spend;
    return sortAsc ? diff : -diff;
  });

  const totalPages = Math.ceil(total / pageSize) || 1;

  const exportCSV = () => {
    const headers = [
      'Customer ID',
      'Purchase Probability',
      'Predicted Purchase Value (£)',
      'Expected Business Value (£)',
      'Rank',
      'Historical Frequency',
      'Historical Spend (£)',
      'Recency (Days)',
      'Category',
      'Shortlist Selected'
    ];
    const rows = sortedCustomers.map(c => [
      c.customer_id,
      c.purchase_probability.toFixed(4),
      c.predicted_purchase_value.toFixed(2),
      c.expected_business_value.toFixed(2),
      c.business_value_rank,
      c.historical_frequency,
      c.historical_spend.toFixed(2),
      c.recency_days,
      c.customer_category,
      c.is_selected ? 'YES' : 'NO'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customer_purchase_predictions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'Very High':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Very High (&gt;75%)</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">High (50-75%)</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">Medium (25-50%)</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">Low (&lt;25%)</span>;
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Filter and Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by Customer ID or Segment..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Probability Tier Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Tier:</span>
            <select
              value={tierFilter}
              onChange={(e) => onTierChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
            >
              <option value="All">All Tiers</option>
              <option value="Very High">Very High (&gt;75%)</option>
              <option value="High">High (50-75%)</option>
              <option value="Medium">Medium (25-50%)</option>
              <option value="Low">Low (&lt;25%)</option>
            </select>
          </div>

          {/* Selection Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Shortlist:</span>
            <select
              value={selectedFilter}
              onChange={(e) => onSelectedFilterChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
            >
              <option value="All">All Cohort</option>
              <option value="Selected">Shortlisted Only (Top 20%)</option>
              <option value="Unselected">Not Shortlisted</option>
            </select>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('rank')}>
                  <div className="flex items-center gap-1">
                    Rank <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Customer ID</th>
                <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('prob')}>
                  <div className="flex items-center gap-1">
                    30d Purchase Probability <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('value')}>
                  <div className="flex items-center gap-1">
                    Forecast Value (£) <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Expected Business Value</th>
                <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('spend')}>
                  <div className="flex items-center gap-1">
                    Historical Orders <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Recency</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-center">Shortlist</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading predictions...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No customers match the active filters.
                  </td>
                </tr>
              ) : (
                sortedCustomers.map((cust) => (
                  <tr key={cust.customer_id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Rank */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                        cust.business_value_rank <= 20 
                          ? 'bg-amber-100 text-amber-900 font-bold' 
                          : 'text-slate-600'
                      }`}>
                        #{cust.business_value_rank}
                      </span>
                    </td>

                    {/* Customer ID */}
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {cust.customer_id}
                    </td>

                    {/* Purchase Probability */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 w-10">
                          {(cust.purchase_probability * 100).toFixed(1)}%
                        </span>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                          <div 
                            className={`h-full rounded-full ${
                              cust.purchase_probability >= 0.75 ? 'bg-emerald-500' :
                              cust.purchase_probability >= 0.50 ? 'bg-blue-500' :
                              cust.purchase_probability >= 0.25 ? 'bg-amber-500' : 'bg-slate-300'
                            }`}
                            style={{ width: `${Math.min(100, cust.purchase_probability * 100)}%` }}
                          />
                        </div>
                        {getTierBadge(cust.probability_tier)}
                      </div>
                    </td>

                    {/* Predicted Purchase Value */}
                    <td className="py-3 px-4 font-bold text-slate-900">
                      £{cust.predicted_purchase_value.toFixed(2)}
                    </td>

                    {/* Expected Business Value */}
                    <td className="py-3 px-4 font-semibold text-blue-700">
                      £{cust.expected_business_value.toFixed(2)}
                    </td>

                    {/* Historical Orders & Spend */}
                    <td className="py-3 px-4 text-slate-600">
                      <span className="font-semibold text-slate-800">{cust.historical_frequency}</span> orders (£{cust.historical_spend.toFixed(0)})
                    </td>

                    {/* Recency */}
                    <td className="py-3 px-4 text-slate-600">
                      {cust.recency_days} days ago
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {cust.customer_category}
                      </span>
                    </td>

                    {/* Shortlist Flag */}
                    <td className="py-3 px-4 text-center">
                      {cust.is_selected ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Selected
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] text-slate-400">
                          <XCircle className="w-3 h-3 mr-1" /> No
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="py-3 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold">{Math.min(1 + (currentPage - 1) * pageSize, total)}</span> to{' '}
            <span className="font-semibold">{Math.min(currentPage * pageSize, total)}</span> of{' '}
            <span className="font-semibold">{total}</span> customers
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
              className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

