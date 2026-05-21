const NewsAPI = require("newsapi");
const newsapi = new NewsAPI(process.env.NEWS_API_KEY);

module.exports = function (app) {
    app.get("/api/olympics/news", async (req, res) => {
        try {
            const response = await newsapi.v2.everything({
                q: '(Olympics OR Olympic) AND (skiing OR snowboarding OR skating OR hockey OR curling) -food -recipe -restaurant -diet -heated -temperature',
                language: "en",
                sortBy: "publishedAt",
                pageSize: 20,
                domains: "nbcnews.com,espn.com,reuters.com,apnews.com,bbc.com,cbc.ca",
            });

            const seenTitles = new Set();

            const cleaned = response.articles
                .map(a => ({
                    title: a.title?.trim(),
                    link: a.url,
                    published: a.publishedAt,
                    source: a.source.name,
                    image: a.urlToImage,
                }))
                .filter(article => {
                    const key = article.title.toLowerCase();
                    if (seenTitles.has(key)) return false;
                    seenTitles.add(key);
                    return true;
                });

            res.json(cleaned);

        } catch (err) {
            console.error("❌ News API error:", err.message);
            res.status(500).json({ error: "Failed to fetch news" });
        }
    });
};
