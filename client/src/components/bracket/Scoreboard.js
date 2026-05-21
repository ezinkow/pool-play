import React, { useEffect, useState } from "react";
import axios from "axios";
import RefreshGamesButton from './RefreshGamesButton';

const isLiveOrFinal = (status) =>
    status === "STATUS_IN_PROGRESS" ||
    status === "STATUS_FINAL" ||
    status === "STATUS_HALFTIME";

function formatDateET(date) {
    return new Date(date).toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
    });
}

function formatTimeET(date) {
    return new Date(date).toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
    });
}

const Scoreboard = () => {
    const [games, setGames] = useState([]);

    const fetchGames = async () => {
        const res = await axios.get("/api/bracket/games/history");
        setGames(res.data.filter((g) => isLiveOrFinal(g.status)));
    };

    useEffect(() => {
        fetchGames();
        const interval = setInterval(fetchGames, 3 * 60 * 1000);
        return () => clearInterval(interval);
    }, []); // empty deps - registers once, never re-creates

    useEffect(() => {
        document.body.classList.add("force-mobile");
        return () => document.body.classList.remove("force-mobile");
    }, []);

    const didFavoriteCover = (g) => {
        if (g.line === null || g.status !== "STATUS_FINAL") return null;
        const favIsHome = g.favorite === g.home_team;
        const favScore = favIsHome ? g.home_score : g.away_score;
        const dogScore = favIsHome ? g.away_score : g.home_score;
        return (favScore - g.line) > dogScore;
    };

    const thStyle = {
        position: "sticky",
        top: 65,
        backgroundColor: "#13447a",
        color: "white",
        borderBottom: "2px solid #c89d3c",
        padding: "8px 6px",
        textAlign: "left",
        whiteSpace: "nowrap",
        textTransform: "uppercase",
        fontSize: 11,
        letterSpacing: "0.3px",
    };

    return (
        <div style={{ paddingTop: 68, paddingBottom: 80, maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ padding: "0 12px" }}>
                <h2 style={{ color: "var(--primary-navy)", marginBottom: 4 }}>
                    🔢 Scoreboard 🆚
                </h2>
            </div>
            {/* Table has NO side padding so it uses full screen width on mobile */}
            <div style={{ marginTop: 12 }}>
                <table style={{ borderCollapse: "collapse", background: "white", fontSize: 14, width: "100%" }}>
                    <thead>
                        <tr>
                            <th style={thStyle}><span className="hide-mobile">Gamestart</span><span className="show-mobile">Start</span></th>
                            <th style={thStyle}><span className="hide-mobile">Underdog</span><span className="show-mobile">Dog</span></th>
                            <th style={thStyle}><span className="hide-mobile">Favorite</span><span className="show-mobile">Fav</span></th>
                            <th style={thStyle}><span className="hide-mobile">Line</span><span className="show-mobile">Line</span></th>
                            <th style={thStyle}><span className="hide-mobile">Score</span><span className="show-mobile">Score</span></th>
                            <th style={thStyle}><span className="hide-mobile">Covered</span><span className="show-mobile">Cvrd</span></th>
                            <th style={thStyle}><span className="hide-mobile">Status/Clock</span><span className="show-mobile">Status</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {games.map((g) => {
                            const favCovered = didFavoriteCover(g);
                            return (
                                <tr key={g.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                        <span className="hide-mobile">{formatDateET(g.game_date)} – </span>
                                        {formatTimeET(g.game_date)}
                                    </td>
                                    {/* UNDERDOG */}
                                    <td style={{ padding: "8px 6px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                                        {g.dog_logo && <img src={g.dog_logo} width="20" alt={g.underdog} title={g.underdog} style={{ marginRight: 3 }} />}
                                        {g.underdog === g.home_team}
                                        <span className="hide-mobile">
                                            {g.underdog === g.home_team ? `${g.underdog}` : g.underdog}
                                        </span>
                                    </td>

                                    {/* FAVORITE */}
                                    <td style={{ padding: "8px 6px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                                        {g.fav_logo && <img src={g.fav_logo} width="20" alt={g.favorite} title={g.favorite} style={{ marginRight: 3 }} />}
                                        {g.favorite === g.home_team}
                                        <span className="hide-mobile">
                                            {g.favorite === g.home_team ? `${g.favorite}` : g.favorite}
                                        </span>
                                    </td>
                                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                        <img src={g.fav_logo} width="18" alt="" style={{ marginRight: 3 }} className="hide-mobile" />
                                        -{g.line ?? "TBD"}
                                    </td>
                                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                        <img src={g.away_logo} width="18" alt="" style={{ marginRight: 2 }} />
                                        {g.away_score}–{g.home_score}
                                        <img src={g.home_logo} width="18" alt="" style={{ marginLeft: 2 }} />
                                    </td>
                                    <td style={{ padding: "8px 6px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                                        {g.status === "STATUS_FINAL" && (
                                            favCovered ? (
                                                <span style={{ color: "green", fontWeight: "bold" }}>
                                                    <img src={g.fav_logo} width="18" alt="" style={{ marginRight: 2 }} /> ✓
                                                </span>
                                            ) : (
                                                <span style={{ color: "red", fontWeight: "bold" }}>
                                                    <img src={g.dog_logo} width="18" alt="" style={{ marginRight: 2 }} /> ✓
                                                </span>
                                            )
                                        )}
                                    </td>
                                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                        {g.game_clock}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Scoreboard;