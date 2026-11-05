import React, { useState, useEffect } from 'react';
import { Sidebar, TabId } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewView } from './components/views/OverviewView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { PredictionsView } from './components/views/PredictionsView';
import { RankingsView } from './components/views/RankingsView';
import { SelectionView } from './components/views/SelectionView';
import { SpendingView } from './components/views/SpendingView';
import { InsightsView } from './components/views/InsightsView';
import { PerformanceView } from './components/views/PerformanceView';
import { SettingsView } from './components/views/SettingsView';
import { UploadModal } from './components/UploadModal';

import {
  fetchOverview,
  fetchPredictions,
  fetchRankings,
  fetchMarketingSelection,
  fetchSpendingForecast,
  fetchBusinessInsights,
  fetchModelPerformance,
  fetchSettings
} from './api';

import { 
  OverviewData, 
  CustomerPrediction, 
  MarketingSelectionData, 
  SpendingForecastData, 
  BusinessInsightsData, 
  ModelPerformanceData 
} from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Data states
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [predictionsData, setPredictionsData] = useState<{
    total: number;
    page: number;
    page_size: number;
    customers: CustomerPrediction[];
  }>({ total: 0, page: 1, page_size: 25, customers: [] });
  const [tierFilter, setTierFilter] = useState('All');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [rankingsData, setRankingsData] = useState<{
    total_ranked: number;
    cumulative_curve: { rank_pct: number; cumulative_value_pct: number; customer_count: number }[];
    top_rankings: CustomerPrediction[];
  } | null>(null);
  const [selectionData, setSelectionData] = useState<MarketingSelectionData | null>(null);
  const [spendingData, setSpendingData] = useState<SpendingForecastData | null>(null);
  const [insightsData, setInsightsData] = useState<BusinessInsightsData | null>(null);
  const [performanceData, setPerformanceData] = useState<ModelPerformanceData | null>(null);
  const [settingsData, setSettingsData] = useState<any>(null);

  // Load all initial data from real backend
  const loadAllData = async () => {
    setIsRefreshing(true);
    try {
      const results = await Promise.allSettled([
        fetchOverview(),
        fetchMarketingSelection(),
        fetchSpendingForecast(),
        fetchBusinessInsights(),
        fetchModelPerformance(),
        fetchSettings(),
        fetchRankings()
      ]);
      if (results[0].status === 'fulfilled') setOverview(results[0].value);
      if (results[1].status === 'fulfilled') setSelectionData(results[1].value);
      if (results[2].status === 'fulfilled') setSpendingData(results[2].value);
      if (results[3].status === 'fulfilled') setInsightsData(results[3].value);
      if (results[4].status === 'fulfilled') setPerformanceData(results[4].value);
      if (results[5].status === 'fulfilled') setSettingsData(results[5].value);
      if (results[6].status === 'fulfilled') setRankingsData(results[6].value);
      await loadPredictions(1, searchQuery, tierFilter, selectedFilter);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadPredictions = async (page = 1, q = searchQuery, tier = tierFilter, sel = selectedFilter) => {
    try {
      const res = await fetchPredictions({
        page,
        page_size: 25,
        q,
        tier: tier !== 'All' ? tier : undefined,
        selected: sel !== 'All' ? sel : undefined
      });
      setPredictionsData(res);
    } catch (err) {
      console.error('Error fetching predictions:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    loadPredictions(1, q, tierFilter, selectedFilter);
  };

  const handleTierChange = (t: string) => {
    setTierFilter(t);
    loadPredictions(1, searchQuery, t, selectedFilter);
  };

  const handleSelectedFilterChange = (s: string) => {
    setSelectedFilter(s);
    loadPredictions(1, searchQuery, tierFilter, s);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Dark Navy Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedCount={selectionData?.selected_count ?? 20}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onRefresh={loadAllData}
          isRefreshing={isRefreshing}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onOpenUpload={() => setIsUploadOpen(true)}
        />

        {/* View Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {activeTab === 'overview' && (
            <OverviewView
              data={overview}
              topCustomers={rankingsData?.top_rankings ?? []}
              onNavigateTab={setActiveTab}
              isLoading={isRefreshing && !overview}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              customers={predictionsData.customers}
              isLoading={isRefreshing && predictionsData.customers.length === 0}
            />
          )}

          {activeTab === 'predictions' && (
            <PredictionsView
              customers={predictionsData.customers}
              total={predictionsData.total}
              currentPage={predictionsData.page}
              pageSize={predictionsData.page_size}
              onPageChange={(p) => loadPredictions(p)}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              tierFilter={tierFilter}
              onTierChange={handleTierChange}
              selectedFilter={selectedFilter}
              onSelectedFilterChange={handleSelectedFilterChange}
              isLoading={isRefreshing}
            />
          )}

          {activeTab === 'rankings' && (
            <RankingsView
              rankings={rankingsData}
              isLoading={isRefreshing && !rankingsData}
            />
          )}

          {activeTab === 'selection' && (
            <SelectionView
              data={selectionData}
              isLoading={isRefreshing && !selectionData}
            />
          )}

          {activeTab === 'spending' && (
            <SpendingView
              data={spendingData}
              isLoading={isRefreshing && !spendingData}
            />
          )}

          {activeTab === 'insights' && (
            <InsightsView
              data={insightsData}
              isLoading={isRefreshing && !insightsData}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'performance' && (
            <PerformanceView
              data={performanceData}
              isLoading={isRefreshing && !performanceData}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              initialConfig={settingsData}
              onRefreshData={loadAllData}
            />
          )}
        </main>
      </div>

      {/* Upload Worksheet Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          loadAllData();
        }}
      />
    </div>
  );
};

export default App;
