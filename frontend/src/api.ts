import { 
  CustomerPrediction, 
  OverviewData, 
  MarketingSelectionData, 
  SpendingForecastData, 
  BusinessInsightsData, 
  ModelPerformanceData 
} from './types';

const BASE_URL = (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api').replace(/\/+api$/, '/api');

export async function fetchOverview(): Promise<OverviewData> {
  const res = await fetch(`${BASE_URL}/overview`);
  if (!res.ok) throw new Error('Failed to load overview data');
  return res.json();
}

export async function fetchPredictions(params?: {
  q?: string;
  tier?: string;
  selected?: string;
  page?: number;
  page_size?: number;
}): Promise<{
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  customers: CustomerPrediction[];
}> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.tier) query.set('tier', params.tier);
  if (params?.selected) query.set('selected', params.selected);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.page_size) query.set('page_size', params.page_size.toString());

  const res = await fetch(`${BASE_URL}/predictions?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load predictions');
  return res.json();
}

export async function fetchRankings(): Promise<{
  total_ranked: number;
  cumulative_curve: { rank_pct: number; cumulative_value_pct: number; customer_count: number }[];
  top_rankings: CustomerPrediction[];
}> {
  const res = await fetch(`${BASE_URL}/rankings`);
  if (!res.ok) throw new Error('Failed to load rankings');
  return res.json();
}

export async function fetchMarketingSelection(): Promise<MarketingSelectionData> {
  const res = await fetch(`${BASE_URL}/marketing-selection`);
  if (!res.ok) throw new Error('Failed to load marketing selection');
  return res.json();
}

export async function fetchSpendingForecast(): Promise<SpendingForecastData> {
  const res = await fetch(`${BASE_URL}/spending-forecast`);
  if (!res.ok) throw new Error('Failed to load spending forecast');
  return res.json();
}

export async function fetchBusinessInsights(): Promise<BusinessInsightsData> {
  const res = await fetch(`${BASE_URL}/business-insights`);
  if (!res.ok) throw new Error('Failed to load business insights');
  return res.json();
}

export async function fetchModelPerformance(): Promise<ModelPerformanceData> {
  const res = await fetch(`${BASE_URL}/model-performance`);
  if (!res.ok) throw new Error('Failed to load model performance');
  return res.json();
}

export async function fetchDataQuality(): Promise<any> {
  const res = await fetch(`${BASE_URL}/data-quality`);
  if (!res.ok) throw new Error('Failed to load data quality metadata');
  return res.json();
}

export async function fetchSettings(): Promise<any> {
  const res = await fetch(`${BASE_URL}/settings`);
  if (!res.ok) throw new Error('Failed to load settings');
  return res.json();
}

export async function updateSettings(settings: {
  budget_percentage: number;
  budget_max: number;
  value_cap: number;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function uploadWorksheet(file: File): Promise<{
  status: string;
  filename: string;
  rows_processed: number;
  eligible_customers: number;
  selected_for_campaign: number;
  cutoff_date: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Failed to upload worksheet');
  }
  return res.json();
}

export function getTemplateDownloadUrl(): string {
  return `${BASE_URL}/template/download`;
}

export function getPredictionsExportUrl(): string {
  return `${BASE_URL}/predictions/export`;
}


