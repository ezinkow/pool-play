import React from "react";

const NBA_BLUE = "#013369";
const DAYS = [
  { key: "Fri", label: "Friday" },
  { key: "Sat", label: "Saturday" },
  { key: "Sun", label: "Sunday" }
];

function isGameStarted(gameDate) {
  return Boolean(gameDate) && new Date() >= new Date(gameDate);
}

function getSpread(game, teamName) {
  if (game.spread === null || game.spread === undefined || game.spread === 0) return "no line yet";
  const value = Math.abs(game.spread);
  return game.favorite === teamName ? `-${value}` : `+${value}`;
}

function buildSchedule(games, teamColors) {
  const teamNames = new Set(Object.keys(teamColors));
  games.forEach(({ home_team: homeTeam, away_team: awayTeam }) => {
    if (homeTeam) teamNames.add(homeTeam);
    if (awayTeam) teamNames.add(awayTeam);
  });

  const schedule = Object.fromEntries(
    Array.from(teamNames, (team) => [team, { Fri: null, Sat: null, Sun: null }])
  );

  games.forEach((game) => {
    if (!game.game_date) return;

    const date = new Date(game.game_date);
    const day = DAYS.find(({ key }) => {
      const dayOfWeek = date.getDay();
      return (key === "Fri" && dayOfWeek === 5)
        || (key === "Sat" && dayOfWeek === 6)
        || (key === "Sun" && dayOfWeek === 0);
    })?.key;
    if (!day) return;

    const addMatchup = (team, opponent, isHome, opponentLogo) => {
      const opponentMeta = teamColors[opponent] || {};
      schedule[team][day] = {
        gameId: game.id,
        opponent,
        opponentRecord: opponentMeta.record || "",
        opponentLogo: opponentLogo || opponentMeta.logo,
        isHome,
        spread: getSpread(game, team),
        locked: isGameStarted(game.game_date)
      };
    };

    if (schedule[game.home_team]) {
      addMatchup(game.home_team, game.away_team, true, game.away_logo);
    }
    if (schedule[game.away_team]) {
      addMatchup(game.away_team, game.home_team, false, game.home_logo);
    }
  });

  return Array.from(teamNames).sort().map((team) => ({ team, days: schedule[team] }));
}

function TeamIdentity({ team, meta, picked, used }) {
  const primary = meta.primaryColor || NBA_BLUE;
  const secondary = meta.secondaryColor || "#cbd5e1";

  return (
    <div
      className={`nba-survivor-team${picked ? " is-picked" : ""}${used ? " is-used" : ""}`}
      style={{ "--team-primary": primary, "--team-secondary": secondary }}
    >
      {meta.logo && <img src={meta.logo} alt="" />}
      <span className="nba-survivor-team-name">{team}</span>
      {meta.record && <span className="nba-survivor-team-record">({meta.record})</span>}
      {used && <span className="nba-survivor-used">USED</span>}
      {picked && <span className="nba-survivor-check" aria-hidden="true">✓</span>}
    </div>
  );
}

function MatchupCell({ matchup, teamColors, isPicked, primary }) {
  if (!matchup) return <td className="nba-survivor-empty-cell">—</td>;

  const opponentMeta = teamColors[matchup.opponent] || {};
  const opponentPrimary = opponentMeta.primaryColor || primary;

  return (
    <td>
      <div
        className={`nba-survivor-matchup${isPicked ? " is-picked" : ""}`}
        style={{ "--team-primary": primary }}
      >
        {matchup.opponentLogo && (
          <img
            className="nba-survivor-opponent-logo"
            src={matchup.opponentLogo}
            alt=""
            style={{
              "--team-primary": opponentPrimary,
              "--team-secondary": opponentMeta.secondaryColor || "#cbd5e1"
            }}
          />
        )}
        <span className="nba-survivor-matchup-copy">
          <strong>
            {matchup.isHome ? "vs" : "at"} {matchup.opponent}
            {matchup.opponentRecord && <span> ({matchup.opponentRecord})</span>}
          </strong>
          <small>{matchup.spread} {matchup.locked && "🔒"}</small>
        </span>
        {isPicked && <span className="nba-survivor-matchup-check" aria-hidden="true">✓</span>}
      </div>
    </td>
  );
}

export default function NbaSurvivorScheduleTable({
  games,
  teamColors,
  currentWeekPick,
  usedTeams,
  onSelectTeam
}) {
  const rows = buildSchedule(games, teamColors);

  return (
    <div className="nba-survivor-table-scroll">
      <table className="nba-survivor-table">
        <thead>
          <tr>
            <th scope="col">Team</th>
            {DAYS.map(({ key, label }) => <th key={key} scope="col">{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ team, days }) => {
            const hasGames = DAYS.some(({ key }) => days[key]);
            if (!hasGames) return null;

            const meta = teamColors[team] || {};
            const picked = currentWeekPick === team;
            const used = usedTeams.includes(team) && !picked;
            const locked = DAYS.some(({ key }) => days[key]?.locked);
            const canSelect = !locked && (!used || picked);

            return (
              <tr
                key={team}
                className={`${picked ? "is-picked" : ""}${canSelect ? " is-selectable" : ""}`}
                aria-disabled={!canSelect}
                tabIndex={canSelect ? 0 : undefined}
                onClick={() => canSelect && onSelectTeam(team, days, used, picked)}
                onKeyDown={(event) => {
                  if (canSelect && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onSelectTeam(team, days, used, picked);
                  }
                }}
              >
                <td>
                  <TeamIdentity team={team} meta={meta} picked={picked} used={used} />
                </td>
                {DAYS.map(({ key }) => (
                  <MatchupCell
                    key={key}
                    matchup={days[key]}
                    teamColors={teamColors}
                    isPicked={picked}
                    primary={meta.primaryColor || NBA_BLUE}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
