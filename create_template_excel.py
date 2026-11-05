"""create_template_excel.py - Generates the official customer transactions Excel template.

Creates:
- transactions_template.xlsx (with formatted empty template + examples/instructions sheet)
- transactions_template.csv (plain CSV counterpart)
"""

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def build_template():
    wb = openpyxl.Workbook()

    # Define styles
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    data_font = Font(name="Segoe UI", size=10)
    note_font = Font(name="Segoe UI", size=9, italic=True, color="64748B")
    title_font = Font(name="Segoe UI", size=14, bold=True, color="0F172A")
    subtitle_font = Font(name="Segoe UI", size=10, color="475569")
    
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

    # -------------------------------------------------------------
    # SHEET 1: Empty Template for User Data
    # -------------------------------------------------------------
    ws_template = wb.active
    ws_template.title = "Transactions_Template"
    ws_template.views.sheetView[0].showGridLines = True

    headers = [
        "InvoiceNo",
        "StockCode",
        "Description",
        "Quantity",
        "InvoiceDate",
        "UnitPrice",
        "CustomerID",
        "Country"
    ]

    ws_template.append(headers)

    # Format header row
    for col_idx, col_name in enumerate(headers, 1):
        cell = ws_template.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = header_border

    # Set suggested column widths
    col_widths = {
        "A": 16, # InvoiceNo
        "B": 14, # StockCode
        "C": 36, # Description
        "D": 14, # Quantity
        "E": 22, # InvoiceDate
        "F": 14, # UnitPrice
        "G": 16, # CustomerID
        "H": 18  # Country
    }
    for col_letter, width in col_widths.items():
        ws_template.column_dimensions[col_letter].width = width

    ws_template.row_dimensions[1].height = 28
    ws_template.freeze_panes = "A2"

    # -------------------------------------------------------------
    # SHEET 2: Example Data & Field Guide
    # -------------------------------------------------------------
    ws_guide = wb.create_sheet(title="Instructions_And_Examples")
    ws_guide.views.sheetView[0].showGridLines = True

    ws_guide.column_dimensions["A"].width = 18
    ws_guide.column_dimensions["B"].width = 16
    ws_guide.column_dimensions["C"].width = 38
    ws_guide.column_dimensions["D"].width = 14
    ws_guide.column_dimensions["E"].width = 22
    ws_guide.column_dimensions["F"].width = 14
    ws_guide.column_dimensions["G"].width = 16
    ws_guide.column_dimensions["H"].width = 18

    # Title Banner
    ws_guide.merge_cells("A1:H1")
    title_cell = ws_guide["A1"]
    title_cell.value = "Customer Intelligence AI - Transaction Data Upload Template"
    title_cell.font = title_font
    title_cell.alignment = Alignment(vertical="center")
    ws_guide.row_dimensions[1].height = 30

    ws_guide.merge_cells("A2:H2")
    sub_cell = ws_guide["A2"]
    sub_cell.value = "Instructions: Paste your historical transactions into the 'Transactions_Template' tab, save, and upload to the dashboard or run predict_from_excel.py."
    sub_cell.font = subtitle_font
    sub_cell.alignment = Alignment(vertical="center")
    ws_guide.row_dimensions[2].height = 22

    # Section 1: Field Documentation
    ws_guide.cell(row=4, column=1, value="FIELD SPECIFICATION").font = Font(name="Segoe UI", size=11, bold=True, color="1E293B")
    
    spec_headers = ["Column Header", "Type", "Required?", "Description & Format", "", "", "", ""]
    ws_guide.append(spec_headers[:4])
    for col in range(1, 5):
        c = ws_guide.cell(row=5, column=col)
        c.fill = PatternFill(start_color="334155", end_color="334155", fill_type="solid")
        c.font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
        c.alignment = Alignment(horizontal="left", vertical="center")

    field_specs = [
        ("InvoiceNo", "Text / Int", "Yes", "Unique 6-digit transaction identifier. Cancellations/returns may start with 'C'."),
        ("StockCode", "Text", "Optional", "Product SKU code (e.g., '85123A')."),
        ("Description", "Text", "Optional", "Product or item description name."),
        ("Quantity", "Integer", "Yes", "Number of units purchased (>0) or returned (<0)."),
        ("InvoiceDate", "Datetime / Date", "Yes", "Date and time of purchase (Format: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)."),
        ("UnitPrice", "Decimal", "Yes", "Unit selling price per item in GBP / local currency."),
        ("CustomerID", "Text / Int", "Yes", "Unique customer identifier (e.g., '17850', 'CUST_001')."),
        ("Country", "Text", "Optional", "Customer country or region (e.g., 'United Kingdom').")
    ]

    for r_idx, spec in enumerate(field_specs, 6):
        for c_idx, val in enumerate(spec, 1):
            cell = ws_guide.cell(row=r_idx, column=c_idx, value=val)
            cell.font = data_font
            cell.border = thin_border
            if c_idx == 3 and val == "Yes":
                cell.font = Font(name="Segoe UI", size=10, bold=True, color="047857")

    # Section 2: Sample Rows
    sample_start_row = 16
    ws_guide.cell(row=sample_start_row, column=1, value="SAMPLE TRANSACTION ROWS (Copy or refer to this pattern)").font = Font(name="Segoe UI", size=11, bold=True, color="1E293B")
    
    ws_guide.row_dimensions[sample_start_row + 1].height = 24
    for col_idx, col_name in enumerate(headers, 1):
        cell = ws_guide.cell(row=sample_start_row + 1, column=col_idx, value=col_name)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = header_border

    sample_rows = [
        ("536365", "85123A", "WHITE HANGING HEART T-LIGHT HOLDER", 6, "2026-01-15 08:26:00", 2.55, "17850", "United Kingdom"),
        ("536365", "71053", "WHITE METAL LANTERN", 6, "2026-01-15 08:26:00", 3.39, "17850", "United Kingdom"),
        ("536366", "22633", "HAND WARMER UNION JACK", 8, "2026-02-04 10:45:00", 1.85, "13047", "United Kingdom"),
        ("C536379", "D", "Discount / Cancellation", -1, "2026-02-18 12:15:00", 27.50, "13047", "United Kingdom"),
        ("536381", "22437", "SET OF 9 BLACK SKULL T-LIGHTS", 12, "2026-03-01 16:30:00", 1.65, "15311", "United Kingdom")
    ]

    for r_idx, s_row in enumerate(sample_rows, sample_start_row + 2):
        ws_guide.row_dimensions[r_idx].height = 20
        for c_idx, val in enumerate(s_row, 1):
            cell = ws_guide.cell(row=r_idx, column=c_idx, value=val)
            cell.font = data_font
            cell.border = thin_border
            if c_idx in [4, 6]:
                cell.alignment = Alignment(horizontal="right")
            elif c_idx in [1, 2, 5, 7]:
                cell.alignment = Alignment(horizontal="center")

    # Save Excel workbook
    output_xlsx = "transactions_template.xlsx"
    wb.save(output_xlsx)
    print(f"Created: {output_xlsx}")

    # Also save clean CSV template
    import csv
    output_csv = "transactions_template.csv"
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
    print(f"Created: {output_csv}")

if __name__ == "__main__":
    build_template()

