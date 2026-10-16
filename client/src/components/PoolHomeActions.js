import React from "react";
import { Link } from "react-router-dom";
import usePoolMetadata from "../hooks/usePoolMetadata";

const ACTIONS_BY_GAME = {
  cfb_pickem_ats: {
    picks: "/cfbpickemats/picks",
    myPicks: "/cfbpickemats/mypicks",
    group: "/cfbpickemats/grouppicks",
    standings: "/cfbpickemats/standings"
  },
  cfb_bowl_pickem: {
    picks: "/bowlpickem/picks",
    myPicks: "/bowlpickem/mypicks",
    group: "/bowlpickem/grouppicks",
    standings: "/bowlpickem/standings"
  },
  ncaab_champ_week_pickem: {
    picks: "/champweekpickem/picks",
    myPicks: "/champweekpickem/mypicks",
    group: "/champweekpickem/scoreboard",
    standings: "/champweekpickem/standings"
  },
  ncaab_pickem_ats: {
    picks: "/ncaabpickemats/picks",
    myPicks: "/ncaabpickemats/mypicks",
    group: "/ncaabpickemats/grouppicks",
    standings: "/ncaabpickemats/standings"
  },
  ncaab_tourney_pickem: {
    picks: "/tourneypickem/picks",
    myPicks: "/tourneypickem/mypicks",
    group: "/tourneypickem/scoreboard",
    standings: "/tourneypickem/standings"
  },
  mlb_hrd: {
    picks: "/hrd/picks",
    myPicks: "/hrd/picks",
    group: "/hrd/allteams",
    standings: "/hrd/standings"
  },
  nfl_bts: {
    picks: "/nflbts/picks",
    myPicks: "/nflbts/mypicks",
    group: "/nflbts/grouppicks",
    standings: "/nflbts/standings"
  },
  nfl_pickem_ats: {
    picks: "/nflpickemats/picks",
    myPicks: "/nflpickemats/mypicks",
    group: "/nflpickemats/grouppicks",
    standings: "/nflpickemats/standings"
  },
  mlb_playoffs: {
    picks: "/mlbplayoffs/picks",
    myPicks: "/mlbplayoffs/mypicks",
    group: "/mlbplayoffs/grouppicks",
    standings: "/mlbplayoffs/standings"
  },
  nba_playoffs: {
    picks: "/nbaplayoffs/picks",
    myPicks: "/nbaplayoffs/mypicks",
    group: "/nbaplayoffs/grouppicks",
    standings: "/nbaplayoffs/standings"
  },
  nfl_playoffs: {
    picks: "/nfl/rosterpicks",
    myPicks: "/nfl/myroster",
    group: "/nfl/scoreboard",
    standings: "/nfl/standings"
  },
  world_cup: {
    picks: "/worldcup/picks",
    myPicks: "/worldcup/mypicks",
    group: "/worldcup/grouppicks",
    standings: "/worldcup/standings"
  },
  olympics: {
    picks: "/olympics/countrypicks",
    myPicks: "/olympics/myroster",
    group: "/olympics/medaltable",
    standings: "/olympics/standings"
  },
  ncaab_tourney_bracket: {
    picks: "/bracket/bracket",
    myPicks: "/bracket/mybracket",
    standings: "/bracket/standings"
  },
  nba_survivor: {
    picks: "/nbasurvivor/picks",
    myPicks: "/nbasurvivor/mypicks",
    group: "/nbasurvivor/grouppicks"
  },
  nfl_survivor: {
    picks: "/nflsurvivor/picks",
    myPicks: "/nflsurvivor/mypicks",
    group: "/nflsurvivor/grouppicks"
  },
  nfl_survivor_secondchance: {
    picks: "/nflsurvivor_secondchance/picks",
    myPicks: "/nflsurvivor_secondchance/mypicks",
    group: "/nflsurvivor_secondchance/grouppicks"
  }
};

const ACTION_DETAILS = [
  { key: "picks", feature: "has_picks", label: "Make Picks", icon: "🎯" },
  { key: "myPicks", feature: "has_my_picks", label: "My Picks", icon: "📋" },
  { key: "group", feature: "has_group_picks", label: "Group Matrix", icon: "📊" },
  { key: "standings", feature: "has_standings", label: "Standings", icon: "🏆" }
];

export default function PoolHomeActions({ gameKey }) {
  const metadata = usePoolMetadata(gameKey);
  const actions = ACTIONS_BY_GAME[gameKey];
  if (!actions) return null;

  const features = metadata?.features || {};

  return (
    <nav className="pool-home-actions" aria-label="Pool navigation">
      {ACTION_DETAILS.map(({ key, feature, label, icon }) => {
        const path = actions[key];
        if (!path || features[feature] === false) return null;

        return (
          <Link
            key={key}
            to={path}
            className="pool-home-action"
            aria-label={label}
          >
            <span aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
