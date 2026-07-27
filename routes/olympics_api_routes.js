const { OlympicsEntries, Users } = require("../models");
const requireAuth = require("../middleware/Requireauth");

module.exports = function (app) {

    // GET /api/olympics/entries/check/:name
    app.get("/api/olympics/entries/check/:name", async (req, res) => {
        try {
            const user = await Users.findOne({ where: { name: req.params.name } });
            if (!user) return res.json({ exists: false });
            const entry = await OlympicsEntries.findOne({ where: { user_id: user.id } });
            res.json({ exists: !!entry });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Check failed" });
        }
    });

    // POST /api/olympics/entries/create
    app.post("/api/olympics/entries/create", requireAuth, async (req, res) => {
        try {
            const entry_name = (req.body.entry_name || req.user.name).trim();

            if (!entry_name) {
                return res.status(400).json({ error: "Entry name is required" });
            }

            // Check if display name is taken by someone else
            const nameTaken = await OlympicsEntries.findOne({ where: { entry_name } });
            if (nameTaken && nameTaken.user_id !== req.user.id) {
                return res.status(400).json({ error: "That display name is already taken" });
            }

            const [entry, created] = await OlympicsEntries.findOrCreate({
                where: { user_id: req.user.id },
                defaults: { entry_name },
            });

            res.json({ success: true, created, entry_name: entry.entry_name });
        } catch (err) {
            console.error("Entry creation error:", err);
            res.status(500).json({ error: "Failed to join the pool" });
        }
    });

    // GET /api/olympics/entries
    app.get("/api/olympics/entries", async (req, res) => {
        try {
            const entries = await OlympicsEntries.findAll({
                attributes: ["id", "user_id", "entry_name", "createdAt"],
            });
            res.json(entries);
        } catch (err) {
            res.status(500).json({ error: "Failed to load entries" });
        }
    });

    // ----------------------------------
    // GET all OlympicsCountryPools
    // ----------------------------------
    app.get("/api/olympics/countrypools", async (req, res) => {
        try {
            const rows = await OlympicsCountryPools.findAll({ raw: true });
            const formatted = rows.map((country) => {
                const gold = Number(country.gold) || 0;
                const silver = Number(country.silver) || 0;
                const bronze = Number(country.bronze) || 0;
                const price = Number(country.price) || 0;

                return {
                    id: country.id,
                    country_name: country.country_name,
                    gold,
                    silver,
                    bronze,
                    price,
                    times_selected: Number(country.times_selected) || 0,
                };
            });

            // Optional: sort by price or score
            formatted.sort((a, b) => b.price - a.price);

            res.json(formatted);
        } catch (err) {
            console.error("❌ Failed to fetch country pools:", err);
            res.status(500).json({ error: "Failed to fetch country pools" });
        }
    });

    // --------medal table
    app.get("/api/olympics/medaltable", async (req, res) => {
        const url =
            "https://site.web.api.espn.com/apis/site/v2/olympics/winter/2026/medals?region=us&lang=en";

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (!Array.isArray(data.medals)) {
                return res.status(500).json({
                    error: "Unexpected ESPN medal format",
                });
            }

            const normalized = data.medals.map((c) => ({
                country_name: c.displayName,
                code: c.abbreviation,
                flag: c.flag?.href,
                gold: c.medalStandings?.goldMedalCount || 0,
                silver: c.medalStandings?.silverMedalCount || 0,
                bronze: c.medalStandings?.bronzeMedalCount || 0,
                total: c.medalStandings?.totalMedals || 0,
                score: (c.medalStandings?.goldMedalCount * 3 + c.medalStandings?.silverMedalCount * 2 + c.medalStandings?.bronzeMedalCount) || 0,
            }));

            res.json(normalized);
        } catch (err) {
            console.error("ESPN medal API error:", err);
            res.status(500).json({ error: "Failed to fetch medal table" });
        }
    });

    // --------------NEWS
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

    // picks
    // ----------------------------------
    // GET all rosters (admin/debug)
    // ----------------------------------
    app.get("/api/olympics/rosterpicks", async (req, res) => {
        try {
            const rows = await OlympicsRosterPicks.findAll();
            res.json(rows);
        } catch (err) {
            res.status(500).json(err);
        }
    });

    // ----------------------------------
    // GET roster by name (used for overwrite warning)
    // ----------------------------------
    app.get("/api/olympics/rosterpicks/by-name/:name", async (req, res) => {
        try {
            const rows = await OlympicsRosterPicks.findAll({
                where: { name: req.params.name },
                order: [["id", "ASC"]],
            });
            res.json(rows);
        } catch (err) {
            res.status(500).json(err);
        }
    });

    app.get("/api/olympics/getmyroster", async (req, res) => {
        try {
            const { name } = req.query;
            if (!name) return res.status(400).json({ error: "Missing name parameter" });

            const rows = await OlympicsRosterPicks.findAll({
                where: { name },
                order: [["id", "ASC"]],
            });

            // just return the data as an array
            res.json(Array.isArray(rows) ? rows : []);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to fetch user's roster" });
        }
    });


    // ----------------------------------
    // POST roster (OVERWRITE SAFE)
    // ----------------------------------
    app.post("/api/olympics/rosterpicks", async (req, res) => {
        try {
            const data = Array.isArray(req.body) ? req.body : [req.body];
            const name = data[0]?.name;

            if (!name) {
                return res.status(400).json({ error: "Missing name" });
            }

            // 🔥 delete existing roster first
            await OlympicsRosterPicks.destroy({ where: { name } });

            // insert new roster
            const created = await OlympicsRosterPicks.bulkCreate(
                data.map(row => ({
                    name: row.name,
                    country_name: row.country_name,
                    price: row.price,
                }))
            );

            res.json({ success: true, overwritten: true, created });
        } catch (err) {
            console.error(err);
            res.status(500).json(err);
        }
    });

    // SCOREBOARD
    app.get("/api/olympics/scoreboard", async (req, res) => {
        try {
            const teams = await OlympicsRosterPicks.findAll({ raw: true });
            const medalMap = await getMedalMap();

            const usersMap = {};

            teams.forEach((r) => {
                if (!usersMap[r.name]) {
                    usersMap[r.name] = { name: r.name, countries: [], total: 0 };
                }

                const medal = medalMap[r.country_name] || {
                    score: 0,
                };

                usersMap[r.name].countries.push({
                    country_name: r.country_name,
                    points: medal.score,
                });

                usersMap[r.name].total += medal.score;
            });

            const users = Object.values(usersMap).sort(
                (a, b) => b.total - a.total
            );

            res.json(users);
        } catch (err) {
            console.error("Failed to fetch scoreboard:", err);
            res.status(500).json({ error: "Failed to fetch scoreboard" });
        }
    });

    // STANDINGS-
    app.get("/api/olympics/standings", async (req, res) => {
        try {
            const rosters = await OlympicsRosterPicks.findAll({ raw: true });
            const medalMap = await getMedalMap();

            const standingsMap = {};

            rosters.forEach((r) => {
                if (!standingsMap[r.name]) {
                    standingsMap[r.name] = {
                        name: r.name,
                        total: 0,
                        countries: [],
                    };
                }

                const medal = medalMap[r.country_name] || {
                    score: 0,
                };

                standingsMap[r.name].countries.push(
                    `${r.country_name}: ${medal.score}`
                );

                standingsMap[r.name].total += medal.score;
            });

            const results = Object.values(standingsMap)
                .map((r) => ({
                    name: r.name,
                    total: r.total,
                    country_list: r.countries.join("<br>"),
                }))
                .sort((a, b) => b.total - a.total);

            res.json(results);
        } catch (err) {
            console.error("Standings query failed:", err);
            res.status(500).json({ error: "Failed to load standings" });
        }
    });

};