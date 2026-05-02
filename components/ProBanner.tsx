'use client';

export default function ProBanner() {
  return (
    <div className="w-full max-w-5xl mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h3 className="text-white font-bold text-lg">⚡ Upgrade to Pro</h3>
        <p className="text-indigo-200 text-sm mt-1">
          Unlimited AI analysis · Custom piece skins · Priority matchmaking · No ads
        </p>
      </div>
      <button
        onClick={() => alert('Stripe integration coming soon! 🚀')}
        className="px-6 py-3 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-colors whitespace-nowrap"
      >
        Get Pro — $5/mo
      </button>
    </div>
  );
}
