import React, { useEffect, useState } from "react";
import axios from "axios";
import CorrectMissedStandingsTable from "../picks/CorrectMissedStandingsTable";

export default function Standings() {
  const [standings, setStandings] = useState([]);

  useEffect(() => {
    axios.get("/api/ncaab_tourney_pickem/standings")
      .then((res) => setStandings(res.data || []))
      .catch((err) => console.error("Failed to load tournament pick'em standings", err));
  }, []);

  return <CorrectMissedStandingsTable standings={standings} />;
}
