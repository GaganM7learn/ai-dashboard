import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { uploadWorksheet, getTemplateDownloadUrl, getPredictionsExportUrl } from '../api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    rows_processed: number;
    eligible_customers: number;
    selected_for_campaign: number;
    cutoff_date: string;
    filename: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const validExts = ['.xlsx', '.xls', '.csv'];
      const ext = selected.name.substring(selected.name.lastIndexOf('.')).toLowerCase();
      if (!validExts.includes(ext)) {
        setErrorMsg('Please select a valid Excel (.xlsx, .xls) or CSV (.csv) file.');
        setFile(null);
        return;
      }
      setFile(selected);
      setErrorMsg(null);
      setSuccessResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      const validExts = ['.xlsx', '.xls', '.csv'];
      const ext = dropped.name.substring(dropped.name.lastIndexOf('.')).toLowerCase();
      if (!validExts.includes(ext)) {
        setErrorMsg('Please drop a valid Excel (.xlsx, .xls) or CSV (.csv) file.');
        return;
      }
      setFile(dropped);
      setErrorMsg(null);
      setSuccessResult(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setErrorMsg('Please select a worksheet file first.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const res = await uploadWorksheet(file);
      setSuccessResult(res);
      onUploadSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process worksheet.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Upload Transaction Worksheet</h2>
              <p className="text-xs text-slate-500">Run predictions on your own sales or customer data</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Step 1: Template Download Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Need the formatted empty worksheet?</p>
                <p className="text-[11px] text-slate-500">Download the official template with column headers and examples.</p>
              </div>
            </div>
            <a
              href={getTemplateDownloadUrl()}
              download="transactions_template.xlsx"
              className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Get Template (.xlsx)</span>
            </a>
          </div>

          {/* Step 2: Upload Dropzone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select or Drop Worksheet (.xlsx, .csv)
            </label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                file 
                  ? 'border-amber-400 bg-amber-50/30' 
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".xlsx,.xls,.csv" 
                onChange={handleFileChange} 
                className="hidden" 
              />
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-600">
                  <Upload className="w-5 h-5 text-amber-500" />
                </div>
                {file ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{file.name}</p>
                    <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB — Click to change file</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-medium text-slate-700">
                      <span className="text-amber-600 font-semibold">Click to browse</span> or drag and drop your file here
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Supports Microsoft Excel (.xlsx, .xls) and CSV</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Summary */}
          {successResult && (
            <div className="p-4 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-900 space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Predictions Computed Successfully!</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/70 p-3 rounded-lg border border-emerald-200/60">
                <div>
                  <span className="text-slate-500">Transactions: </span>
                  <span className="font-semibold text-slate-800">{successResult.rows_processed.toLocaleString()} rows</span>
                </div>
                <div>
                  <span className="text-slate-500">Customers: </span>
                  <span className="font-semibold text-slate-800">{successResult.eligible_customers.toLocaleString()} eligible</span>
                </div>
                <div>
                  <span className="text-slate-500">Marketing Shortlist: </span>
                  <span className="font-semibold text-emerald-700">{successResult.selected_for_campaign} selected</span>
                </div>
                <div>
                  <span className="text-slate-500">Cutoff Date: </span>
                  <span className="font-semibold text-slate-800">{successResult.cutoff_date}</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-emerald-700">Dashboard views updated.</span>
                <a
                  href={getPredictionsExportUrl()}
                  download="customer_purchase_predictions.xlsx"
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Predictions (.xlsx)</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            {successResult ? 'Done' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!file || isUploading}
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-50 disabled:active:scale-100 rounded-lg shadow-xs transition-all flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running ML Engine...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Predictions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

