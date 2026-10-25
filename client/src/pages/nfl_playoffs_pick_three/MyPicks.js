import React, { useState, useEffect } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import PoolEmoji from "../../components/PoolEmoji";

const NFL_BLUE = "#013369";
const GOLD = "#c89d3c";
const NFL_RED = "#D50A0A";

export default function NflPlayoffsPickThreeMyPicks() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState([]);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [allRoundsPicks, setAllRoundsPicks] = useState({});
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  // Fetch entries
  useEffect(() => {
    if (!token) return;

    axios.get("/api/nfl_playoffs_pickthree/entries/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const userEntries = res.data.entries || (res.data.entry ? [res.data.entry] : []);
        setEntries(userEntries);
        if (userEntries.length > 0) {
          setSelectedEntryId(userEntries[0].id);
        }
      })
      .catch(err => {
        console.error("Failed to load user entries", err);
        setLoading(false);
      });
  }, [token]);

  // Fetch all rounds of picks for the selected entry
  useEffect(() => {
    if (!token || !selectedEntryId) return;

    setLoading(true);
    axios.get(`/api/nfl_playoffs_pickthree/mypicks?entry_id=${selectedEntryId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setAllRoundsPicks(res.data.rounds || {});
      })
      .catch(err => {
        console.error("Failed to load historical picks", err);
        toast.error("Failed to load your submitted picks.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, selectedEntryId]);

  if (authLoading) {
    return <div style={{ textAlign: "center", padding: 50, color: "var(--text-primary)" }}>Loading My Picks...</div>;
  }

  const roundsConfig = [
    { round: 1, label: "Wild Card Round" },
    { round: 2, label: "Divisional Round" },
    { round: 3, label: "Conference Championships" },
    { round: 4, label: "Super Bowl" }
  ];

  return (
    <PoolGatekeeper user={user} gameKey="nfl_playoffs_pick_three">
      <div className="nfl-pick-three-my-picks-page" style={{ width: "100%", maxWidth: 900, margin: "0 auto", padding: "16px 8px 80px 8px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <Toaster />

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h2 style={{ color: NFL_BLUE, fontSize: "24px", margin: 0, fontWeight: 800 }}>
            <PoolEmoji gameKey="nfl_playoffs_pick_three" /> My Submitted Picks <PoolEmoji gameKey="nfl_playoffs_pick_three" />
          </h2>
          <p style={{ color: "var(--text-secondary, #64748b)", marginTop: 4, fontSize: "13px" }}>
            Review your roster selections and DFS fantasy scoring performance across all playoff rounds.
          </p>
        </div>

        {/* Entry Selector */}
        {entries.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20, background: "var(--bg-secondary, white)", padding: "14px", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid var(--border-color, #e2e8f0)" }}>
            <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Active Entry:</label>
            <select 
              value={selectedEntryId || ""} 
              onChange={e => setSelectedEntryId(Number(e.target.value))}
              style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-primary, white)", color: "var(--text-primary)", fontWeight: 600 }}
            >
              {entries.map(ent => (
                <option key={ent.id} value={ent.id}>{ent.entry_name}</option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Loading your history...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {roundsConfig.map(({ round, label }) => {
              const roundData = allRoundsPicks[round] || { qb: null, rb: null, wr: null, total_points: 0 };
              const picksList = [
                { pos: "QB", player: roundData.qb },
                { pos: "RB", player: roundData.rb },
                { pos: "WR/TE", player: roundData.wr }
              ];

              return (
                <div key={round} style={{ background: "var(--bg-secondary, white)", borderRadius: 12, padding: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid var(--border-color, #e2e8f0)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color, #f1f5f9)", paddingBottom: 10, marginBottom: 14 }}>
                    <h3 style={{ margin: 0, fontSize: "15px", color: NFL_BLUE, fontWeight: 800, textTransform: "uppercase" }}>{label}</h3>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: GOLD, background: "var(--bg-primary, #f8fafc)", padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border-color, #e2e8f0)" }}>
                      Round Points: {roundData.total_points ?? 0} pts
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                    {picksList.map(({ pos, player }) => (
                      <div key={pos} style={{ padding: "12px", borderRadius: 8, background: "var(--bg-primary, #f8fafc)", border: "1px solid var(--border-color, #e2e8f0)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-secondary, #94a3b8)", textTransform: "uppercase", marginBottom: 2 }}>{pos}</div>
                          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{player?.name || "No Selection"}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-secondary, #64748b)" }}>{player ? `${player.team} vs ${player.opponent || "—"}` : "Unpicked"}</div>
                        </div>
                        {player && (
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "13px", fontWeight: 800, color: NFL_BLUE }}>{player.points ?? 0} pts</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PoolGatekeeper>
  );
}