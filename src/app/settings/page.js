'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import {
  Settings, User, Mail, MapPin, Crown, LogOut, ChevronRight,
  Camera, Check, AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    home_river: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/profile');
      const data = await res.json();

      if (!res.ok || !data.user) {
        router.push('/login');
        return;
      }

      setUser(data.user);
      setForm({
        name: data.user.name || '',
        home_river: data.user.home_river || ''
      });
    } catch (err) {
      router.push('/login');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save');
        setSaving(false);
        return;
      }

      setUser(data.user);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save changes');
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-river-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="safe-top sticky top-0 z-40 glass border-b border-white/20">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-stone-600" />
          </div>
          <div>
            <h1 className="font-semibold text-stone-900">Settings</h1>
            <p className="text-xs text-stone-500">Manage your account</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Profile Card */}
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-river-400 to-forest-400 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="font-semibold text-stone-900">{user?.name || 'Angler'}</h2>
              <p className="text-sm text-stone-500">{user?.email}</p>
              <div className="flex items-center gap-1 mt-1">
                {user?.subscription_status === 'pro' || user?.subscription_status === 'active' ? (
                  <span className="flex items-center gap-1 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3" /> Pro
                  </span>
                ) : (
                  <span className="text-xs text-stone-400">Free Plan</span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-xl text-sm">
                <Check className="w-4 h-4" />
                {success}
              </div>
            )}

            <div>
              <label className="label">Display Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input pl-10"
                  placeholder="Your name"
                />
              </div>
            </div>

            <div>
              <label className="label">Home River</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  value={form.home_river}
                  onChange={(e) => setForm({ ...form, home_river: e.target.value })}
                  className="input pl-10"
                  placeholder="Madison River, MT"
                />
              </div>
              <p className="text-xs text-stone-400 mt-1">Your favorite or most-fished river</p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Subscription */}
        <div className="card overflow-hidden">
          <Link
            href="/pricing"
            className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-stone-900">Subscription</p>
                <p className="text-sm text-stone-500">
                  {user?.subscription_status === 'pro' || user?.subscription_status === 'active'
                    ? 'Manage your Pro subscription'
                    : 'Upgrade to Pro for unlimited features'
                  }
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-stone-400" />
          </Link>
        </div>

        {/* Account Actions */}
        <div className="card overflow-hidden">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 p-4 w-full text-left hover:bg-red-50 transition-colors text-red-600"
          >
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-medium">Log Out</p>
              <p className="text-sm text-red-400">Sign out of your account</p>
            </div>
          </button>
        </div>

        {/* App Info */}
        <div className="text-center text-xs text-stone-400 space-y-1">
          <p>Riffle v1.0.0</p>
          <p>AI-Powered Fly Fishing Companion</p>
        </div>
      </main>

      <Navigation />
    </div>
  );
}
