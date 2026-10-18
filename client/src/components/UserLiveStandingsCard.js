import React, { useEffect, useState } from "react";
import axios from "axios";
import useAuth from "../hooks/useAuth";
import PoolEmoji from "./PoolEmoji";

const STANDINGS_ENDPOINTS = {
    cfb_pickem_ats: "/api/cfb_pickem_ats/standings",
    cfb_bowl_pickem: "/api/cfb_bowl_pickem/standings",
    mlb_hrd: "/api/mlb_hrd/standings",
    mlb_playoffs: "/api/mlb_playoffs/standings",
    nba_playoffs: "/api/nba_playoffs/standings",
    ncaab_champ_week_pickem: "/api/ncaab_champweek_pickem/standings",
    ncaab_pickem_ats: "/api/ncaab_pickem_ats/standings",
    nfl_bts: "/api/nfl_bts/standings",
    nfl_pickem_ats: "/api/nfl_pickem_ats/standings",
    olympics: { url: "/api/olympics/standings", nameField: "name" },
    world_cup: { url: "/api/worldcup/standings", userIdField: "id" },
    ncaab_tourney_bracket: { url: "/api/ncaab_bracket/standings", nameField: "name" },
    ncaab_tourney_pickem: { url: "/api/ncaab_tourney_pickem/standings", nameField: "name" },
};

const SURVIVOR_ENTRY_ENDPOINTS = {
    nba_survivor: "/api/nba_survivor/entries/me",
    nfl_survivor: "/api/nflsurvivor/entries/me",
    nfl_survivor_secondchance: "/api/nfl_survivor_secondchance/entries/me",
};

function getStandingsList(data) {
    if (Array.isArray(data)) return data;
    const list = data?.standings || data?.leaderboard || data?.results || data?.data || [];
    return Array.isArray(list) ? list : [];
}

function findUserEntry(data, user, { userIdField, nameField } = {}) {
    return getStandingsList(data).find(entry =>
        String(entry.user_id ?? entry.userId ?? "") === String(user.id)
        || (userIdField && entry[userIdField] != null && String(entry[userIdField]) === String(user.id))
        || (nameField && entry[nameField] && entry[nameField] === user.name)
    );
}

function getUserSpot(data, user, config) {
    const standings = getStandingsList(data);
    const entry = findUserEntry(data, user, config);
    const userIndex = standings.indexOf(entry);

    if (userIndex < 0) return null;

    const rank = Number(entry.rank ?? entry.position ?? entry.place);
    return Number.isFinite(rank) && rank > 0 ? rank : userIndex + 1;
}

function formatRank(rank) {
    if (rank === 1) return "1st";
    if (rank === 2) return "2nd";
    if (rank === 3) return "3rd";
    return `${rank}th`;
}

function getSurvivorStatus(entry) {
    if (!entry) return "No entry";
    const isEliminated = entry.is_eliminated === true
        || entry.is_eliminated === 1
        || entry.is_eliminated === "true";
    if (isEliminated) {
        return entry.eliminated_week
            ? `Eliminated · Week ${entry.eliminated_week}`
            : "Eliminated";
    }
    return "Active";
}

function getBtsRecords(data, userId) {
    const userRecord = getStandingsList(data).find(entry =>
        String(entry.user_id ?? entry.userId ?? "") === String(userId)
    );
    if (!userRecord) return [];

    return [1, 2]
        .map(teamNumber => {
            const team = userRecord[`team_name_${teamNumber}`];
            if (!team) return null;

            const atsWins = Number(userRecord[`ats_wins_${teamNumber}`]) || 0;
            const atsLosses = Number(userRecord[`ats_losses_${teamNumber}`]) || 0;

            return {
                label: team,
                value: `${atsWins}-${atsLosses}`,
            };
        })
        .filter(Boolean);
}

