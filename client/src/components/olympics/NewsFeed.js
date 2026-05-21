import React, { useEffect, useState } from "react";
import axios from "axios";

const CACHE_KEY = "olympic_news_cache";
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export default function NewsFeed() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNews = async () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);

      if (cached) {
        const { data, timestamp } = JSON.parse(cached);

        if (Date.now() - timestamp < CACHE_TTL) {
          setNews(data);
          setLoading(false);
          return;
        }
      }

      const res = await axios.get("/api/olympics/news");

      setNews(res.data);

      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data: res.data,
          timestamp: Date.now(),
        })
      );
    } catch (err) {
      console.error("Failed to load news", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();

    const interval = setInterval(loadNews, CACHE_TTL); // refresh hourly
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="news-card">Loading latest Olympic news…</div>;
  }

  return (
    <section className="news-feed">
      <h3 className="news-title">📰 Live Winter Olympics News</h3>
      <ul>
        {news.map((item, idx) => (
          <li key={idx}>
            <a href={item.link} target="_blank" rel="noopener noreferrer">
              {item.title}
            </a>
            <span className="news-meta">
              {new Date(item.published).toLocaleTimeString()}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
