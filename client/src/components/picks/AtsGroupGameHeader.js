import React from "react";
import LivePulseIndicator from "./LivePulseIndicator";

const GOLD = "#c89d3c";

const getBadgeStyle = (primaryColor, secondaryColor) => ({
  background: secondaryColor,
  borderRadius: 4,
  padding: "2px 4px",
  display: "inline-flex",
  alignItems: "center",
  boxShadow: `0 0 4px 1px ${primaryColor}, 0 1px 2px rgba(0,0,0,0.2)`,
  border: `2px solid ${primaryColor}`,
  margin: "2px"
});

export default function AtsGroupGameHeader({
  game,
  teamColors,
  liveColor,
  teamColorField = "primaryColor",
  includeEndPeriodLive = false
}) {
  const rawStatus = (game.status || "").toUpperCase();
  const liveStatus = String(game.live_status || "");
  const isFinal = rawStatus === "STATUS_FINAL"
    || rawStatus === "FINAL"
    || rawStatus === "COMPLETED"
    || liveStatus.toLowerCase() === "final";
  const isLive = !isFinal && (
    rawStatus === "STATUS_IN_PROGRESS"
    || rawStatus === "IN_PROGRESS"
    || rawStatus === "HALFTIME"
    || rawStatus === "STATUS_HALFTIME"
    || rawStatus === "LIVE"
    || rawStatus.includes("HALF")
    || rawStatus.includes("PROGRESS")
    || (includeEndPeriodLive && rawStatus.includes("END_PERIOD"))
    || (liveStatus && liveStatus !== "Final" && !liveStatus.includes("AM") && !liveStatus.includes("PM"))
  );
  const hasScores = game.home_score !== null
    && game.home_score !== undefined
    && game.away_score !== null
    && game.away_score !== undefined;

  const coveredTeam = game.ats_winner || game.winner;
  const coveredLogo = coveredTeam === game.away_team
    ? game.away_logo
    : (coveredTeam === game.home_team ? game.home_logo : null);
  const isFavCovered = coveredTeam === game.favorite;
  const rawSpread = game.adjusted_spread !== null && game.adjusted_spread !== undefined
    ? parseFloat(game.adjusted_spread)
    : null;
  const spreadLabel = rawSpread !== null
    ? (isFavCovered
      ? (rawSpread < 0 ? rawSpread : -Math.abs(rawSpread))
      : (rawSpread > 0 ? `+${rawSpread}` : `+${Math.abs(rawSpread)}`))
    : "";

  const awayTeamMeta = teamColors[game.away_team] || {};
  const homeTeamMeta = teamColors[game.home_team] || {};
  const awayPrimary = game.away_color || awayTeamMeta[teamColorField] || "#000000";
  const awaySecondary = game.away_secondary_color || awayTeamMeta.secondaryColor || "#cbd5e1";
  const homePrimary = game.home_color || homeTeamMeta[teamColorField] || "#000000";
  const homeSecondary = game.home_secondary_color || homeTeamMeta.secondaryColor || "#cbd5e1";
  const favTeam = game.favorite;
  const favTeamMeta = teamColors[favTeam] || {};
  const favLogo = favTeam === game.away_team
    ? game.away_logo
    : (favTeam === game.home_team ? game.home_logo : favTeamMeta.logo);
  const favPrimary = favTeam === game.away_team
    ? awayPrimary
    : (favTeam === game.home_team ? homePrimary : (favTeamMeta[teamColorField] || "#000000"));
  const favSecondary = favTeam === game.away_team
    ? awaySecondary
    : (favTeam === game.home_team ? homeSecondary : (favTeamMeta.secondaryColor || "#cbd5e1"));
  const coveredMeta = teamColors[coveredTeam] || {};
  const coveredPrimary = coveredTeam === game.away_team
    ? awayPrimary
    : (coveredTeam === game.home_team ? homePrimary : (coveredMeta[teamColorField] || "#000000"));
  const coveredSecondary = coveredTeam === game.away_team
    ? awaySecondary
    : (coveredTeam === game.home_team ? homeSecondary : (coveredMeta.secondaryColor || "#cbd5e1"));
  const liveStatusText = game.live_status || "LIVE";

  return (
    <div className="ats-group-game-header" style={{ textAlign: "center", width: "100%", overflow: "visible" }}>
      <div className="ats-group-game-header-teams" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4, padding: "3px 2px" }}>
        <div className="ats-group-game-header-team" style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span className="ats-group-game-header-badge" style={getBadgeStyle(awayPrimary, awaySecondary)}>
            {game.away_logo && <img className="ats-group-game-header-logo" src={game.away_logo} alt="" height={16} style={{ flexShrink: 0, objectFit: "contain" }} />}
          </span>
          <span className="ats-group-game-header-score" style={{ fontSize: 11, fontWeight: 900, color: hasScores ? "#fef08a" : "#ffffff" }}>
            {hasScores ? game.away_score : "-"}
          </span>
        </div>
        <span className="ats-group-game-header-at" style={{ fontSize: 10, color: "#cbd5e1" }}>@</span>
        <div className="ats-group-game-header-team" style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span className="ats-group-game-header-score" style={{ fontSize: 11, fontWeight: 900, color: hasScores ? "#fef08a" : "#ffffff" }}>
            {hasScores ? game.home_score : "-"}
          </span>
          <span className="ats-group-game-header-badge" style={getBadgeStyle(homePrimary, homeSecondary)}>
            {game.home_logo && <img className="ats-group-game-header-logo" src={game.home_logo} alt="" height={16} style={{ flexShrink: 0, objectFit: "contain" }} />}
          </span>
        </div>
      </div>

      <div className="ats-group-game-header-status" style={{ fontSize: 9, fontWeight: 700, margin: "3px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
        {isFinal ? (
          <span className="ats-group-game-header-status-label" style={{ backgroundColor: "#16a34a", color: "white", padding: "1px 6px", borderRadius: 3 }}>FINAL</span>
        ) : isLive ? (
          <>
            <LivePulseIndicator />
            <span className="ats-group-game-header-status-label" style={{ backgroundColor: liveColor, color: "white", padding: "1px 6px", borderRadius: 3 }}>
              {liveStatusText}
            </span>
          </>
        ) : (
          <span style={{ color: "#cbd5e1" }}>
            {game.game_date ? new Date(game.game_date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "TBD"}
          </span>
        )}
      </div>

      <div className="ats-group-game-header-spread" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 3, height: 18 }}>
        {isFinal && coveredLogo && coveredTeam !== "PUSH" ? (
          <>
            <span className="ats-group-game-header-spread-badge" style={getBadgeStyle(coveredPrimary, coveredSecondary)}>
              <img className="ats-group-game-header-spread-logo" src={coveredLogo} alt="" height={13} style={{ flexShrink: 0, objectFit: "contain" }} />
            </span>
            <span className="ats-group-game-header-spread-line" style={{ fontSize: 9, color: isFavCovered ? "#86efac" : "#fca5a5", fontWeight: 700 }}>
              {spreadLabel}
            </span>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {favLogo && (
              <span className="ats-group-game-header-spread-badge" style={getBadgeStyle(favPrimary, favSecondary)}>
                <img className="ats-group-game-header-spread-logo" src={favLogo} alt={favTeam} height={12} style={{ flexShrink: 0, objectFit: "contain" }} />
              </span>
            )}
            <span className="ats-group-game-header-spread-line" style={{ fontSize: 9, color: GOLD, fontWeight: 600 }}>
              {rawSpread !== null ? (rawSpread < 0 ? rawSpread : `-${rawSpread}`) : "Pick'em"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
