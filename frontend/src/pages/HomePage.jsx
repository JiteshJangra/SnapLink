import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { urlApi } from '../services/api';
import { Copy, Check, Zap, Shield, BarChart3, Globe } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function HomePage() {
  const [form, setForm] = useState({ originalUrl: '', customAlias: '' });
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const { mutate, data, isPending, error, reset } = useMutation({
    mutationFn: urlApi.create,
  });

  function handleSubmit(e) {
    e.preventDefault();
    reset();
    mutate({
      originalUrl: form.originalUrl,
      ...(form.customAlias && { customAlias: form.customAlias }),
    });
  }

  async function copy() {
    await navigator.clipboard.writeText(data.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-20">
      {/* Hero */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 text-xs font-medium bg-green-500/10 text-violet-100 border border-violet-500/20 rounded-full px-4 py-1.5 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Distributed · Redis-cached · 5,000 req/s
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          <span className="bg-gradient-to-br from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Shorten URLs at
          </span>
          <br />
          <span className="bg-gradient-to-r from-violet-300 to-green-300 bg-clip-text text-transparent">
            scale.
          </span>
        </h1>
        <p className="text-gray-400 text-lg max-w-lg mx-auto">
          Built with MERN stack + Redis. Cache-aside pattern, sliding window rate limiting,
          async analytics queue.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <input
            type="url"
            placeholder="https://your-long-url.com/..."
            value={form.originalUrl}
            onChange={(e) => setForm({ ...form, originalUrl: e.target.value })}
            required
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
          />
          <button
            type="submit"
            disabled={isPending}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all px-6 py-3.5 rounded-xl font-semibold flex items-center gap-2 whitespace-nowrap"
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Zap size={16} />
            )}
            Shorten
          </button>
        </div>

        <input
          type="text"
          placeholder="Custom alias (optional) — e.g. my-link"
          value={form.customAlias}
          onChange={(e) => setForm({ ...form, customAlias: e.target.value })}
          pattern="[A-Za-z0-9]{3,20}"
          title="3–20 alphanumeric characters"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
        />
      </form>

      {/* Error */}
      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
          {error.response?.data?.error || 'Something went wrong. Please try again.'}
        </div>
      )}

      {/* Result */}
      {data && (
        <div className="mt-6 p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">Your short link</p>
              <a
                href={data.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 font-mono text-lg font-semibold truncate block transition-colors"
              >
                {data.shortUrl}
              </a>
            </div>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => setShowQR(!showQR)}
              className="text-sm px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              QR
            </button>
          </div>

          <div className="text-xs text-gray-500 truncate">
            → <span className="text-gray-400">{data.originalUrl}</span>
          </div>

          {showQR && (
            <div className="flex justify-center p-4 bg-white rounded-xl">
              <QRCodeSVG value={data.shortUrl} size={160} />
            </div>
          )}
        </div>
      )}

      {/* Feature pills */}
      <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Zap, label: 'Redis cache', desc: '< 5ms redirects' },
          { icon: Shield, label: 'Rate limiting', desc: 'Sliding window' },
          { icon: BarChart3, label: 'Analytics', desc: 'Async queue' },
          { icon: Globe, label: 'Clustered', desc: 'Per-CPU workers' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="p-4 rounded-xl bg-white/3 border border-white/8 text-center">
            <Icon size={18} className="text-violet-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-white">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
