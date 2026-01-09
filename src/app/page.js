'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Fish, MessageCircle, CloudSun, BookOpen, Users, Smartphone, Zap, ChevronRight } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="safe-top sticky top-0 z-50 glass border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-river-500 to-forest-500 rounded-xl flex items-center justify-center">
              <Fish className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">Riffle</span>
          </div>

          <nav className="flex items-center gap-3">
            {loading ? null : user ? (
              <Link href="/dashboard" className="btn-primary text-sm">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-secondary text-sm">
                  Log In
                </Link>
                <Link href="/register" className="btn-primary text-sm">
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-stone-900 mb-6">
            Your AI-Powered{' '}
            <span className="gradient-text">Fly Fishing</span>{' '}
            Companion
          </h1>
          <p className="text-xl text-stone-600 mb-8 max-w-2xl mx-auto">
            Real-time river conditions, intelligent fly recommendations, and community hatch reports - all in your pocket.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-lg px-8 py-4 flex items-center justify-center gap-2">
              Start Free <ChevronRight className="w-5 h-5" />
            </Link>
            <Link href="/conditions" className="btn-secondary text-lg px-8 py-4">
              Check Conditions
            </Link>
          </div>
          <p className="mt-4 text-sm text-stone-500">
            Free tier includes 3 journal entries/month. No credit card required.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Everything you need on the water</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<MessageCircle className="w-6 h-6" />}
              title="AI Fly Guide"
              description="Ask what flies to use, techniques to try, or how to read the water. Your personal guide, anytime."
              color="river"
            />
            <FeatureCard
              icon={<CloudSun className="w-6 h-6" />}
              title="Live Conditions"
              description="Real-time weather, USGS flow data, moon phases, and a fishing score for any river."
              color="forest"
            />
            <FeatureCard
              icon={<BookOpen className="w-6 h-6" />}
              title="Trip Journal"
              description="Log your trips with photos, conditions, and flies used. Track what works over time."
              color="amber"
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Hatch Reports"
              description="See what's hatching near you with community reports from fellow anglers."
              color="purple"
            />
            <FeatureCard
              icon={<Smartphone className="w-6 h-6" />}
              title="Works Offline"
              description="Install on your phone, access your data even without service at the river."
              color="pink"
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Instant Insights"
              description="See your best flies, top rivers, and fishing patterns at a glance."
              color="orange"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to catch more fish?</h2>
          <p className="text-stone-600 mb-8">
            Join anglers who use Riffle to fish smarter.
          </p>
          <Link href="/register" className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2">
            Get Started Free <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-stone-200 bg-white/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Fish className="w-5 h-5 text-river-600" />
            <span className="font-semibold text-stone-700">Riffle</span>
          </div>
          <div className="flex gap-6 text-sm text-stone-500">
            <Link href="/pricing" className="hover:text-river-600">Pricing</Link>
            <Link href="/conditions" className="hover:text-river-600">Conditions</Link>
            <Link href="/community" className="hover:text-river-600">Community</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }) {
  const colorClasses = {
    river: 'bg-river-100 text-river-600',
    forest: 'bg-forest-100 text-forest-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
    pink: 'bg-pink-100 text-pink-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-stone-900 mb-2">{title}</h3>
      <p className="text-stone-600">{description}</p>
    </div>
  );
}
