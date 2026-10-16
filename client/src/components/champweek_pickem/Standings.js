import React, { useEffect, useState } from "react";
import axios from "axios";
import CorrectMissedStandingsTable from "../picks/CorrectMissedStandingsTable";

export default function Standings() {
  const [standings, setStandings] = useState([]);

  useEffect(() => {
    axios.get("/api/standings")
      .then((res) => setStandings(res.data || []))
      .catch((err) => console.error("Failed to load Championship Week standings", err));
  }, []);

  return <CorrectMissedStandingsTable standings={standings} />;
}
