import React from "react";

const GOLD = "#c89d3c";
const WORLDCUPGREEN = "#226750";

export default function BracketStage({
    game,
    userPick,       // string — team name the user picked
    onPick,         // fn(gameId, teamName) — null if locked/readonly
    readonly,       // bool — tournament has started
}) {
    const COMPLETED_STATUSES = ["STATUS_FULL_TIME", "STATUS_FINAL", "FINAL", "STATUS_FINAL_PEN"];
    // Helper to check if a game is finished
    const isFinal = event.status?.type?.completed === true;
    const isLive = event.status?.type?.completed === false;
    const isTBD = (team) => !team || team === "TBD";

    // EXPLICIT RULE: Prevent picking if this card belongs to the 3rd Place Match (Round 6)
    const isThirdPlaceMatch = parseInt(game?.round) === 6;

    const renderTeam = (team, logo, isWinner, isPick) => {
        const tbd = isTBD(team);
        const eliminated = isFinal && !isWinner && isPick;
        const correct = isFinal && isWinner && isPick;

        // Block interaction if it's the 3rd place consolation match
        const canPick = !readonly && !tbd && onPick && !isThirdPlaceMatch;

        return (
            <div
                onClick={() => canPick && onPick(game.match_id, team)}
                style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 6,
                    cursor: canPick ? "pointer" : "default",
                    backgroundColor: correct ? "#f0fdf4" : eliminated ? "#fef2f2" : isPick ? "#eff6ff" : "white",
                    border: isPick ? `2px solid ${correct ? "#16a34a" : eliminated ? "#dc2626" : WORLDCUPGREEN}` : "2px solid transparent",
                    opacity: eliminated ? 0.5 : 1, transition: "all 0.15s"
                }}
            >
                {/* Logo */}
                {logo && !tbd ? (
                    <img src={logo} width={22} height={16} alt="" style={{ objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />
                ) : (
                    <div style={{ width: 22, height: 16, borderRadius: 2, backgroundColor: "#e5e7eb", flexShrink: 0 }} />
                )}

                {/* Name */}
                <span style={{
                    fontSize: 11, fontWeight: isPick ? 700 : 500,
                    color: tbd ? "#9ca3af" : correct ? "#16a34a" : eliminated ? "#dc2626" : "#1f2937",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                    textDecoration: eliminated ? "line-through" : "none",
                }}>
                    {tbd ? "TBD" : team}
                </span>

                {/* Score */}
                {(isLive || isFinal) && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", flexShrink: 0 }}>
                        {team === game.home_team ? game.home_score : game.away_score}
                    </span>
                )}

                {correct && <span style={{ fontSize: 12, flexShrink: 0 }}>✅</span>}
                {eliminated && <span style={{ fontSize: 12, flexShrink: 0 }}>❌</span>}
            </div>
        );
    };

    const homeIsPick = userPick === game.home_team;
    const awayIsPick = userPick === game.away_team;

    // REFIX: Align target calculations to use your database model's absolute relative ENUM states
    const homeIsWinner = game.status === "STATUS_FULL_TIME" && game.result === "Home";
    const awayIsWinner = game.status === "STATUS_FULL_TIME" && game.result === "Away";

    return (
        <div style={{
            background: "white", borderRadius: 8, border: `1px solid #e5e7eb`, overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)", width: 180, flexShrink: 0,
            opacity: isThirdPlaceMatch ? 0.85 : 1, // Subtle style tint indicating it's locked info only
            maxWidth: "800px", margin: "0 auto", paddingLeft: "8px", paddingRight: "8px"
        }}
        >
            {(isLive || isFinal) && (
                <div style={{
                    background: isLive ? "#dc2626" : "#6b7280", color: "white", fontSize: 9,
                    fontWeight: 700, textAlign: "center", padding: "2px 0", letterSpacing: "0.5px",
                }}>
                    {isLive ? `🔴 LIVE` : "FINAL"}
                </div>
            )}

            {renderTeam(game.away_team, game.away_logo, awayIsWinner, awayIsPick)}
            <div style={{ height: 1, backgroundColor: "#f3f4f6" }} />
            {renderTeam(game.home_team, game.home_logo, homeIsWinner, homeIsPick)}
        </div >
    );
}