export default function UserLiveStandingsCard({ isDarkMode }) {
    const { user, loading: authLoading } = useAuth();
    const [livePools, setLivePools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        let isCurrent = true;

        const loadLiveStandings = async () => {
            if (authLoading) return;
            if (!user) {
                setLivePools([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const { data: settings } = await axios.get("/api/settings/active-states");
                const now = new Date();
                const joinedLivePools = (settings || []).filter(pool => {
                    const isActive = pool.is_active === true || pool.is_active === 1 || pool.is_active === "true";
                    const isJoined = (pool.user_ids || []).some(id => String(id) === String(user.id));
                    const lockDate = pool.lock_date ? new Date(pool.lock_date) : null;
                    const endDate = pool.end_date ? new Date(pool.end_date) : null;
                    return isActive && isJoined && lockDate && now >= lockDate && (!endDate || now <= endDate);
                });

                const results = await Promise.all(joinedLivePools.map(async pool => {
                    const gameKey = pool.game_key;
                    const endpointConfig = STANDINGS_ENDPOINTS[gameKey];
                    const survivorEndpoint = SURVIVOR_ENTRY_ENDPOINTS[gameKey];
                    if (survivorEndpoint) {
                        try {
                            const response = await axios.get(survivorEndpoint, {
                                headers: token ? { Authorization: `Bearer ${token}` } : {},
                            });
                            const entry = response.data?.entry || null;
                            return {
                                gameKey,
                                label: pool.game_label || gameKey,
                                route: pool.prefix,
                                 linkTo: `${pool.prefix}/grouppicks`,
                                status: getSurvivorStatus(entry),
                            };
                        } catch (error) {
                            console.error(`Failed to load survivor entry status for ${gameKey}`, error);
                            return {
                                gameKey,
                                label: pool.game_label || gameKey,
                                route: pool.prefix,
                                linkTo: pool.prefix,
                                status: "Unavailable",
                            };
                        }
                    }

                    if (!endpointConfig) {
                        return {
                            gameKey,
                            label: pool.game_label || gameKey,
                            route: pool.prefix,
                            linkTo: pool.prefix,
                            rank: null,
                        };
                    }

                    try {
                        const config = typeof endpointConfig === "string" ? { url: endpointConfig } : endpointConfig;
                        const response = await axios.get(config.url, {
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                        });
                        const linkTo = `${pool.prefix}/standings`;
                        if (gameKey === "nfl_bts") {
                            return {
                                gameKey,
                                label: pool.game_label || gameKey,
                                route: pool.prefix,
                                linkTo,
                                records: getBtsRecords(response.data, user.id),
                            };
                        }
                        return {
                            gameKey,
                            label: pool.game_label || gameKey,
                            route: pool.prefix,
                            linkTo,
                            rank: getUserSpot(response.data, user, config),
                        };
                    } catch (error) {
                        console.error(`Failed to load standings for ${gameKey}`, error);
                        return {
                            gameKey,
                            label: pool.game_label || gameKey,
                            route: pool.prefix,
                            linkTo: `${pool.prefix}/standings`,
                            rank: null,
                        };
                    }
                }));

                if (isCurrent) setLivePools(results);
            } catch (error) {
                console.error("Failed to load user's live pool standings", error);
                if (isCurrent) setLivePools([]);
            } finally {
                if (isCurrent) setLoading(false);
            }
        };

        loadLiveStandings();
        return () => {
            isCurrent = false;
        };
    }, [authLoading, user]);

    return (
        <section className={`user-live-standings-card${isDarkMode ? " user-live-standings-card--dark" : ""}`}>
            <button
                type="button"
                className="user-live-standings-toggle"
                aria-expanded={isExpanded}
                aria-controls="user-live-standings-content"
                onClick={() => setIsExpanded(expanded => !expanded)}
            >
                <span className="user-live-standings-title">🏆 My Live Standings</span>
                <span className={`user-live-standings-chevron${isExpanded ? " user-live-standings-chevron--expanded" : ""}`} aria-hidden="true">▼</span>
            </button>
            <div
                id="user-live-standings-content"
                className={`user-live-standings-content${isExpanded ? " user-live-standings-content--expanded" : ""}`}
                aria-hidden={!isExpanded}
            >
                {authLoading || loading ? (
                    <p className="user-live-standings-message">Checking your live pools...</p>
                ) : !user ? (
                    <p className="user-live-standings-message">Sign in to see your standings.</p>
                ) : livePools.length === 0 ? (
                    <p className="user-live-standings-message">You’re not in any live pools right now.</p>
                ) : (
                    <div className="user-live-standings-list">
                        {livePools.map(pool => (
                            <a
                                className="user-live-standings-pool"
                                href={pool.linkTo ? `#${pool.linkTo}` : "#/"}
                                key={pool.gameKey}
                            >
                                <span className="user-live-standings-pool-name">
                                    <PoolEmoji gameKey={pool.gameKey} />
                                    <span>{pool.label}</span>
                                </span>
                                {pool.rank != null && <strong>{formatRank(pool.rank)}</strong>}
                                {pool.status && <strong>{pool.status}</strong>}
                                {pool.records?.length > 0 && (
                                    <span className="user-live-standings-records">
                                        {pool.records.map(record => (
                                            <span className="user-live-standings-record" key={record.label}>
                                                <span>{record.label}</span>
                                                <strong>{record.value}</strong>
                                            </span>
                                        ))}
                                    </span>
                                )}
                                {pool.rank == null && !pool.status && !pool.records?.length && (
                                    <strong>Unavailable</strong>
                                )}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
