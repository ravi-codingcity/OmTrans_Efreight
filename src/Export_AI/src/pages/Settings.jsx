import { useState } from 'react';
import toast from 'react-hot-toast';
import { Cpu, Save, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../api/client.js';
import ModelSelector from '../components/ModelSelector.jsx';
import Spinner from '../components/Spinner.jsx';

export default function Settings() {
  const { aiModel, updateAiModel } = useAuth();
  const [selected, setSelected] = useState(aiModel);
  const [saving, setSaving] = useState(false);

  const dirty = selected !== aiModel;

  const save = async () => {
    setSaving(true);
    try {
      await updateAiModel(selected);
      toast.success('AI model preference saved');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500">Configure how documents are processed.</p>
      </div>

      <section className="card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-600" />
          <h2 className="text-base font-semibold text-slate-800">AI Model Selection</h2>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Choose the Gemini model used for extraction, comparison, validation and report generation.
          Your selection is saved to your account and applied to all new analyses. If a model becomes
          unavailable, the system automatically falls back to Gemini 2.5 Flash.
        </p>

        <label className="label">Model</label>
        <ModelSelector value={selected} onChange={setSelected} />

        <div className="mt-5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Cpu className="h-3.5 w-3.5" /> Currently active: <span className="font-medium text-slate-600">{aiModel}</span>
          </span>
          <button onClick={save} disabled={!dirty || saving} className="btn-primary">
            {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save preference'}
          </button>
        </div>
      </section>
    </div>
  );
}
