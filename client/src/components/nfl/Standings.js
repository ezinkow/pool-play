import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/** SCORE COLUMNS */
const ROUND_SCORE_COLUMN = {
  1: "wild_card_score",
  2: "divisional_score",
  3: "conf_championship_score",
  4: "super_bowl_score",
};

const ROUND_LABELS = {
  1: "Wild Card",
  2: "Divisional",
  3: "Conference",
  4: "Super Bowl",
};

/** HELPERS */
function buildStandings(rows) {
  const map = {};

  rows.forEach((row) => {
    if (!map[row.name]) {
      map[row.name] = {
        name: row.name,
        rounds: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
        },
        total: 0,
      };
    }

    const score =
      Number(row[ROUND_SCORE_COLUMN[row.round]]) || 0;

    map[row.name].rounds[row.round] += score;
    map[row.name].total += score;
  });

  return Object.values(map).sort(
    (a, b) => b.total - a.total
  );
}

/** COMPONENT */
export default function Standings() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    axios.get("/api/nfl/startingrosters").then((res) => {
      setRows(res.data);
    });
  }, []);

  const standings = useMemo(
    () => buildStandings(rows),
    [rows]
  );

  return (
    <div style={{ padding: "16px" }}>
      <h2 style={{ marginBottom: "16px" }}>
        📊 Playoff Standings
      </h2>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "600px",
          }}
        >
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={thStyle}>Rank</th>
              <th style={thStyle}>Name</th>
              {Object.entries(ROUND_LABELS).map(
                ([round, label]) => (
                  <th key={round} style={thStyle}>
                    {label}
                  </th>
                )
              )}
              <th style={thStyle}>Total</th>
            </tr>
          </thead>

          <tbody>
            {standings.map((row, idx) => (
              <tr
                key={row.name}
                style={{
                  background:
                    idx % 2 === 0 ? "#fff" : "#f9fafb",
                }}
              >
                <td style={tdStyle}>
                  {idx === 0 && "🥇 "}
                  {idx === 1 && "🥈 "}
                  {idx === 2 && "🥉 "}
                  {idx + 1}
                </td>

                <td
                  style={{
                    ...tdStyle,
                    fontWeight: 600,
                  }}
                >
                  {row.name}
                </td>

                {Object.keys(ROUND_LABELS).map(
                  (round) => (
                    <td
                      key={round}
                      style={tdStyle}
                    >
                      {row.rounds[round].toFixed(2)}
                    </td>
                  )
                )}

                <td
                  style={{
                    ...tdStyle,
                    fontWeight: 700,
                    color: "#2563eb",
                  }}
                >
                  {row.total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** STYLES */
const thStyle = {
  padding: "10px",
  textAlign: "left",
  borderBottom: "2px solid #e5e7eb",
  fontSize: "14px",
};

const tdStyle = {
  padding: "10px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "14px",
};
