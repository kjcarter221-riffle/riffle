'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Fish, Check, X, Crown, ArrowLeft, Loader2,
  MessageCircle, BookOpen, CloudSun, Wifi, TrendingUp
} from 'lucide-react';

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user));
  }, []);

  const handleSubscribe = async () => {
    if (!user) {
      router.push('/register');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout');
        setLoading(false);
      }
    } catch (err) {
      alert('Failed to start checkout');
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open portal');
        setLoading(false);
      }
    } catch (err) {
      alert('Failed to open portal');
      setLoading(false);
    }
  };

  const isPro = user?.subscription_status === 'pro' || user?.subscription_status === 'active';

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="safe-top sticky top-0 z-40 glass border-b border-white/20">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href={user ? '/dashboard' : '/'} className="p-2 -ml-2 text-stone-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-stone-900">Pricing</h1>
        </div>
      </header>

      <main className="px-4 py-8 max-w-lg mx-auto">
        {canceled && (
          <div className="mb-6 p-4 bg-amber-50 text-amber-700 rounded-xl text-sm">
            Checkout was canceled. No charges were made.
          </div>
        )}

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-2">
            Fish smarter with Pro
          </h2>
          <p className="text-stone-600">
            Unlock unlimited access to all Riffle features
          </p>
        </div>

        {/* Free Tier */}
        <div className="card p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-stone-900">Free</h3>
            <span className="text-2xl font-bold text-stone-900">$0</span>
          </div>
          <ul className="space-y-3">
            <PricingFeature included text="3 journal entries per month" />
            <PricingFeature included text="Basic AI fly recommendations" />
            <PricingFeature included text="View conditions & hatch reports" />
            <PricingFeature included text="Submit hatch reports" />
            <PricingFeature included={false} text="Unlimited journal entries" />
            <PricingFeature included={false} text="Offline mode" />
            <PricingFeature included={false} text="Personal analytics" />
            <PricingFeature included={false} text="Advanced AI with history" />
          </ul>
        </div>

        {/* Pro Tier */}
        <div className="card p-6 border-2 border-river-500 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium rounded-full">
            LAUNCH PRICE - First 100 users
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Pro
            </h3>
            <div className="text-right">
              <span className="text-sm text-stone-400 line-through mr-2">$12.99</span>
              <span className="text-2xl font-bold text-stone-900">$4.99</span>
              <span className="text-stone-500">/mo</span>
            </div>
          </div>

          <ul className="space-y-3 mb-6">
            <PricingFeature included text="Unlimited journal entries" />
            <PricingFeature included text="Advanced AI with conversation memory" />
            <PricingFeature included text="Full conditions & river data" />
            <PricingFeature included text="Offline mode for the water" />
            <PricingFeature included text="Personal fishing analytics" />
            <PricingFeature included text="Priority hatch report access" />
            <PricingFeature included text="Early access to new features" />
          </ul>

          {isPro ? (
            <button
              onClick={handleManageSubscription}
              disabled={loading}
              className="btn-secondary w-full"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Manage Subscription'}
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Upgrade to Pro'}
            </button>
          )}
        </div>

        {/* Features Grid */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold text-center text-stone-900 mb-6">
            What you get with Pro
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <FeatureBox
              icon={<MessageCircle className="w-6 h-6 text-river-500" />}
              title="Smart AI"
              description="Context-aware recommendations"
            />
            <FeatureBox
              icon={<BookOpen className="w-6 h-6 text-forest-500" />}
              title="Unlimited Logs"
              description="Never lose a memory"
            />
            <FeatureBox
              icon={<Wifi className="w-6 h-6 text-purple-500" />}
              title="Offline Mode"
              description="Works without signal"
            />
            <FeatureBox
              icon={<TrendingUp className="w-6 h-6 text-amber-500" />}
              title="Analytics"
              description="Track your success"
            />
          </div>
        </div>

        <p className="text-center text-sm text-stone-500 mt-8">
          Cancel anytime. No questions asked.
        </p>
      </main>
    </div>
  );
}

function PricingFeature({ included, text }) {
  return (
    <li className="flex items-center gap-3">
      {included ? (
        <Check className="w-5 h-5 text-forest-500 flex-shrink-0" />
      ) : (
        <X className="w-5 h-5 text-stone-300 flex-shrink-0" />
      )}
      <span className={included ? 'text-stone-700' : 'text-stone-400'}>{text}</span>
    </li>
  );
}

function FeatureBox({ icon, title, description }) {
  return (
    <div className="card p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <h4 className="font-semibold text-stone-900">{title}</h4>
      <p className="text-xs text-stone-500">{description}</p>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PricingContent />
    </Suspense>
  );
}
