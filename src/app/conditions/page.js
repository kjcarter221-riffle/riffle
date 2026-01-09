'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import {
  CloudSun, Thermometer, Wind, Droplets, Moon, Clock, MapPin,
  ChevronDown, TrendingUp, TrendingDown, Minus, ArrowLeft, Fish
} from 'lucide-react';

export default function ConditionsPage() {
  const [conditions, setConditions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRiver, setSelectedRiver] = useState(null);
  const [rivers, setRivers] = useState([]);
  const [showRiverSelect, setShowRiverSelect] = useState(false);

  useEffect(() => {
    // Get popular rivers
    fetch('/api/rivers?popular=true')
      .then(res => res.json())
      .then(data => setRivers(data.rivers || []));

    // Get conditions
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchConditions(pos.coords.latitude, pos.coords.longitude),
        () => fetchConditions()
      );
    } else {
      fetchConditions();
    }
  }, []);

  const fetchConditions = async (lat, lon, riverId) => {
    setLoading(true);
    let url = '/api/conditions';
    const params = new URLSearchParams();
    if (lat) params.set('lat', lat);
    if (lon) params.set('lon', lon);
    if (riverId) params.set('river', riverId);
    if (params.toString()) url += `?${params}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      setConditions(data);
    } catch (err) {
      console.error('Failed to fetch conditions:', err);
    }
    setLoading(false);
  };

  const selectRiver = (river) => {
    setSelectedRiver(river);
    setShowRiverSelect(false);
    fetchConditions(river.lat, river.lon, river.site_id);
  };

  if (loading && !conditions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Loading conditions...</div>
      </div>
    );
  }

  const cond = conditions?.conditions;
  const weather = conditions?.weather;
  const moon = conditions?.moonPhase;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="safe-top sticky top-0 z-40 glass border-b border-white/20">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 -ml-2 text-stone-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-semibold text-stone-900">Conditions</h1>
              <button
                onClick={() => setShowRiverSelect(true)}
                className="text-xs text-river-600 flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" />
                {selectedRiver?.name || 'Your Location'}
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Score Card */}
        {cond && (
          <div className="card p-6 text-center">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
              cond.rating === 'Excellent' ? 'bg-forest-100' :
              cond.rating === 'Good' ? 'bg-river-100' :
              cond.rating === 'Fair' ? 'bg-amber-100' : 'bg-red-100'
            }`}>
              <div>
                <p className="text-3xl font-bold">{cond.score}</p>
                <p className="text-xs uppercase tracking-wide opacity-70">Score</p>
              </div>
            </div>
            <h2 className={`text-xl font-bold mb-2 ${
              cond.rating === 'Excellent' ? 'text-forest-600' :
              cond.rating === 'Good' ? 'text-river-600' :
              cond.rating === 'Fair' ? 'text-amber-600' : 'text-red-600'
            }`}>
              {cond.rating} Conditions
            </h2>
            <p className="text-stone-600 text-sm">{cond.summary}</p>
          </div>
        )}

        {/* Weather Grid */}
        {weather && (
          <div className="card p-4">
            <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
              <CloudSun className="w-5 h-5 text-river-500" />
              Current Weather
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <WeatherItem icon={<Thermometer />} label="Temperature" value={`${weather.temperature}°F`} sub={`Feels ${weather.feels_like}°`} />
              <WeatherItem icon={<Wind />} label="Wind" value={`${weather.wind_speed} mph`} sub={weather.wind_direction} />
              <WeatherItem icon={<Droplets />} label="Pressure" value={`${weather.pressure} mb`} sub={weather.weather} />
              <WeatherItem icon={<CloudSun />} label="Clouds" value={`${weather.clouds}%`} sub={weather.description} />
            </div>
          </div>
        )}

        {/* Moon Phase */}
        {moon && (
          <div className="card p-4">
            <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
              <Moon className="w-5 h-5 text-river-500" />
              Moon Phase
            </h3>
            <div className="flex items-center gap-4">
              <div className="text-4xl">{moon.emoji}</div>
              <div>
                <p className="font-semibold text-stone-900">{moon.name}</p>
                <p className="text-sm text-stone-600">{moon.fishing}</p>
              </div>
            </div>
          </div>
        )}

        {/* River Data */}
        {conditions?.riverData && (
          <div className="card p-4">
            <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
              <Fish className="w-5 h-5 text-river-500" />
              River Data
            </h3>
            <p className="text-sm text-stone-600 mb-3">{conditions.riverData.site_name}</p>
            <div className="grid grid-cols-2 gap-4">
              {conditions.riverData.flow_display && (
                <div>
                  <p className="text-sm text-stone-500">Flow</p>
                  <p className="font-semibold">{conditions.riverData.flow_display}</p>
                </div>
              )}
              {conditions.riverData.water_temp_f && (
                <div>
                  <p className="text-sm text-stone-500">Water Temp</p>
                  <p className="font-semibold">{conditions.riverData.water_temp_f}°F</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Factors */}
        {cond?.factors && (
          <div className="card p-4">
            <h3 className="font-semibold text-stone-900 mb-4">Score Breakdown</h3>
            <div className="space-y-3">
              {cond.factors.map((factor, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {factor.good === true ? (
                      <TrendingUp className="w-4 h-4 text-forest-500" />
                    ) : factor.good === false ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : (
                      <Minus className="w-4 h-4 text-stone-400" />
                    )}
                    <span className="text-stone-700">{factor.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-stone-900">{factor.value}</span>
                    <span className={`ml-2 text-xs ${
                      factor.impact.startsWith('+') ? 'text-forest-600' :
                      factor.impact.startsWith('-') ? 'text-red-600' : 'text-stone-400'
                    }`}>
                      {factor.impact}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Best Times */}
        {conditions?.bestTimes && (
          <div className="card p-4">
            <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-river-500" />
              Best Times Today
            </h3>
            <div className="space-y-3">
              {conditions.bestTimes.map((time, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-stone-900">{time.period}</p>
                    <p className="text-xs text-stone-500">{time.time}</p>
                  </div>
                  <span className={`condition-badge ${
                    time.quality === 'excellent' ? 'condition-excellent' :
                    time.quality === 'good' ? 'condition-good' : 'condition-fair'
                  }`}>
                    {time.quality}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* River Select Modal */}
      {showRiverSelect && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl max-h-[70vh] overflow-hidden animate-slide-up">
            <div className="sticky top-0 bg-white px-4 py-3 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-semibold">Select a River</h3>
              <button onClick={() => setShowRiverSelect(false)} className="text-stone-400">
                Cancel
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh]">
              <button
                onClick={() => {
                  setSelectedRiver(null);
                  setShowRiverSelect(false);
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => fetchConditions(pos.coords.latitude, pos.coords.longitude),
                      () => fetchConditions()
                    );
                  }
                }}
                className="w-full px-4 py-3 text-left border-b border-stone-100 hover:bg-stone-50"
              >
                <p className="font-medium">Use My Location</p>
                <p className="text-sm text-stone-500">Get conditions for where you are</p>
              </button>
              {rivers.map((river, i) => (
                <button
                  key={i}
                  onClick={() => selectRiver(river)}
                  className="w-full px-4 py-3 text-left border-b border-stone-100 hover:bg-stone-50"
                >
                  <p className="font-medium">{river.name}</p>
                  <p className="text-xs text-stone-500">USGS #{river.site_id}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Navigation />
    </div>
  );
}

function WeatherItem({ icon, label, value, sub }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-river-50 rounded-lg flex items-center justify-center text-river-500">
        {icon}
      </div>
      <div>
        <p className="text-sm text-stone-500">{label}</p>
        <p className="font-semibold text-stone-900">{value}</p>
        {sub && <p className="text-xs text-stone-400">{sub}</p>}
      </div>
    </div>
  );
}
