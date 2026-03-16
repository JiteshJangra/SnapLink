import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { urlApi } from '../services/api';
import { BarChart3, Copy, Trash2, ExternalLink, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const [copiedCode, setCopiedCode] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['urls', page],
    queryFn: () => urlApi.list({ page, limit: 10 }),
  });

  const deleteMutation = useMutation({
    mutationFn: urlApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['urls'] }),
  });

  async function copyUrl(shortUrl, code) {
    await navigator.clipboard.writeText(shortUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  const BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">My Links</h1>
          <p className="text-gray-400 text-sm mt-1">
            {data?.total ?? '—'} total links
          </p>
        </div>
        <Link
          to="/"
          className="bg-violet-600 hover:bg-violet-500 transition-colors px-4 py-2 rounded-lg text-sm font-medium"
        >
          + New link
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data?.urls?.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">No links yet.</p>
          <Link to="/" className="text-violet-400 hover:underline text-sm mt-2 block">
            Create your first short link
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.urls?.map((url) => {
            const shortUrl = `${BASE}/${url.shortCode}`;
            return (
              <div
                key={url._id}
                className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/8 border border-white/8 rounded-xl transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-violet-400 font-semibold text-sm">
                      {url.shortCode}
                    </span>
                    <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                      {url.clicks} clicks
                    </span>
                    {url.expiresAt && (
                      <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock size={10} />
                        Expires {formatDistanceToNow(new Date(url.expiresAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm truncate">{url.originalUrl}</p>
                  <p className="text-gray-600 text-xs mt-0.5">
                    Created {formatDistanceToNow(new Date(url.createdAt), { addSuffix: true })}
                  </p>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyUrl(shortUrl, url.shortCode)}
                    title="Copy"
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedCode === url.shortCode
                      ? <span className="text-green-400 text-xs font-medium">Copied</span>
                      : <Copy size={15} />}
                  </button>
                  <a
                    href={shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open"
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <ExternalLink size={15} />
                  </a>
                  <Link
                    to={`/stats/${url.shortCode}`}
                    title="Analytics"
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-violet-400 transition-colors"
                  >
                    <BarChart3 size={15} />
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm('Delete this link?')) deleteMutation.mutate(url.shortCode);
                    }}
                    title="Delete"
                    className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data?.pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {[...Array(data.pages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                page === i + 1
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
