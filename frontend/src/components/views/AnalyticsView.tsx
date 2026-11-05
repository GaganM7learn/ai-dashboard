import React from 'react';
import { Users, BarChart3, Clock, RotateCcw, Award } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { CustomerPrediction } from '../../types';

interface AnalyticsViewProps {
  customers: CustomerPrediction[];
  isLoading: boolean;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ customers, isLoading }) => {
  if (isLoading || customers.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-7 h-7 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Computing deep-dive behavioral analytics...</p>
        </div>
      </div>
    );
  }

  // Recency Distribution
  const recencyBins = [
    { range: '< 15d', count: customers.filter(c => c.recency_days < 15).length },
    { range: '15 - 30d', count: customers.filter(c => c.recency_days >= 15 && c.recency_days < 30).length },
    { range: '30 - 60d', count: customers.filter(c => c.recency_days >= 30 && c.recency_days < 60).length },
    { range: '60 - 90d', count: customers.filter(c => c.recency_days >= 60 && c.recency_days < 90).length },
    { range: '90d+', count: customers.filter(c => c.recency_days >= 90).length }
  ];

  // Frequency Distribution
  const freqBins = [
    { orders: '1 order', count: customers.filter(c => c.historical_frequency === 1).length },
    { orders: '2 orders', count: customers.filter(c => c.historical_frequency === 2).length },
    { orders: '3-4 orders', count: customers.filter(c => c.historical_frequency >= 3 && c.historical_frequency <= 4).length },
    { orders: '5+ orders', count: customers.filter(c => c.historical_frequency >= 5).length }
  ];

  // Active vs Churned
  const activeCount = customers.filter(c => c.is_active_30d).length;
  const dormantCount = customers.length - activeCount;
  const statusPie = [
    { name: 'Active in Last 30d', value: activeCount },
    { name: 'Dormant (> 30d)', value: dormantCount }
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">30-Day Active Ratio</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {((activeCount / customers.length) * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{activeCount} active customers</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Repeat Purchase Rate</span>
            <BarChart3 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {((customers.filter(c => c.historical_frequency > 1).length / customers.length) * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">Multi-order buyers</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Average Recency</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {(customers.reduce((a, b) => a + b.recency_days, 0) / customers.length).toFixed(1)}d
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Mean days since last order</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Cohort Return Rate</span>
            <RotateCcw className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {(customers.reduce((a, b) => a + b.return_rate_pct, 0) / customers.length).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Behavioral return metric</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recency Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
            Customer Recency Breakdown
          </h3>
          <p className="text-[11px] text-slate-500 mb-4">Days elapsed since last qualifying transaction</p>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recencyBins} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip 
                  formatter={(val: any) => [`${val} Customers`, 'Cohort Size']}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '6px', color: '#F8FAFC', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Frequency Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
            Historical Order Frequency
          </h3>
          <p className="text-[11px] text-slate-500 mb-4">Total distinct invoice count per customer</p>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={freqBins} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="orders" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip 
                  formatter={(val: any) => [`${val} Customers`, 'Cohort Size']}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '6px', color: '#F8FAFC', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

