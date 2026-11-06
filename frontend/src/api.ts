import { 
  CustomerPrediction, 
  OverviewData, 
  MarketingSelectionData, 
  SpendingForecastData, 
  BusinessInsightsData, 
  ModelPerformanceData 
} from './types';

const BASE_URL = (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api').replace(/\/+api$/, '/api');

/**
 * Robust fetch helper that queries the backend API,
 * falling back gracefully to pre-computed static JSON assets if the server is cold or offline.
 */
async function fetchWithFallback<T>(apiPath: string, fallbackPath?: string): Promise<T> {
  try {
    const res = await fetch(`${BASE_URL}${apiPath}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Network failure or cold server - attempt static fallback
  }

  if (fallbackPath) {
    try {
      const fallbackRes = await fetch(fallbackPath);
      if (fallbackRes.ok) {
        return await fallbackRes.json();
      }
    } catch {
      // Fallback failed
    }
  }
  throw new Error(`Failed to load data from ${apiPath}`);
}

export async function fetchOverview(): Promise<OverviewData> {
  return fetchWithFallback<OverviewData>('/overview', '/data/overview.json');
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

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchWithFallback(`/predictions${queryString}`, '/data/predictions_p1.json');
}

export async function fetchRankings(): Promise<{
  total_ranked: number;
  cumulative_curve: { rank_pct: number; cumulative_value_pct: number; customer_count: number }[];
  top_rankings: CustomerPrediction[];
}> {
  return fetchWithFallback('/rankings', '/data/rankings.json');
}

export async function fetchMarketingSelection(): Promise<MarketingSelectionData> {
  return fetchWithFallback<MarketingSelectionData>('/marketing-selection', '/data/marketing-selection.json');
}

export async function fetchSpendingForecast(): Promise<SpendingForecastData> {
  return fetchWithFallback<SpendingForecastData>('/spending-forecast', '/data/spending-forecast.json');
}

export async function fetchBusinessInsights(): Promise<BusinessInsightsData> {
  return fetchWithFallback<BusinessInsightsData>('/business-insights', '/data/business-insights.json');
}

export async function fetchModelPerformance(): Promise<ModelPerformanceData> {
  return fetchWithFallback<ModelPerformanceData>('/model-performance', '/data/model-performance.json');
}

export async function fetchDataQuality(): Promise<any> {
  return fetchWithFallback('/data-quality', '/data/data-quality.json');
}

export async function fetchSettings(): Promise<any> {
  return fetchWithFallback('/settings');
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
  rows_processed: number;
  eligible_customers: number;
  selected_for_campaign: number;
  cutoff_date: string;
  filename: string;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Failed to upload and score transactions');
  }
  return res.json();
}

export function getTemplateDownloadUrl(format: 'xlsx' | 'csv' = 'xlsx'): string {
  return `${BASE_URL}/template/download?format=${format}`;
}

export function getPredictionsExportUrl(): string {
  return `${BASE_URL}/predictions/export`;
}
