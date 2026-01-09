'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import {
  BookOpen, Plus, Calendar, MapPin, Fish, CloudSun,
  ChevronRight, X, Eye, EyeOff, Trash2
} from 'lucide-react';

export default function JournalPage() {
  const router = useRouter();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [form, setForm] = useState({
    title: '',
    content: '',
    river_name: '',
    flies_used: '',
    fish_caught: 0,
    species: '',
    weather: '',
    is_public: false,
    trip_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user) router.push('/login');
      });

    fetchEntries();
  }, [router]);

  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/journal');
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (err) {
      console.error('Failed to fetch entries:', err);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save');
        if (data.upgrade) {
          setError('You\'ve reached your free limit (3/month). Upgrade to Pro for unlimited entries!');
        }
        setSaving(false);
        return;
      }

      setShowNew(false);
      setForm({
        title: '',
        content: '',
        river_name: '',
        flies_used: '',
        fish_caught: 0,
        species: '',
        weather: '',
        is_public: false,
        trip_date: new Date().toISOString().split('T')[0]
      });
      fetchEntries();
    } catch (err) {
      setError('Failed to save entry');
    }
    setSaving(false);
  };

  const deleteEntry = async (id) => {
    if (!confirm('Delete this entry?')) return;
    await fetch(`/api/journal?id=${id}`, { method: 'DELETE' });
    fetchEntries();
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="safe-top sticky top-0 z-40 glass border-b border-white/20">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-forest-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-forest-600" />
            </div>
            <div>
              <h1 className="font-semibold text-stone-900">Journal</h1>
              <p className="text-xs text-stone-500">{entries.length} entries</p>
            </div>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="btn-primary px-3 py-2 text-sm"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-stone-400">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h3 className="font-semibold text-stone-900 mb-2">No entries yet</h3>
            <p className="text-stone-500 mb-4">Start logging your fishing trips</p>
            <button onClick={() => setShowNew(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" /> Add Entry
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-stone-900">{entry.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-stone-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(entry.trip_date).toLocaleDateString()}
                      </span>
                      {entry.river_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {entry.river_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.is_public ? (
                      <Eye className="w-4 h-4 text-forest-500" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-stone-300" />
                    )}
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="p-1 text-stone-300 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {entry.content && (
                  <p className="text-sm text-stone-600 mb-3 line-clamp-2">{entry.content}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  {entry.fish_caught > 0 && (
                    <span className="px-2 py-1 bg-forest-50 text-forest-700 rounded-full text-xs flex items-center gap-1">
                      <Fish className="w-3 h-3" /> {entry.fish_caught} fish
                    </span>
                  )}
                  {entry.flies_used && (
                    <span className="px-2 py-1 bg-river-50 text-river-700 rounded-full text-xs">
                      {entry.flies_used.split(',')[0]}
                    </span>
                  )}
                  {entry.species && (
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs">
                      {entry.species}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Entry Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden animate-slide-up">
            <div className="sticky top-0 bg-white px-4 py-3 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-semibold">New Entry</h3>
              <button onClick={() => setShowNew(false)} className="p-1 text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>
              )}

              <div>
                <label className="label">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input"
                  placeholder="Morning on the Madison"
                  required
                />
              </div>

              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  value={form.trip_date}
                  onChange={(e) => setForm({ ...form, trip_date: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">River/Location</label>
                <input
                  type="text"
                  value={form.river_name}
                  onChange={(e) => setForm({ ...form, river_name: e.target.value })}
                  className="input"
                  placeholder="Madison River, MT"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Fish Caught</label>
                  <input
                    type="number"
                    value={form.fish_caught}
                    onChange={(e) => setForm({ ...form, fish_caught: parseInt(e.target.value) || 0 })}
                    className="input"
                    min="0"
                  />
                </div>
                <div>
                  <label className="label">Species</label>
                  <input
                    type="text"
                    value={form.species}
                    onChange={(e) => setForm({ ...form, species: e.target.value })}
                    className="input"
                    placeholder="Rainbow, Brown"
                  />
                </div>
              </div>

              <div>
                <label className="label">Flies Used</label>
                <input
                  type="text"
                  value={form.flies_used}
                  onChange={(e) => setForm({ ...form, flies_used: e.target.value })}
                  className="input"
                  placeholder="Parachute Adams #16, Pheasant Tail #18"
                />
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="input min-h-[100px]"
                  placeholder="What worked, conditions, memorable moments..."
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={form.is_public}
                  onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                  className="w-4 h-4 text-river-600 rounded"
                />
                <label htmlFor="is_public" className="text-sm text-stone-700">
                  Share publicly in community
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Entry'}
              </button>
            </form>
          </div>
        </div>
      )}

      <Navigation />
    </div>
  );
}
