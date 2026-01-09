'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import {
  Fish, CloudSun, BookOpen, MessageCircle, TrendingUp, Droplets,
  LogOut, Crown, ChevronRight, Thermometer, Wind, Moon
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [conditions, setConditions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user) {
          router.push('/login');
          return;
        }
        setUser(data.user);
        setStats(data.stats);
        setLoading(false);
      })
      .catch(() => router.push('/login'));

    // Get conditions for user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetch(`/api/conditions?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
            .then(res => res.json())
            .then(data => setConditions(data))
            .catch(console.error);
        },
        () => {
          // Default location if denied
          fetch('/api/conditions')
            .then(res => res.json())
            .then(data => setConditions(data))
            .catch(console.error);
        }
      );
    }
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Loading...</div>
      </div>
    );
  }

  const isPro = user?.subscription_status === 'pro' || user?.subscription_status === 'active';

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="safe-top sticky top-0 z-40 glass border-b border-white/20">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-river-500 to-forest-500 rounded-full flex items-center justify-center text-white font-semibold">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="font-semibold text-stone-900">Hey, {user?.name || 'Angler'}!</h1>
              <p className="text-xs text-stone-500">
                {isPro ? (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Crown className="w-3 h-3" /> Pro Member
                  </span>
                ) : (
                  'Free Tier'
                )}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-stone-400 hover:text-stone-600">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Conditions Card */}
        {conditions && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-stone-900">Today's Conditions</h2>
              <span className={`condition-badge condition-${conditions.conditions?.rating?.toLowerCase()}`}>
                {conditions.conditions?.score}/100 {conditions.conditions?.rating}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center">
                <Thermometer className="w-5 h-5 mx-auto text-river-500 mb-1" />
                <p className="text-lg font-semibold">{conditions.weather?.temperature}°</p>
                <p className="text-xs text-stone-500">Temp</p>
              </div>
              <div className="text-center">
                <Wind className="w-5 h-5 mx-auto text-river-500 mb-1" />
                <p className="text-lg font-semibold">{conditions.weather?.wind_speed}</p>
                <p className="text-xs text-stone-500">mph</p>
              </div>
              <div className="text-center">
                <Droplets className="w-5 h-5 mx-auto text-river-500 mb-1" />
                <p className="text-lg font-semibold">{conditions.weather?.pressure}</p>
                <p className="text-xs text-stone-500">mb</p>
              </div>
              <div className="text-center">
                <Moon className="w-5 h-5 mx-auto text-river-500 mb-1" />
                <p className="text-lg font-semibold">{conditions.moonPhase?.emoji}</p>
                <p className="text-xs text-stone-500">{conditions.moonPhase?.name?.split(' ')[0]}</p>
              </div>
            </div>

            <Link href="/conditions" className="flex items-center justify-center gap-1 text-sm text-river-600 font-medium">
              View Full Report <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/chat" className="card p-4 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-river-100 rounded-xl flex items-center justify-center mb-3">
              <MessageCircle className="w-5 h-5 text-river-600" />
            </div>
            <h3 className="font-semibold text-stone-900">AI Guide</h3>
            <p className="text-sm text-stone-500">Get fly recommendations</p>
          </Link>

          <Link href="/journal" className="card p-4 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-forest-100 rounded-xl flex items-center justify-center mb-3">
              <BookOpen className="w-5 h-5 text-forest-600" />
            </div>
            <h3 className="font-semibold text-stone-900">Journal</h3>
            <p className="text-sm text-stone-500">Log your trips</p>
          </Link>
        </div>

        {/* Stats */}
        {stats && (
          <div className="card p-4">
            <h2 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-river-500" />
              Your Stats
            </h2>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-stone-900">{stats.totalTrips}</p>
                <p className="text-sm text-stone-500">Trips</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{stats.totalFish}</p>
                <p className="text-sm text-stone-500">Fish</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{stats.speciesCount}</p>
                <p className="text-sm text-stone-500">Species</p>
              </div>
            </div>

            {stats.topFlies?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-stone-100">
                <p className="text-sm text-stone-600 mb-2">Top Flies</p>
                <div className="flex flex-wrap gap-2">
                  {stats.topFlies.slice(0, 3).map((fly, i) => (
                    <span key={i} className="px-2 py-1 bg-river-50 text-river-700 rounded-full text-xs">
                      {fly.flies_used}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upgrade CTA */}
        {!isPro && (
          <Link href="/pricing" className="card p-4 bg-gradient-to-r from-river-500 to-forest-500 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Crown className="w-5 h-5" /> Upgrade to Pro
                </h3>
                <p className="text-sm text-white/80">Unlimited entries, offline mode & more</p>
              </div>
              <ChevronRight className="w-5 h-5" />
            </div>
          </Link>
        )}
      </main>

      <Navigation />
    </div>
  );
}
