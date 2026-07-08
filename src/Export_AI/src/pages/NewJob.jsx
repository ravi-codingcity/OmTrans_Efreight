import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UploadCloud, File, FileSpreadsheet, FileImage, FileText, X, Cpu } from 'lucide-react';
import { jobApi } from '../api/endpoints.js';
import { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from '../components/Spinner.jsx';
import ModelSelector from '../components/ModelSelector.jsx';
import TemplateSelector from '../components/TemplateSelector.jsx';
import { formatBytes } from '../lib/format.js';

const MAX_FILES = 10;
const MIN_FILES = 2;
const MAX_SIZE = 25 * 1024 * 1024;

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/tiff': ['.tiff', '.tif'],
};

function iconFor(type = '') {
  if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return FileSpreadsheet;
  if (type.startsWith('image/')) return FileImage;
  if (type.includes('word')) return FileText;
  return File;
}

export default function NewJob() {
  const navigate = useNavigate();
  const { aiModel } = useAuth();
  const [files, setFiles] = useState([]);
  const [jobNumber, setJobNumber] = useState('');
  const [hblNumber, setHblNumber] = useState('');
  const [shipmentType, setShipmentType] = useState('single');
  const [model, setModel] = useState(aiModel);
  const [outputTemplate, setOutputTemplate] = useState('shipment_report');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected?.length) {
      rejected.forEach((r) => toast.error(`${r.file.name}: ${r.errors[0]?.message || 'rejected'}`));
    }
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [f.name + f.size, f]));
      accepted.forEach((f) => map.set(f.name + f.size, f));
      const next = [...map.values()];
      if (next.length > MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files`);
        return next.slice(0, MAX_FILES);
      }
      return next;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: MAX_SIZE,
    maxFiles: MAX_FILES,
    noClick: true,
  });

  const removeFile = (key) => setFiles((prev) => prev.filter((f) => f.name + f.size !== key));

  const submit = async (e) => {
    e.preventDefault();
    if (files.length < MIN_FILES) return toast.error(`Upload at least ${MIN_FILES} documents`);
    if (!jobNumber.trim()) return toast.error('Please enter a Job Number');

    const fd = new FormData();
    fd.append('jobNumber', jobNumber.trim());
    if (hblNumber.trim()) fd.append('hblNumber', hblNumber.trim());
    fd.append('shipmentType', shipmentType);
    if (model) fd.append('model', model);
    if (outputTemplate) fd.append('outputTemplate', outputTemplate);
    files.forEach((f) => fd.append('documents', f));

    setUploading(true);
    setProgress(0);
    try {
      const res = await jobApi.create(fd, (evt) => {
        if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
      });
      toast.success('Upload complete — analysis started');
      // Always open the shipment so the user sees AI analysis → Review & Edit before
      // anything else. For Multiple LEO this is Shipment 1; the remaining shipments
      // are reachable from the grouped session on the Dashboard.
      navigate(`/jobs/${res.job.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">New Document Analysis</h1>
        <p className="text-sm text-slate-500">
          Upload {MIN_FILES}–{MAX_FILES} export documents. The AI will extract, cross-check and consolidate them.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div className="card grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className="label">Job Number *</label>
            <input
              className="input"
              placeholder="e.g. JOB-2026-00871"
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
            />
          </div>
          <div>
            <label className="label">HBL Number</label>
            <input
              className="input"
              placeholder="House B/L number (optional)"
              value={hblNumber}
              onChange={(e) => setHblNumber(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Shipment Type</label>
            <select className="input" value={shipmentType} onChange={(e) => setShipmentType(e.target.value)}>
              <option value="single">Single LEO with Single HBL</option>
              <option value="multiple">Multiple LEO with Multiple HBL</option>
              <option value="multiple_single">Multiple LEO with Single HBL</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">
              {shipmentType === 'multiple'
                ? 'Each LEO / Shipping Bill becomes its own shipment (separate HBL, MBL & ISF). Booking, Forwarding Note / E-Gate are shared across all.'
                : shipmentType === 'multiple_single'
                ? 'All LEOs are merged into ONE consolidated shipment — a single HBL, MBL & ISF combining every exporter, goods description, container & seal.'
                : 'Standard single-shipment workflow (1 LEO → 1 HBL, MBL & ISF).'}
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="label flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-brand-500" /> AI model for this analysis
            </label>
            <ModelSelector value={model} onChange={setModel} compact />
            <p className="mt-1 text-xs text-slate-400">Defaults to your saved preference. Change it in Settings to make it permanent.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="label flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-brand-500" /> Output document
            </label>
            <TemplateSelector value={outputTemplate} onChange={setOutputTemplate} />
          </div>
        </div>

        <div
          {...getRootProps()}
          className={`card flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-10 text-center transition ${
            isDragActive ? 'border-brand-500 bg-brand-50' : 'border-slate-300'
          }`}
          onClick={open}
        >
          <input {...getInputProps()} />
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <UploadCloud className="h-7 w-7" />
          </div>
          <div>
            <p className="font-medium text-slate-700">
              {isDragActive ? 'Drop the files here…' : 'Drag & drop documents here'}
            </p>
            <p className="text-sm text-slate-400">or click to browse · PDF, DOCX, XLSX, CSV, images</p>
          </div>
          <p className="text-xs text-slate-400">Up to {MAX_FILES} files · max {formatBytes(MAX_SIZE)} each</p>
        </div>

        {files.length > 0 && (
          <div className="card divide-y divide-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 text-sm text-slate-500">
              <span>{files.length} file(s) selected</span>
              <button type="button" onClick={() => setFiles([])} className="text-red-500 hover:underline">
                Clear all
              </button>
            </div>
            {files.map((f) => {
              const Icon = iconFor(f.type);
              const key = f.name + f.size;
              return (
                <div key={key} className="flex items-center gap-3 px-4 py-2.5">
                  <Icon className="h-5 w-5 shrink-0 text-brand-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{f.name}</p>
                    <p className="text-xs text-slate-400">{formatBytes(f.size)}</p>
                  </div>
                  {!uploading && (
                    <button type="button" onClick={() => removeFile(key)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {uploading && (
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-600">Uploading…</span>
              <span className="font-medium text-slate-700">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate('/')} className="btn-ghost" disabled={uploading}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={uploading || files.length < MIN_FILES}>
            {uploading ? <Spinner className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
            {uploading ? 'Uploading…' : 'Start Analysis'}
          </button>
        </div>
      </form>
    </div>
  );
}
