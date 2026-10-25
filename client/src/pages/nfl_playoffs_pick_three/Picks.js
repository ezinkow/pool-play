import React, { useState, useEffect } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import PoolEmoji from "../../components/PoolEmoji";

const NFL_BLUE = "#013369";
const GOLD = "#c89d3c";
const NFL_RED = "#D50A0A";

export default function NflPlayoffsPickThreePicks() {
  const { user, loading: authLoading } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(1);
  const [entries, setEntries] = useState([]);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [playersPool, setPlayersPool] = useState([]);
  const [userPicks, setUserPicks] = useState({ qb: null, rb: null, wr: null });
  const [usedPlayers, setUsedPlayers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("token");

  // Fetch entries & current week settings
  useEffect(() => {
    if (!token) return;

    Promise.all([
      axios.get("/api/nfl_playoffs_pickthree/settings", { headers: { Authorization: `Bearer ${token}` } }),
      axios.get("/api/nfl_playoffs_pickthree/entries/me", { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(([settingsRes, entriesRes]) => {
        if (settingsRes.data && settingsRes.data.current_week) {
          setCurrentWeek(Number(settingsRes.data.current_week));
        }
        const userEntryData = entriesRes.data.entries || (entriesRes.data.entry ? [entriesRes.data.entry] : []);
        setEntries(userEntryData);
        if (userEntryData.length > 0 && !selectedEntryId) {
          setSelectedEntryId(userEntryData[0].id || userEntryData[0].user_id);
        }
      })
      .catch(err => {
        console.error("Failed to load pick three settings/entries", err);
      });
  }, [token]);

  // Fetch available master players pool & user's current picks/used players when week or entry changes
  useEffect(() => {
    if (!token || currentWeek === null) return;

    setLoading(true);
    const entryParam = selectedEntryId ? `?week=${currentWeek}&entry_id=${selectedEntryId}` : `?week=${currentWeek}`;

    Promise.all([
      axios.get(`/api/nfl_playoffs/players?week=${currentWeek}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`/api/nfl_playoffs_pickthree/picks${entryParam}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`/api/nfl_playoffs_pickthree/used_players${selectedEntryId ? `?entry_id=${selectedEntryId}` : ''}`, { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(([playersRes, picksRes, usedRes]) => {
        setPlayersPool(playersRes.data.players || []);
        
        const currentPicks = picksRes.data.picks || { qb: null, rb: null, wr: null };
        setUserPicks({
          qb: currentPicks.qb || null,
          rb: currentPicks.rb || null,
          wr: currentPicks.wr || null
        });

        const usedSet = new Set(usedRes.data.used_players || []);
        setUsedPlayers(usedSet);
      })
      .catch(err => {
        console.error("Failed to load player data", err);
        toast.error("Failed to load available players.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, currentWeek, selectedEntryId]);

  const handlePlayerSelect = (position, player) => {
    setUserPicks(prev => ({
      ...prev,
      [position]: player
    }));
  };

  const handleSavePicks = async () => {
    if (!userPicks.qb || !userPicks.rb || !userPicks.wr) {
      toast.error("You must select one QB, one RB, and one WR!");
      return;
    }

    setSaving(true);
    try {
      await axios.post("/api/nfl_playoffs_pickthree/picks", {
        week: currentWeek,
        entry_id: selectedEntryId,
        qb_id: userPicks.qb.id,
        rb_id: userPicks.rb.id,
        wr_id: userPicks.wr.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Picks saved successfully!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save picks.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || currentWeek === null) {
    return <div style={{ textAlign: "center", padding: 50, color: "var(--text-primary)" }}>Loading Pick Three suite...</div>;
  }

  const qbOptions = playersPool.filter(p => p.position === "QB");
  const rbOptions = playersPool.filter(p => p.position === "RB");
  const wrOptions = playersPool.filter(p => p.position === "WR" || p.position === "TE");

  return (
    <PoolGatekeeper user={user} gameKey="nfl_playoffs_pick_three">
      <div className="nfl-pick-three-page" style={{ width: "100%", maxWidth: 900, margin: "0 auto", padding: "16px 8px 80px 8px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <Toaster />

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h2 style={{ color: NFL_BLUE, fontSize: "24px", margin: 0, fontWeight: 800 }}>
            <PoolEmoji gameKey="nfl_playoffs_pick_three" /> Playoffs Pick Three <PoolEmoji gameKey="nfl_playoffs_pick_three" />
          </h2>
          <p style={{ color: "var(--text-secondary, #64748b)", marginTop: 4, fontSize: "13px" }}>
            Select 1 QB, 1 RB, and 1 WR/TE each week. Players can only be used <strong>once</strong> all postseason!
          </p>
        </div>

        {/* Multi-Entry & Week Selectors Bar */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 16, marginBottom: 20, background: "var(--bg-secondary, white)", padding: "16px", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid var(--border-color, #e2e8f0)" }}>
          
          {entries.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Active Entry:</label>
              <select
                value={selectedEntryId || ""}
                onChange={(e) => setSelectedEntryId(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--border-color, #cbd5e1)",
                  backgroundColor: "var(--bg-primary, white)",
                  color: "var(--text-primary)",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                {entries.map(entry => (
                  <option key={entry.id || entry.user_id} value={entry.id || entry.user_id}>
                    {entry.entry_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Playoff Round:</label>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4].map(w => (
                <button
                  key={w}
                  onClick={() => setCurrentWeek(w)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: `1px solid ${currentWeek === w ? NFL_BLUE : "var(--border-color, #cbd5e1)"}`,
                    backgroundColor: currentWeek === w ? NFL_BLUE : "var(--bg-primary, white)",
                    color: currentWeek === w ? "white" : "var(--text-primary)",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "12px"
                  }}
                >
                  {w === 1 ? "Wild Card" : w === 2 ? "Divisional" : w === 3 ? "Conf Champ" : "Super Bowl"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Loading player options for Round {currentWeek}...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Position Pick Cards */}
            {[
              { pos: "QB", label: "Quarterback (QB)", options: qbOptions, current: userPicks.qb },
              { pos: "RB", label: "Running Back (RB)", options: rbOptions, current: userPicks.rb },
              { pos: "WR", label: "Wide Receiver / Tight End (WR/TE)", options: wrOptions, current: userPicks.wr }
            ].map(({ pos, label, options, current }) => (
              <div key={pos} style={{ background: "var(--bg-secondary, white)", borderRadius: 12, padding: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid var(--border-color, #e2e8f0)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: "16px", color: NFL_BLUE, fontWeight: 800 }}>{label}</h3>
                  {current && (
                    <span style={{ fontSize: "12px", background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                      Selected: {current.name} ({current.team})
                    </span>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, maxHeight: 220, overflowY: "auto", paddingRight: 4 }}>
                  {options.length === 0 ? (
                    <div style={{ color: "var(--text-secondary)", fontSize: "13px", gridColumn: "1 / -1", textAlign: "center", padding: 20 }}>No active players available for this round.</div>
                  ) : (
                    options.map(player => {
                      const isUsed = usedPlayers.has(player.id) && current?.id !== player.id;
                      const isSelected = current?.id === player.id;

                      return (
                        <div
                          key={player.id}
                          onClick={() => !isUsed && handlePlayerSelect(pos.toLowerCase(), player)}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: `2px solid ${isSelected ? GOLD : "var(--border-color, #e2e8f0)"}`,
                            backgroundColor: isSelected ? "var(--bg-active, #eff6ff)" : isUsed ? "var(--bg-disabled, #f1f5f9)" : "var(--bg-primary, white)",
                            opacity: isUsed ? 0.5 : 1,
                            cursor: isUsed ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            transition: "all 0.15s ease"
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>{player.name}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary, #64748b)" }}>{player.team} vs {player.opponent || "—"}</div>
                          </div>
                          {isUsed && (
                            <span style={{ fontSize: "10px", fontWeight: 800, color: NFL_RED, background: "#fee2e2", padding: "1px 4px", borderRadius: 3 }}>USED</span>
                          )}
                          {isSelected && (
                            <span style={{ fontSize: "12px", fontWeight: 800, color: GOLD }}>★</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}

            {/* Save Button Bar */}
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <button
                onClick={handleSavePicks}
                disabled={saving}
                style={{
                  backgroundColor: NFL_BLUE,
                  color: "white",
                  padding: "14px 36px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: "15px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(1, 51, 105, 0.3)",
                  transition: "background-color 0.2s"
                }}
              >
                {saving ? "Saving Picks..." : "Save Round Picks"}
              </button>
            </div>
          </div>
        )}
      </div>
    </PoolGatekeeper>
  );
}