import React, { useEffect, useState } from "react";
import axios from "axios";

/* COMPONENT */
export default function Standings() {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStandings() {
      try {
        const res = await axios.get("/api/olympics/standings");
        setStandings(res.data || []);
      } catch (err) {
        console.error("Failed to load standings:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStandings();
  }, []);
  console.log(standings)

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;

  const renderCountries = (countryList) => {
    if (!countryList) return null;
    const countries = countryList.split("<br>");
    const mid = Math.ceil(countries.length / 2);
    const col1 = countries.slice(0, mid);
    const col2 = countries.slice(mid);

    return (
      <div
        style={{
          display: "flex",
          gap: "16px",
          maxHeight: "150px",
          overflowY: "auto",
        }}
      >
        <div style={{ flex: 1 }}>
          {col1.map((c, idx) => (
            <div key={idx}>{c}</div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          {col2.map((c, idx) => (
            <div key={idx}>{c}</div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "16px" }}>
      <h2 style={{ marginBottom: "16px" }}>🏅Standings⛷</h2>

      <div style={{ overflowX: "auto", maxHeight: "600px", overflowY: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "600px",
          }}
        >
          <thead style={{ position: "sticky", top: 0, background: "#f3f4f6", zIndex: 2 }}>
            <tr>
              <th style={thStyle}>Rank</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Countries</th>
              <th style={thStyle}>Total Score</th>
            </tr>
          </thead>

          <tbody>
            {standings.length === 0 && (
              <tr>
                <td colSpan={4} style={tdStyle}>
                  No standings yet.
                </td>
              </tr>
            )}

            {standings.map((row, idx) => (
              <tr
                key={row.name}
                style={{
                  background: idx % 2 === 0 ? "#fff" : "#f9fafb",
                }}
              >
                <td style={tdStyle}>
                  {idx === 0 && "🥇 "}
                  {idx === 1 && "🥈 "}
                  {idx === 2 && "🥉 "}
                  {idx + 1}
                </td>

                <td style={{ ...tdStyle, fontWeight: 600 }}>{row.name}</td>

                <td style={tdStyle}>{renderCountries(row.country_list)}</td>

                <td style={{ ...tdStyle, fontWeight: 700, color: "#2563eb" }}>
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* STYLES */
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
