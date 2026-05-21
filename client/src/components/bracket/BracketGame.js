import React from "react";

const GOLD = "#c89d3c";
const BLUE = "#13447a";

export default function BracketGame({
    game,
    userPick,       // string — team name the user picked
    onPick,         // fn(gameId, teamName) — null if locked/readonly
    isCorrect,      // bool — did user get this right (post-tournament)
    readonly,       // bool — tournament has started
    highlight,      // bool — this game has a live/final result
}) {
    const isFinal = game?.status === "STATUS_FINAL";
    const isLive = game?.status === "STATUS_IN_PROGRESS" || game?.status === "STATUS_HALFTIME";
    const isTBD = (team) => !team || team === "TBD";

    const renderTeam = (team, seed, logo, isWinner, isPick) => {
        const tbd = isTBD(team);
        const eliminated = isFinal && !isWinner && isPick;
        const correct = isFinal && isWinner && isPick;
        const canPick = !readonly && !tbd && onPick;

        return (
            <div
                onClick={() => canPick && onPick(game.id, team)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 8px",
                    borderRadius: 6,
                    cursor: canPick ? "pointer" : "default",
                    backgroundColor: correct ? "#f0fdf4"
                        : eliminated ? "#fef2f2"
                        : isPick ? "#eff6ff"
                        : "white",
                    border: isPick
                        ? `2px solid ${correct ? "#16a34a" : eliminated ? "#dc2626" : BLUE}`
                        : "2px solid transparent",
                    opacity: eliminated ? 0.5 : 1,
                    transition: "all 0.15s",
                    position: "relative",
                }}
            >
                {/* Seed */}
                <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#9ca3af",
                    minWidth: 14,
                    textAlign: "right",
                }}>
                    {seed || ""}
                </span>

                {/* Logo */}
                {logo && !tbd
                    ? <img src={logo} width={18} height={18} alt="" style={{ objectFit: "contain", flexShrink: 0 }} />
                    : <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "#e5e7eb", flexShrink: 0 }} />
                }

                {/* Name */}
                <span style={{
                    fontSize: 11,
                    fontWeight: isPick ? 700 : 500,
                    color: tbd ? "#9ca3af"
                        : correct ? "#16a34a"
                        : eliminated ? "#dc2626"
                        : "#1f2937",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    textDecoration: eliminated ? "line-through" : "none",
                }}>
                    {tbd ? "TBD" : team}
                </span>

                {/* Score (if live/final) */}
                {(isLive || isFinal) && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", flexShrink: 0 }}>
                        {team === game.home_team ? game.home_score : game.away_score}
                    </span>
                )}

                {/* Result icon */}
                {correct && <span style={{ fontSize: 12, flexShrink: 0 }}>✅</span>}
                {eliminated && <span style={{ fontSize: 12, flexShrink: 0 }}>❌</span>}
            </div>
        );
    };

    const homeIsPick = userPick === game.home_team;
    const awayIsPick = userPick === game.away_team;
    const homeIsWinner = game.winner === game.home_team;
    const awayIsWinner = game.winner === game.away_team;

    return (
        <div style={{
            background: "white",
            borderRadius: 8,
            border: `1px solid #e5e7eb`,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            width: 180,
            flexShrink: 0,
        }}>
            {/* Game status bar */}
            {(isLive || isFinal) && (
                <div style={{
                    background: isLive ? "#dc2626" : "#6b7280",
                    color: "white",
                    fontSize: 9,
                    fontWeight: 700,
                    textAlign: "center",
                    padding: "2px 0",
                    letterSpacing: "0.5px",
                }}>
                    {isLive ? `🔴 LIVE — ${game.game_clock}` : "FINAL"}
                </div>
            )}

            {renderTeam(game.away_team, game.away_seed, game.away_logo, awayIsWinner, awayIsPick)}
            <div style={{ height: 1, backgroundColor: "#f3f4f6" }} />
            {renderTeam(game.home_team, game.home_seed, game.home_logo, homeIsWinner, homeIsPick)}
        </div>
    );
}