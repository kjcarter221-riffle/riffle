'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import {
  Users, Plus, MapPin, Droplets, Bug, ThermometerSun,
  X, Clock, Eye, ChevronRight
} from 'lucide-react';

const HATCH_TYPES = [
  'Blue Wing Olive', 'Pale Morning Dun', 'Caddis', 'Midge', 'Stonefly',
  'March Brown', 'Trico', 'Green Drake', 'Sulfur', 'Hendrickson',
  'Baetis', 'Terrestrials', 'Other'
];

const INTENSITIES = ['Light', 'Moderate', 'Heavy', 'Blizzard'];
const CLARITIES = ['Crystal Clear', 'Clear', 'Slightly Off', 'Murky', 'Blown Out'];

export default function CommunityPage() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [publicEntries, setPublicEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('hatches');

  const [form, setForm] = useState({
    river_name: '',
    hatch_type: '',
    hatch_intensity: 'Moderate',
    flies_working: '',
    water_temp: '',
    water_clarity: 'Clear',
    notes: ''
  });

  useEffect(() => {
    fetchReports();
    fetchPublicEntries();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/hatch');
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
    setLoading(false);
  };

  const fetchPublicEntries = async () => {
    try {
      const res = await fetch('/api/journal?public=true');
      const data = await res.json();
      setPublicEntries(data.entries || []);
    } catch (err) {
      console.error('Failed to fetch public entries:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const res = await fetch('/api/hatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit');
        setSaving(false);
        return;
      }

      setShowNew(false);
      setForm({
        river_name: '',
        hatch_type: '',
        hatch_intensity: 'Moderate',
        flies_working: '',
        water_temp: '',
        water_clarity: 'Clear',
        notes: ''
      });
      fetchReports();
    } catch (err) {
      setError('Failed to submit report');
    }
    setSaving(false);
  };

  const timeAgo = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now - then) / 1000 / 60);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="safe-top sticky top-0 z-40 glass border-b border-white/20">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="font-semibold text-stone-900">Community</h1>
              <p className="text-xs text-stone-500">Reports from fellow anglers</p>
            </div>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="btn-primary px-3 py-2 text-sm"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-2 pb-3">
          <button
            onClick={() => setTab('hatches')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === 'hatches'
                ? 'bg-river-100 text-river-700'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            Hatch Reports
          </button>
          <button
            onClick={() => setTab('trips')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === 'trips'
                ? 'bg-river-100 text-river-700'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            Trip Reports
          </button>
        </div>
      </header>

      <main className="px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-stone-400">Loading...</div>
        ) : tab === 'hatches' ? (
          reports.length === 0 ? (
            <div className="text-center py-12">
              <Bug className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <h3 className="font-semibold text-stone-900 mb-2">No reports yet</h3>
              <p className="text-stone-500 mb-4">Be the first to report a hatch!</p>
              <button onClick={() => setShowNew(true)} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Report Hatch
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                        <Bug className="w-4 h-4 text-forest-500" />
                        {report.hatch_type}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {report.river_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(report.reported_at)}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      report.hatch_intensity === 'Blizzard' ? 'bg-forest-100 text-forest-700' :
                      report.hatch_intensity === 'Heavy' ? 'bg-river-100 text-river-700' :
                      report.hatch_intensity === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                      'bg-stone-100 text-stone-600'
                    }`}>
                      {report.hatch_intensity}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {report.water_temp && (
                      <span className="px-2 py-1 bg-stone-50 text-stone-600 rounded-full text-xs flex items-center gap-1">
                        <ThermometerSun className="w-3 h-3" /> {report.water_temp}°F
                      </span>
                    )}
                    {report.water_clarity && (
                      <span className="px-2 py-1 bg-stone-50 text-stone-600 rounded-full text-xs flex items-center gap-1">
                        <Droplets className="w-3 h-3" /> {report.water_clarity}
                      </span>
                    )}
                    {report.flies_working && (
                      <span className="px-2 py-1 bg-river-50 text-river-700 rounded-full text-xs">
                        {report.flies_working.split(',')[0]}
                      </span>
                    )}
                  </div>

                  {report.notes && (
                    <p className="text-sm text-stone-600 mt-3">{report.notes}</p>
                  )}

                  <p className="text-xs text-stone-400 mt-3">
                    Reported by {report.reporter_name}
                  </p>
                </div>
              ))}
            </div>
          )
        ) : (
          publicEntries.length === 0 ? (
            <div className="text-center py-12">
              <Eye className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <h3 className="font-semibold text-stone-900 mb-2">No public trips yet</h3>
              <p className="text-stone-500">Share your trips to help the community!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {publicEntries.map((entry) => (
                <div key={entry.id} className="card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-stone-900">{entry.title}</h3>
                      <p className="text-xs text-stone-500 mt-1">
                        {entry.author_name} • {new Date(entry.trip_date).toLocaleDateString()}
                        {entry.river_name && ` • ${entry.river_name}`}
                      </p>
                    </div>
                  </div>
                  {entry.content && (
                    <p className="text-sm text-stone-600 line-clamp-3">{entry.content}</p>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </main>

      {/* New Report Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden animate-slide-up">
            <div className="sticky top-0 bg-white px-4 py-3 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-semibold">Report a Hatch</h3>
              <button onClick={() => setShowNew(false)} className="p-1 text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>
              )}

              <div>
                <label className="label">River/Location *</label>
                <input
                  type="text"
                  value={form.river_name}
                  onChange={(e) => setForm({ ...form, river_name: e.target.value })}
                  className="input"
                  placeholder="Madison River, MT"
                  required
                />
              </div>

              <div>
                <label className="label">Hatch Type *</label>
                <select
                  value={form.hatch_type}
                  onChange={(e) => setForm({ ...form, hatch_type: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select hatch...</option>
                  {HATCH_TYPES.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Intensity</label>
                <div className="flex gap-2">
                  {INTENSITIES.map(i => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setForm({ ...form, hatch_intensity: i })}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                        form.hatch_intensity === i
                          ? 'bg-river-100 text-river-700'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Flies Working</label>
                <input
                  type="text"
                  value={form.flies_working}
                  onChange={(e) => setForm({ ...form, flies_working: e.target.value })}
                  className="input"
                  placeholder="Parachute BWO #18, RS2 #20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Water Temp (°F)</label>
                  <input
                    type="number"
                    value={form.water_temp}
                    onChange={(e) => setForm({ ...form, water_temp: e.target.value })}
                    className="input"
                    placeholder="52"
                  />
                </div>
                <div>
                  <label className="label">Clarity</label>
                  <select
                    value={form.water_clarity}
                    onChange={(e) => setForm({ ...form, water_clarity: e.target.value })}
                    className="input"
                  >
                    {CLARITIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input min-h-[80px]"
                  placeholder="Additional observations..."
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full disabled:opacity-50"
              >
                {saving ? 'Submitting...' : 'Submit Report'}
              </button>
            </form>
          </div>
        </div>
      )}

      <Navigation />
    </div>
  );
}
