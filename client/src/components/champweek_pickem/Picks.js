import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import Instructions from "./Instructions";

const isLocked = iso => iso && new Date() >= new Date(iso);

const PickButtons = ({ game, picks, updatePick }) => (
  <div style={{ display: "flex", gap: 6 }}>
    {[
      { value: game.underdog, logo: game.dog_logo, spread: game.line ? `+${game.line}` : "" },
      { value: game.favorite, logo: game.fav_logo, spread: game.line ? `-${game.line}` : "" },
    ].map(({ value, logo, spread }) => {
      const selected = picks.find(p => p.game === game.id)?.pick === value;
      const disabled = !game.selectable || value === "TBD";
      return (
        <button
          key={value}
          type="button"
          onClick={() => !disabled && updatePick(game, value)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "5px 6px", borderRadius: 6, flex: 1, minWidth: 0,
            border: selected ? "2px solid #13447a" : "1px solid #d1d5db",
            backgroundColor: disabled ? "#f3f4f6" : selected ? "#eff6ff" : "white",
            cursor: disabled ? "not-allowed" : "pointer",
            fontWeight: selected ? 700 : 400,
            color: disabled ? "#9ca3af" : selected ? "#13447a" : "#374151",
            opacity: disabled ? 0.6 : 1,
            overflow: "hidden",
          }}
        >
          {logo && <img src={logo} width={16} height={16} alt="" style={{ objectFit: "contain", flexShrink: 0 }} />}
          <span style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
            {value === "TBD" ? "TBD" : value}
          </span>
          {!disabled && spread && (
            <span style={{ fontSize: 10, color: "#6b7280", flexShrink: 0, marginLeft: "auto", paddingLeft: 2 }}>
              {spread}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default function Picks() {
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState("SELECT YOUR NAME");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [games, setGames] = useState([]);
  const [picks, setPicks] = useState([]);
  const [rememberMe, setRememberMe] = useState(false);
  //tiebreaker
  const [tiebreakerWin, setTiebreakerWin] = useState("");
  const [tiebreakerLoss, setTiebreakerLoss] = useState("");
  const [tiebreakerSaved, setTiebreakerSaved] = useState(false);

  useEffect(() => {
    axios.get("/api/games").then(res => setGames(res.data));
    axios.get("/api/users").then(res =>
      setUsers(res.data.sort((a, b) => a.name.localeCompare(b.name)))
    );
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("rememberedUser");
    if (saved) {
      const { name } = JSON.parse(saved);
      setUser(name);
      axios.post("/api/users/verify-token", JSON.parse(saved))
        .then(res => {
          if (res.data.success) {
            setAuthenticated(true);
            setUser(name);
            axios.get("/api/picks", { params: { name } }).then(picksRes => {
              const existingPicks = picksRes.data
                .filter(p => {
                  const game = games.find(g => g.id === p.game_id);
                  return game && !isLocked(game.game_date);
                })
                .map(p => ({
                  game: p.game_id,
                  pick: p.pick,
                  game_date: p.game_date,
                  line: games.find(g => g.id === p.game_id)?.line || null,
                }));
              setPicks(existingPicks);
            });
          } else {
            localStorage.removeItem("rememberedUser");
          }
        })
        .catch(() => localStorage.removeItem("rememberedUser"));
    }
  }, [games]);

  const verify = async () => {
    try {
      const res = await axios.post("/api/users/verify", { name: user, password });
      if (!res.data.success) return toast.error("Wrong password");
      setAuthenticated(true);
      toast.success("Identity verified!");
      if (rememberMe) {
        localStorage.setItem("rememberedUser", JSON.stringify({
          name: user,
          token: res.data.token
        }));
      }
      const picksRes = await axios.get("/api/picks", { params: { name: user } });
      const existingPicks = picksRes.data
        .filter(p => {
          const game = games.find(g => g.id === p.game_id);
          return game && !isLocked(game.game_date);
        })
        .map(p => ({
          game: p.game_id,
          pick: p.pick,
          game_date: p.game_date,
          line: games.find(g => g.id === p.game_id)?.line || null,
        }));
      setPicks(existingPicks);
      axios.get("/api/tiebreaker", { params: { name: user } }).then(res => {
        if (res.data) {
          setTiebreakerWin(res.data.win_score ?? "");
          setTiebreakerLoss(res.data.loss_score ?? "");
        }
      });
    } catch {
      toast.error("Verify failed");
    }
  };

  const logout = async () => {
    const saved = localStorage.getItem("rememberedUser");
    if (saved) {
      const { token } = JSON.parse(saved);
      await axios.post("/api/users/logout", { token });
      localStorage.removeItem("rememberedUser");
    }
    setAuthenticated(false);
    setUser("SELECT YOUR NAME");
    setPicks([]);
  };

  const visibleGames = useMemo(
    () => games
      .filter(g => !isLocked(g.game_date))
      .sort((a, b) => new Date(a.game_date) - new Date(b.game_date)),
    [games]
  );

  function formatTimeET(date) {
    if (!date) return "TBD";
    return new Date(date).toLocaleTimeString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const updatePick = (game, pick) => {
    setPicks(prev => {
      const existing = prev.find(p => p.game === game.id);
      if (existing) {
        if (existing.pick === pick) return prev.filter(p => p.game !== game.id);
        return prev.map(p => p.game === game.id ? { ...p, pick } : p);
      }
      return [...prev, { game: game.id, pick, line: game.line, game_date: game.game_date }];
    });
  };

  const handleSaveTiebreaker = async () => {
    if (!tiebreakerWin || !tiebreakerLoss) return toast.error("Enter both scores");
    try {
      await axios.post("/api/tiebreaker", {
        name: user,
        win_score: parseInt(tiebreakerWin),
        loss_score: parseInt(tiebreakerLoss),
      });
      setTiebreakerSaved(true);
      toast.success("Tiebreaker saved!");
      setTimeout(() => setTiebreakerSaved(false), 3000);
    } catch {
      toast.error("Save failed");
    }
  };

  const handleSubmit = async () => {
    if (picks.length === 0) return toast.error("No picks selected");
    try {
      const payload = {
        name: user,
        picks: picks.map(p => ({ game_id: p.game, pick: p.pick, game_date: p.game_date }))
      };
      await axios.post("/api/picks/bulk", payload);
      toast.success(`Thanks ${user}, ${picks.length} picks submitted!`);
      setPicks([]);
      sessionStorage.setItem("authedUser", user);
      setTimeout(() => { window.location.hash = "#/mypicks"; }, 1500);
    } catch (err) {
      console.error(err);
      toast.error("Submission failed");
    }
  };

  const controlBar = (
    <div style={{ marginBottom: 15, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button
        onClick={handleSubmit}
        style={{ padding: "8px 18px", borderRadius: 6, backgroundColor: "#16a34a", color: "white", border: "none", fontWeight: 600, cursor: "pointer" }}
      >
        Submit Picks
      </button>
      <button
        type="button"
        onClick={() => setPicks([])}
        style={{ padding: "6px 14px", borderRadius: 6, backgroundColor: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
      >
        Clear All
      </button>
      <span style={{ fontSize: 13, color: "#6b7280" }}>
        {picks.length} / {visibleGames.filter(g => g.selectable).length} available games picked
      </span>
    </div>
  );

  return (
    <div style={{ paddingTop: 68, paddingBottom: 80, maxWidth: 1200, margin: "0 auto" }}>
      <Toaster />
      <div style={{ padding: "0 12px" }}>
        <Instructions />
        <h2 style={{ color: "var(--primary-navy)", marginBottom: 12 }}>🏀 Make Your Picks 🗑️</h2>

        {!authenticated && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            <select
              value={user}
              onChange={e => setUser(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14 }}
            >
              <option value="SELECT YOUR NAME" disabled>SELECT YOUR NAME</option>
              {users.map(n => (
                <option key={n.name} value={n.name}>{n.name}</option>
              ))}
            </select>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              onKeyDown={e => e.key === "Enter" && verify()}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14, minWidth: 140 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <button
              onClick={verify}
              style={{ padding: "8px 16px", borderRadius: 6, backgroundColor: "#13447a", color: "white", border: "none", fontWeight: 600, cursor: "pointer" }}
            >
              Verify Identity
            </button>
            <button
              type="button"
              onClick={() => { window.location.hash = "#/change-password"; }}
              style={{ padding: "8px 16px", borderRadius: 6, backgroundColor: "transparent", color: "#6b7280", border: "1px solid #d1d5db", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
            >
              Forgot Password?
            </button>
          </div>
        )}

        {authenticated && (
          <>
            <h4 style={{ marginBottom: 10 }}>
              User: {user}
              <button
                onClick={logout}
                style={{ marginLeft: 12, fontSize: 12, padding: "3px 10px", borderRadius: 6, border: "1px solid #d1d5db", cursor: "pointer", color: "#6b7280", backgroundColor: "transparent" }}
              >
                Log out
              </button>
            </h4>
            {controlBar}
          </>
        )}
      </div>

      {authenticated && (
        <>
          {/* DESKTOP TABLE */}
          <div className="mypicks-desktop">
            <table style={{ borderCollapse: "collapse", width: "100%", background: "white", fontSize: 13, marginTop: 8, tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "12%" }} />
                <col style={{ width: "40%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "30%" }} />
              </colgroup>
              <thead>
                <tr>
                  {["Game Start", "Game", "Line Locks", "Line", "Pick"].map(h => (
                    <th key={h} style={{
                      position: "sticky", top: 65, zIndex: 4,
                      padding: "8px 8px", backgroundColor: "#13447a", color: "white",
                      borderBottom: "2px solid #c89d3c", textAlign: "left",
                      whiteSpace: "nowrap", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.3px",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleGames.map((game, idx) => (
                  <tr key={game.id} style={{ backgroundColor: idx % 2 === 0 ? "white" : "#f9fafb" }}>
                    <td style={{ padding: "8px 8px", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {game.game_clock}
                    </td>
                    <td style={{ padding: "8px 8px", borderBottom: "1px solid #e5e7eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <img src={game.away_logo} width={18} alt="" style={{ verticalAlign: "middle" }} />
                      {" "}{game.away_team}{" vs "}
                      <img src={game.home_logo} width={18} alt="" style={{ verticalAlign: "middle" }} />
                      {" "}{game.home_team}
                    </td>
                    <td style={{ padding: "8px 8px", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap", fontSize: 12 }}>
                      {formatTimeET(game.line_locked_time)} ET
                    </td>
                    <td style={{ padding: "8px 8px", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>
                      {new Date() >= new Date(game.line_locked_time) ? (
                        <span style={{ fontWeight: "bold", color: "#d9534f" }}>
                          🔒 <img src={game.fav_logo} width={18} alt="fav" style={{ verticalAlign: "middle" }} /> -{game.line}
                        </span>
                      ) : game.line ? (
                        <><img src={game.fav_logo} width={18} alt="fav" style={{ verticalAlign: "middle" }} /> -{game.line}</>
                      ) : "TBD"}
                    </td>
                    <td style={{ padding: "8px 8px", borderBottom: "1px solid #e5e7eb" }}>
                      <PickButtons game={game} picks={picks} updatePick={updatePick} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="mypicks-mobile" style={{ padding: "0 12px" }}>
            {visibleGames.map((game) => (
              <div key={game.id} style={{
                background: "white", borderRadius: 12, padding: "12px 14px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.07)", marginBottom: 10,
                borderLeft: "4px solid #13447a",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  <img src={game.away_logo} width={20} alt="" />
                  <span>{game.away_team}</span>
                  <span style={{ color: "#9ca3af", fontSize: 11 }}>VS</span>
                  <img src={game.home_logo} width={20} alt="" />
                  <span>{game.home_team}</span>
                </div>
                <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#6b7280", marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <span>🕐 {game.game_clock}</span>
                  <span>🔒 {formatTimeET(game.line_locked_time)} ET</span>
                  <span>
                    {new Date() >= new Date(game.line_locked_time) ? (
                      <span style={{ color: "#d9534f", fontWeight: 700 }}>
                        🔒 <img src={game.fav_logo} width={14} alt="" style={{ verticalAlign: "middle" }} /> -{game.line}
                      </span>
                    ) : game.line ? (
                      <><img src={game.fav_logo} width={14} alt="" style={{ verticalAlign: "middle" }} /> -{game.line}</>
                    ) : "Line TBD"}
                  </span>
                </div>
                <PickButtons game={game} picks={picks} updatePick={updatePick} />
              </div>
            ))}
          </div>
          {/* TIEBREAKER */}
          <div style={{ padding: "0 12px", marginTop: 24 }}>
            <div style={{
              background: "white", borderRadius: 12, padding: "16px 20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
              borderLeft: "4px solid #c89d3c",
            }}>
              <h4 style={{ color: "#13447a", margin: "0 0 6px 0", fontSize: 15 }}>🏆 Tiebreaker</h4>
              <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 12, margin: "0 0 12px 0" }}>
                Predict the final score of the Big Ten Tournament Final. Used to break ties.
              </p>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
                    Winning Score
                  </label>
                  <input
                    type="number"
                    value={tiebreakerWin}
                    onChange={e => setTiebreakerWin(e.target.value)}
                    placeholder="e.g. 78"
                    style={{ width: 90, padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 16, fontWeight: 700, textAlign: "center" }}
                  />
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#9ca3af", alignSelf: "flex-end", paddingBottom: 8 }}>—</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
                    Losing Score
                  </label>
                  <input
                    type="number"
                    value={tiebreakerLoss}
                    onChange={e => setTiebreakerLoss(e.target.value)}
                    placeholder="e.g. 65"
                    style={{ width: 90, padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 16, fontWeight: 700, textAlign: "center" }}
                  />
                </div>
                <button
                  onClick={handleSaveTiebreaker}
                  style={{ alignSelf: "flex-end", padding: "8px 18px", borderRadius: 6, backgroundColor: "#13447a", color: "white", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
                >
                  Save
                </button>
                {tiebreakerSaved && (
                  <span style={{ alignSelf: "flex-end", fontSize: 13, color: "#16a34a", fontWeight: 600, paddingBottom: 8 }}>
                    ✅ Saved
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}