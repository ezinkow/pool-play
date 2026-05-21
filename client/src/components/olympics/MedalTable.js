import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

export default function CountryPoolsTable() {
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    axios.get("/api/olympics/medaltable").then((res) => {
      setCountries(res.data || []);
    });
  }, []);

  // Olympic-standard sorting:
  // Gold → Silver → Bronze → Total
  const sortedCountries = useMemo(() => {
    return [...countries].sort(
      (a, b) =>
        b.score - a.score ||
        b.gold - a.gold ||
        b.silver - a.silver ||
        b.bronze - a.bronze ||
        b.total - a.total
    );
  }, [countries]);

  return (
    <div style={{ padding: "16px" }}>
      <h2 style={{ marginBottom: "16px" }}>🏅Medal Table</h2>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "700px",
          }}
        >
          <thead>
            <tr style={{ background: "#0f766e", color: "#fff" }}>
              <th style={thStyle}>Rank</th>
              <th style={thStyle}>Country</th>
              <th style={thStyle}>🥇 Gold</th>
              <th style={thStyle}>🥈 Silver</th>
              <th style={thStyle}>🥉 Bronze</th>
              <th style={thStyle}>🏅 Total</th>
              <th style={thStyle}>🏆 Score</th>
            </tr>
          </thead>

          <tbody>
            {sortedCountries.map((c, idx) => (
              <tr
                key={c.code || idx}
                style={{
                  background: idx % 2 === 0 ? "#f9fafb" : "#ffffff",
                }}
              >
                <td style={tdStyle}>
                  {idx === 0 && "🥇 "}
                  {idx === 1 && "🥈 "}
                  {idx === 2 && "🥉 "}
                  {idx + 1}
                </td>

                <td style={{ ...tdStyle, fontWeight: 600 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {c.flag && (
                      <img
                        src={c.flag}
                        alt={c.country_name}
                        style={{ width: "24px", height: "16px", objectFit: "cover" }}
                      />
                    )}
                    {c.country_name}
                  </div>
                </td>

                <td style={tdStyle}>{c.gold}</td>
                <td style={tdStyle}>{c.silver}</td>
                <td style={tdStyle}>{c.bronze}</td>

                <td style={{ ...tdStyle, fontWeight: 700 }}>
                  {c.total}
                </td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>
                  {c.score}
                </td>
              </tr>
            ))}

            {sortedCountries.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "16px", textAlign: "center" }}>
                  No medal data available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------- STYLES -------------------- */
const thStyle = {
  padding: "8px",
  textAlign: "left",
  borderBottom: "2px solid #e5e7eb",
};

const tdStyle = {
  padding: "8px",
  borderBottom: "1px solid #e5e7eb",
};
