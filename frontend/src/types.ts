export interface CustomerPrediction {
  customer_id: string;
  purchase_probability: number;
  predicted_purchase_value: number;
  expected_business_value: number;
  business_value_rank: number;
  historical_frequency: number;
  historical_spend: number;
  recency_days: number;
  return_rate_pct: number;
  is_active_30d: boolean;
  probability_tier: 'Very High' | 'High' | 'Medium' | 'Low';
  customer_category: string;
  is_selected: boolean;
}

export interface OverviewData {
  total_eligible_customers: number;
  customers_predicted_to_purchase: number;
  avg_purchase_probability: number;
  total_predicted_purchase_value: number;
  selected_marketing_customers: number;
  expected_marketing_opportunity: number;
  probability_distribution: { bin: string; count: number }[];
  spending_distribution: { range: string; count: number }[];
  category_distribution: { name: string; value: number }[];
  purchase_trend: { month: string; actual: number | null; predicted: number | null }[];
}

export interface MarketingSelectionData {
  total_eligible_customers: number;
  official_budget_percentage: number;
  official_budget_cap: number;
  selected_count: number;
  selected_percentage: number;
  total_predicted_revenue: number;
  total_expected_business_value: number;
  estimated_campaign_cost: number;
  projected_net_profit: number;
  selected_customers: CustomerPrediction[];
}

export interface SpendingForecastData {
  total_predicted_spend: number;
  average_predicted_spend: number;
  median_predicted_spend: number;
  max_predicted_spend: number;
  spend_distribution: { range: string; count: number }[];
  top_spenders: CustomerPrediction[];
}

export interface InsightCard {
  id: string;
  title: string;
  type: 'opportunity' | 'warning' | 'success' | 'caution';
  badge: string;
  description: string;
  action: string;
  impact: string;
}

export interface BusinessInsightsData {
  summary: {
    high_probability_cohort_size: number;
    high_probability_pipeline_value: number;
    churn_risk_cohort_size: number;
    momentum_cohort_size: number;
    high_return_cohort_size: number;
  };
  insights_cards: InsightCard[];
}

export interface ModelPerformanceData {
  model_version: string;
  created_at: string;
  initial_validation_score?: number;
  post_twist_validation_score?: number;
  baseline_initial_score?: number;
  baseline_post_twist_score?: number;
  last_training_time?: string;
  feed_metadata?: Record<string, string>;
  classification: {
    algorithm: string;
    target: string;
    roc_auc: number;
    brier_score: number;
    expected_calibration_error: number;
    calibration_method: string;
    prediction_distribution: Record<string, number>;
  };
  regression: {
    algorithm: string;
    target: string;
    mae: number;
    rmse: number;
    wape: number;
    value_constraints: string;
    prediction_distribution: Record<string, number>;
  };
  baseline_comparison: {
    model: string;
    roc_auc?: number;
    initial_score?: number;
    post_twist_score?: number;
    brier_score: number;
    mae: number;
    status: string;
  }[];
  feature_count: number;
  top_features: {
    feature: string;
    importance: number;
    category: string;
  }[];
}

export interface DataQualitySource {
  name: string;
  quantity_units_per_item: number;
  price_units_per_gbp: number;
  clock_offset_minutes: number;
  coverage_status: string;
}

export interface DataQualityInfo {
  status: string;
  feed_mode: string;
  sources: DataQualitySource[];
  revision_resolution: string;
  duplicate_handling: string;
  coverage_handling: string;
  dataset_name: string;
  total_rows_ingested: number;
  eligible_customers: number;
  allocated_budget: number;
}

