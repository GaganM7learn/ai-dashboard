"""predict_from_excel.py - Generate ML Predictions from an Excel Worksheet.

Usage:
    python predict_from_excel.py
    python predict_from_excel.py --input my_sales_data.xlsx --output my_predictions.xlsx
    python predict_from_excel.py --input transactions_template.xlsx

Features:
- Reads any Excel (.xlsx, .xls) or CSV worksheet.
- Normalizes column names (InvoiceNo, Quantity, UnitPrice, CustomerID, InvoiceDate, etc.).
- Preserves distinct multi-item invoices while segregating returns/cancellations.
- Applies trained Random Forest Classifier + Sigmoid Calibration & Ridge Regressor.
- Enforces official competition rules (£2,000 cap, 20% budget, penny half-up rounding).
- Generates a formatted executive Excel report + CSV output.
"""

from __future__ import annotations

import argparse
import os
import sys
import datetime
import pandas as pd
import numpy as np
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

import starter
import solution
from features import clean_transactions, extract_customer_features, round_half_up


def generate_predictions_from_excel(
    input_path: str = "online_retail_II.xlsx" if os.path.exists("online_retail_II.xlsx") else "transactions_template.xlsx",
    output_path: str = "predictions_output.xlsx",
    cutoff_date: str | None = None,
    sheet_name: str | None = None
) -> str:
    """Reads transactions from an Excel/CSV file, computes predictions, and writes formatted Excel."""
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    print(f"[*] Loading transactions from: {input_path}")
    
    # Load data from Excel or CSV
    if input_path.endswith(".csv"):
        raw_df = pd.read_csv(input_path)
    else:
        try:
            import python_calamine
            engine = "calamine"
        except Exception:
            engine = "openpyxl"

        xl = pd.ExcelFile(input_path, engine=engine)
        if sheet_name and sheet_name in xl.sheet_names:
            sheet_to_use = sheet_name
        else:
            sheet_to_use = xl.sheet_names[0]
            # Prefer recent year or template
            for s in xl.sheet_names:
                if "2010-2011" in s:
                    sheet_to_use = s
                    break
                elif any(k in s.lower() for k in ["template", "transaction", "sales", "data"]):
                    sheet_to_use = s
                    break

        print(f"[*] Reading worksheet: '{sheet_to_use}' (Engine: {engine})...")
        raw_df = pd.read_excel(input_path, sheet_name=sheet_to_use, engine=engine)

    if raw_df.empty:
        print(f"[!] Warning: '{input_path}' contains no data rows.")
        print("    If using 'transactions_template.xlsx', please paste your transaction rows into the 'Transactions_Template' tab.")
        sys.exit(1)

    print(f"[*] Loaded {len(raw_df)} raw transaction rows.")

    # Clean transactions
    clean_df = clean_transactions(raw_df).dropna(subset=["customer_id"])
    if clean_df.empty:
        print("[!] Error: No valid transactions with non-null CustomerID found.")
        sys.exit(1)

    # Determine observation cutoff date
    max_date = clean_df["invoice_date"].max()
    if cutoff_date:
        cutoff = pd.to_datetime(cutoff_date)
    else:
        min_date = clean_df["invoice_date"].min()
        span_days = (max_date - min_date).days
        # If dataset spans > 35 days, use last 30 days as forecast window
        if span_days >= 35:
            cutoff = max_date - pd.Timedelta(days=30)
        else:
            cutoff = max_date

    history_df = clean_df[clean_df["invoice_date"] <= cutoff].copy()
    if history_df.empty:
        history_df = clean_df.copy()
        cutoff = max_date

    eligible_customers = sorted(list(history_df["customer_id"].astype(str).unique()))
    print(f"[*] Observation Cutoff Date: {cutoff.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"[*] Eligible Customers: {len(eligible_customers)}")

    # Prepare batch for official decide() interface
    batch = {
        "transactions": history_df.to_dict(orient="records"),
        "eligible_customers": eligible_customers,
        "cutoff_date": cutoff
    }

    print("[*] Running ML Inference (Purchase Probability & Spending Forecast)...")
    result = starter.decide(batch)
    preds = result["predictions"]
    selected_set = set(result["selected"])

    # Extract customer features for summary reporting
    feat_df, _ = extract_customer_features(history_df, as_of_date=cutoff)
    feat_dict = feat_df.set_index("customer_id").to_dict(orient="index") if not feat_df.empty else {}

    # Compile result rows
    rows = []
    for cid in eligible_customers:
        p = preds.get(cid, {})
        prob = p.get("purchase_probability", 0.0)
        val = p.get("predicted_purchase_value", 0.0)
        rank = p.get("business_value_rank", 9999)
        ebv = p.get("expected_business_value", round_half_up(prob * val, 2))
        is_sel = "YES" if cid in selected_set else "NO"

        f = feat_dict.get(cid, {})
        freq = int(f.get("frequency", 0))
        tot_spend = round_half_up(float(f.get("total_spend", 0.0)), 2)
        recency = round(float(f.get("recency_days", 365.0)), 1)

        if prob >= 0.75:
            tier = "Very High (>= 75%)"
        elif prob >= 0.50:
            tier = "High (50-74%)"
        elif prob >= 0.25:
            tier = "Medium (25-49%)"
        else:
            tier = "Low (< 25%)"

        rows.append({
            "CustomerID": str(cid),
            "BusinessValueRank": rank,
            "PurchaseProbability": prob,
            "ProbabilityTier": tier,
            "PredictedPurchaseValue (£)": val,
            "ExpectedBusinessValue (£)": ebv,
            "SelectedForMarketing": is_sel,
            "HistoricalOrders": freq,
            "HistoricalSpend (£)": tot_spend,
            "DaysSinceLastPurchase": recency
        })

    # Sort by BusinessValueRank ascending
    rows.sort(key=lambda x: x["BusinessValueRank"])
    results_df = pd.DataFrame(rows)

    # -------------------------------------------------------------
    # Build Formatted Excel Output Workbook
    # -------------------------------------------------------------
    wb = openpyxl.Workbook()

    # Style definitions
    font_family = "Segoe UI"
    navy_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    gold_fill = PatternFill(start_color="D97706", end_color="D97706", fill_type="solid")
    sel_yes_fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid") # light green
    vh_fill = PatternFill(start_color="DBEAFE", end_color="DBEAFE", fill_type="solid")      # light blue
    
    header_font = Font(name=font_family, size=11, bold=True, color="FFFFFF")
    title_font = Font(name=font_family, size=14, bold=True, color="0F172A")
    kpi_val_font = Font(name=font_family, size=16, bold=True, color="1E293B")
    kpi_lbl_font = Font(name=font_family, size=9, color="64748B", bold=True)
    body_font = Font(name=font_family, size=10)
    yes_font = Font(name=font_family, size=10, bold=True, color="166534")

    thin_border = Border(
        left=Side(style="thin", color="E2E8F0"),
        right=Side(style="thin", color="E2E8F0"),
        top=Side(style="thin", color="E2E8F0"),
        bottom=Side(style="thin", color="E2E8F0")
    )
    header_border = Border(
        left=Side(style="thin", color="334155"),
        right=Side(style="thin", color="334155"),
        top=Side(style="medium", color="0F172A"),
        bottom=Side(style="medium", color="0F172A")
    )

    # SHEET 1: Executive KPI Overview
    ws_kpi = wb.active
    ws_kpi.title = "Executive_Summary"
    ws_kpi.views.sheetView[0].showGridLines = True

    ws_kpi.merge_cells("A1:G1")
    ws_kpi["A1"].value = "CUSTOMER INTELLIGENCE AI: 30-DAY PURCHASE FORECAST SUMMARY"
    ws_kpi["A1"].font = title_font
    ws_kpi.row_dimensions[1].height = 32

    # Compute key stats
    tot_cust = len(results_df)
    tot_pred_spend = round_half_up(results_df["PredictedPurchaseValue (£)"].sum(), 2)
    avg_prob = round_half_up(results_df["PurchaseProbability"].mean(), 4)
    sel_count = len(selected_set)
    sel_spend = round_half_up(results_df[results_df["SelectedForMarketing"] == "YES"]["PredictedPurchaseValue (£)"].sum(), 2)
    sel_ebv = round_half_up(results_df[results_df["SelectedForMarketing"] == "YES"]["ExpectedBusinessValue (£)"].sum(), 2)

    kpis = [
        ("Total Eligible Customers", f"{tot_cust:,}"),
        ("Average Purchase Probability", f"{avg_prob * 100:.1f}%"),
        ("Total Predicted Spend", f"£{tot_pred_spend:,.2f}"),
        ("Selected Marketing Shortlist", f"{sel_count:,} Customers"),
        ("Shortlist Expected Revenue", f"£{sel_spend:,.2f}"),
        ("Shortlist Expected Business Value", f"£{sel_ebv:,.2f}")
    ]

    for idx, (label, val) in enumerate(kpis, 3):
        ws_kpi.cell(row=idx, column=1, value=label).font = Font(name=font_family, size=11, bold=True, color="334155")
        val_cell = ws_kpi.cell(row=idx, column=3, value=val)
        val_cell.font = Font(name=font_family, size=12, bold=True, color="047857")
        ws_kpi.row_dimensions[idx].height = 24

    ws_kpi.column_dimensions["A"].width = 34
    ws_kpi.column_dimensions["B"].width = 6
    ws_kpi.column_dimensions["C"].width = 28

    # SHEET 2: Full Customer Predictions
    ws_pred = wb.create_sheet(title="Customer_Predictions")
    ws_pred.views.sheetView[0].showGridLines = True

    pred_headers = list(results_df.columns)
    ws_pred.append(pred_headers)

    for c_idx, h in enumerate(pred_headers, 1):
        c = ws_pred.cell(row=1, column=c_idx)
        c.fill = navy_fill
        c.font = header_font
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = header_border

    ws_pred.row_dimensions[1].height = 28
    ws_pred.freeze_panes = "A2"

    for r_idx, row_dict in enumerate(rows, 2):
        ws_pred.row_dimensions[r_idx].height = 20
        for c_idx, h in enumerate(pred_headers, 1):
            val = row_dict[h]
            cell = ws_pred.cell(row=r_idx, column=c_idx, value=val)
            cell.font = body_font
            cell.border = thin_border

            # Number formatting & Alignments
            if h in ["CustomerID", "BusinessValueRank"]:
                cell.alignment = Alignment(horizontal="center")
            elif h == "PurchaseProbability":
                cell.number_format = "0.0%"
                cell.alignment = Alignment(horizontal="right")
            elif "£" in h:
                cell.number_format = "£#,##0.00"
                cell.alignment = Alignment(horizontal="right")
            elif h == "SelectedForMarketing":
                cell.alignment = Alignment(horizontal="center")
                if val == "YES":
                    cell.fill = sel_yes_fill
                    cell.font = yes_font
            elif h == "ProbabilityTier":
                if "Very High" in val:
                    cell.fill = vh_fill

    # Set column widths
    for col in ws_pred.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws_pred.column_dimensions[col_letter].width = max(max_len + 4, 14)

    wb.save(output_path)
    print(f"[+] Successfully wrote predictions Excel report: {output_path}")

    # Also save CSV output
    csv_path = output_path.replace(".xlsx", ".csv")
    results_df.to_csv(csv_path, index=False)
    print(f"[+] Successfully wrote CSV predictions: {csv_path}")

    return output_path


if __name__ == "__main__":
    default_input = "online_retail_II.xlsx" if os.path.exists("online_retail_II.xlsx") else "transactions_template.xlsx"
    parser = argparse.ArgumentParser(description="Generate ML predictions from an Excel or CSV transaction worksheet.")
    parser.add_argument("--input", "-i", default=default_input, help="Path to input Excel or CSV worksheet.")
    parser.add_argument("--output", "-o", default="predictions_output.xlsx", help="Path to write output predictions Excel file.")
    parser.add_argument("--sheet", "-s", default=None, help="Name of sheet to process (e.g. 'Year 2010-2011').")
    parser.add_argument("--cutoff", "-c", default=None, help="Custom observation cutoff date (YYYY-MM-DD).")
    args = parser.parse_args()

    generate_predictions_from_excel(
        input_path=args.input,
        output_path=args.output,
        cutoff_date=args.cutoff,
        sheet_name=args.sheet
    )
