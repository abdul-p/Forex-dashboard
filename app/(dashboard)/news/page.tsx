"use client";

import { useState, useEffect } from "react";

interface Article {
  article_id: string;
  title: string;
  description?: string;
  link: string;
  source_name: string;
  pubDate: string;
  image_url?: string;
  category: string[];
}

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const res = await fetch("/api/news");
      const data = await res.json();
      if (data.results) {
        setArticles(data.results);
      } else {
        setError("No articles found");
      }
    } catch (error) {
      setError("Failed to load news");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Forex News</h1>
          <p className="text-gray-500 text-sm mt-1">
            Latest news and market updates
          </p>
        </div>
        <button
          onClick={fetchNews}
          className="border border-gray-700 text-gray-400 px-4 py-2 rounded-xl text-sm hover:bg-gray-800 transition"
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-600">Loading news...</div>
      ) : error ? (
        <div className="text-center py-20 text-red-400">{error}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {articles.map((article) => (
            <a
              key={article.article_id}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-green-400/30 transition group"
            >
              {article.image_url && (
                <div className="h-40 overflow-hidden">
                  <img
                    src={article.image_url}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-green-400 font-medium">
                    {article.source_name}
                  </span>
                  <span className="text-gray-700">·</span>
                  <span className="text-xs text-gray-600">
                    {formatDate(article.pubDate)}
                  </span>
                </div>
                <h3 className="text-white font-semibold text-sm leading-snug mb-2 group-hover:text-green-400 transition">
                  {article.title}
                </h3>
                {article.description && (
                  <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
                    {article.description}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
