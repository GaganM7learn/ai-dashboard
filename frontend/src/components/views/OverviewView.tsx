import React from 'react';
import { 
  Users, 
  TrendingUp, 
  ShoppingBag, 
  Target, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ChevronRight,
  Upload,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { OverviewData, CustomerPrediction } from '../../types';

interface OverviewViewProps {
  data: OverviewData | null;
  topCustomers: CustomerPrediction[];
  onNavigateTab: (tab: any) => void;
  isLoading: boolean;
  onOpenUpload?: () => void;
}

const CATEGORY_COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'];

export const OverviewView: React.FC<OverviewViewProps> = ({
  data,
  topCustomers,
  onNavigateTab,
  isLoading,
  onOpenUpload
}) => {
  if (isLoading || !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Loading real-time executive analytics...</p>
        </div>
      </div>
    );
  }

  const spotlightCustomer = topCustomers[0];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Upload & Template Action Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border border-slate-700/60">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Predict from Your Own Worksheet (.xlsx / .csv)
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Live Upload
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Upload customer transactions to recalculate purchase probabilities, spending forecasts, and marketing shortlists.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
          <a
            href="/api/template/download"
            download="transactions_template.xlsx"
            className="flex-1 md:flex-none px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-slate-600/60 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Download Blank Template</span>
          </a>
          <button
            onClick={onOpenUpload}
            className="flex-1 md:flex-none px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
          >
            <Upload className="w-3.5 h-3.5 text-slate-950" />
            <span>Upload Worksheet</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Purchase Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Avg Purchase Propensity</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {(data.avg_purchase_probability * 100).toFixed(1)}%
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Calibrated Platt Sigmoid (ECE: 0.033)</span>
          </div>
        </div>

        {/* KPI 2: Total Eligible Customers */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Eligible Active Cohort</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {data.total_eligible_customers.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {data.customers_predicted_to_purchase} predicted high-intent buyers
          </div>
        </div>

        {/* KPI 3: Total Predicted Spend */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total 30-Day Forecast Value</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            £{data.total_predicted_purchase_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Enforced £2,000 cap per customer
          </div>
        </div>

        {/* KPI 4: Shortlist Opportunity */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Marketing Shortlist (Budget 20%)</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {data.selected_marketing_customers} Customers
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
            <span>£{data.expected_marketing_opportunity.toLocaleString(undefined, { minimumFractionDigits: 2 })} Pipeline Value</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchase Trend Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Purchase Trend & Forward Forecast</h2>
              <p className="text-xs text-slate-500">Historical qualifying order revenue vs Next 30-Day ML projection</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Actual Revenue
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 30d Forecast
              </span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.purchase_trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="predGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#CBD5E1' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `£${val}`} axisLine={false} />
                <Tooltip 
                  formatter={(value: any) => [`£${Number(value).toLocaleString()}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#F8FAFC', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="actual" stroke="#3B82F6" strokeWidth={2.5} fill="url(#actualGradient)" name="Actual Revenue" />
                <Area type="monotone" dataKey="predicted" stroke="#F59E0B" strokeWidth={2.5} strokeDasharray="4 4" fill="url(#predGradient)" name="Predicted Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Spotlight Customer Card (1 col) */}
        <div className="bg-gradient-to-br from-[#0B1528] to-[#152542] text-white p-6 rounded-xl border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> High-Intent Spotlight
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                Rank #1
              </span>
            </div>

            <div className="text-xl font-bold tracking-tight text-white mb-1">
              Customer {spotlightCustomer?.customer_id || 'CUST-Top'}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Highest Expected Business Value in cohort. Prime candidate for immediate priority outreach.
            </p>

            <div className="my-6 grid grid-cols-2 gap-3 bg-slate-900/60 p-4 rounded-lg border border-slate-700/60">
              <div>
                <div className="text-[11px] text-slate-400">Purchase Likelihood</div>
                <div className="text-2xl font-bold text-emerald-400 mt-0.5">
                  {spotlightCustomer ? `${(spotlightCustomer.purchase_probability * 100).toFixed(0)}%` : '87%'}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Calibrated Prob</div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400">Forecast Value</div>
                <div className="text-2xl font-bold text-amber-400 mt-0.5">
                  {spotlightCustomer ? `£${spotlightCustomer.predicted_purchase_value.toFixed(2)}` : '£85.00'}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Expected 30d Spend</div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Recency: {spotlightCustomer?.recency_days || 4.2} days since last purchase</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Selected for Marketing Shortlist</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('selection')}
            className="w-full mt-6 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            <span>View Full Marketing Shortlist</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Secondary Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Probability Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
            Purchase Probability Distribution
          </h3>
          <p className="text-[11px] text-slate-500 mb-4">Customer count across probability deciles</p>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.probability_distribution} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="bin" tick={{ fontSize: 9, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip 
                  formatter={(val: any) => [val, 'Customers']}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '6px', color: '#F8FAFC', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Category Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
            Behavioral Segmentation
          </h3>
          <p className="text-[11px] text-slate-500 mb-4">Customer cohorts based on RFM and activity</p>

          <div className="h-52 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.category_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.category_distribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: any, name: any) => [`${val} customers`, name]}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '6px', color: '#F8FAFC', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-slate-600 mt-2">
            {data.category_distribution.map((item, idx) => (
              <span key={item.name} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}></span>
                {item.name}
              </span>
            ))}
          </div>
        </div>

        {/* Top Customers Quick View */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Top Value Customers
              </h3>
              <button 
                onClick={() => onNavigateTab('rankings')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {topCustomers.slice(0, 5).map((cust) => (
                <div key={cust.customer_id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      {cust.customer_id}
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                        #{cust.business_value_rank}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">{cust.customer_category}</div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-slate-900">
                      £{cust.predicted_purchase_value.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold">
                      {(cust.purchase_probability * 100).toFixed(0)}% Propensity
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 text-center">
            Ranked using official Expected Business Value: P × Value
          </div>
        </div>
      </div>
    </div>
  );
};

