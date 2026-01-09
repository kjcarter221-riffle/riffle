import { WifiOff, Fish, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-stone-400" />
        </div>

        <h1 className="text-2xl font-bold text-stone-900 mb-2">You're Offline</h1>
        <p className="text-stone-600 mb-8">
          No worries - you're probably at a great fishing spot! Some features aren't available without internet.
        </p>

        <div className="space-y-4">
          <div className="card p-4 text-left">
            <h3 className="font-semibold text-stone-900 mb-2">Available Offline:</h3>
            <ul className="text-sm text-stone-600 space-y-1">
              <li>• View your cached journal entries</li>
              <li>• Access previously loaded conditions</li>
              <li>• Basic app navigation</li>
            </ul>
          </div>

          <div className="card p-4 text-left">
            <h3 className="font-semibold text-stone-900 mb-2">Needs Internet:</h3>
            <ul className="text-sm text-stone-600 space-y-1">
              <li>• AI fly recommendations</li>
              <li>• Real-time conditions</li>
              <li>• Community hatch reports</li>
              <li>• Syncing new journal entries</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>

          <Link href="/dashboard" className="btn-secondary w-full block text-center">
            Go to Dashboard
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-stone-400">
          <Fish className="w-5 h-5" />
          <span className="text-sm">Tight lines!</span>
        </div>
      </div>
    </div>
  );
}
