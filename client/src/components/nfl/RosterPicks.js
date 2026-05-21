import React, { useState, useEffect } from "react";
import axios from "axios";
import Button from "react-bootstrap/Button";
import toast, { Toaster } from "react-hot-toast";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";
import Roster_Selection_Steps from "./RosterSelectionSteps";

export default function RosterPicks({ authInfo }) {
  const [playerpool, setPlayerpool] = useState({});
  const [selectedPlayers, setSelectedPlayers] = useState({});
  const [name, setName] = useState(authInfo?.name || "SELECT YOUR NAME IN DROPDOWN!");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(!!authInfo);
  const [names, setNames] = useState([]);
  const [sortBy, setSortBy] = useState("alphabetical");
  const [showSteps, setShowSteps] = useState(true);

  const positionColors = {
    QB: { bg: "#fee2e2", text: "#991b1b", border: "#ef4444" },
    RB: { bg: "#d1fae5", text: "#065f46", border: "#10b981" },
    WR: { bg: "#dbeafe", text: "#1e3a8a", border: "#3b82f6" },
    TE: { bg: "#fef9c3", text: "#78350f", border: "#facc15" },
    default: { bg: "#f3f4f6", text: "#1f2937", border: "#d1d5db" },
  };

  const tierLimits = { 1: 3, 2: 3, 3: 3, 4: 2, 5: 2, 6: 1 };

  /* -------------------- DATA FETCH -------------------- */
  useEffect(() => {
    async function fetchPlayers() {
      try {
        const res = await axios.get("/api/playerpools");
        const grouped = res.data.reduce((acc, p) => {
          const tier = p.tier || "Unknown Tier";
          if (!acc[tier]) acc[tier] = [];
          acc[tier].push(p);
          return acc;
        }, {});
        Object.keys(grouped).forEach((tier) =>
          grouped[tier].sort((a, b) => a.player_name.localeCompare(b.player_name))
        );
        setPlayerpool(grouped);
      } catch (err) {
        console.error(err);
      }
    }
    fetchPlayers();
  }, []);

  useEffect(() => {
    async function fetchNames() {
      try {
        const res = await axios.get("/api/nfl/entries");
        setNames(res.data.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error(err);
      }
    }
    fetchNames();
  }, []);

  const namesList = names.map((n) => (
    <Dropdown.Item eventKey={n.name} key={n.name}>
      {n.name}
    </Dropdown.Item>
  ));

  const positionOrder = { QB: 1, RB: 2, WR: 3, TE: 4 };
  const sortPlayers = (players) => {
    const list = [...players];
    switch (sortBy) {
      case "position":
        return list.sort((a, b) => {
          const posDiff = (positionOrder[a.position] || 99) - (positionOrder[b.position] || 99);
          return posDiff !== 0 ? posDiff : a.player_name.localeCompare(b.player_name);
        });
      case "team":
        return list.sort((a, b) => {
          const teamDiff = (a.team || "").localeCompare(b.team || "");
          return teamDiff !== 0 ? teamDiff : a.player_name.localeCompare(b.player_name);
        });
      case "alphabetical":
      default:
        return list.sort((a, b) => a.player_name.localeCompare(b.player_name));
    }
  };

  /* -------------------- HANDLERS -------------------- */
  const handleNameSelect = (event) => {
    setName(event);
    setAuthenticated(false);
    setPassword("");
    setSelectedPlayers({});
  };

  const handlePasswordChange = (e) => setPassword(e.target.value);

  const handleVerifyPassword = async () => {
    if (!name || name === "SELECT YOUR NAME IN DROPDOWN!") return toast.error("Please select your name");
    if (!password) return toast.error("Please enter password");

    try {
      const res = await axios.post("/api/nfl/entries/verify", { name, password });
      if (res.data.success) {
        setAuthenticated(true);
        toast.success("Password verified!");
      } else {
        setAuthenticated(false);
        toast.error("Incorrect password");
      }
    } catch (err) {
      console.error(err);
      toast.error("Verification failed");
    }
  };

  const handlePlayerSelect = (tier, playerName) => {
    if (!authenticated) return;
    setSelectedPlayers((prev) => {
      const tierSelected = prev[tier] || [];
      const allSelectedPlayers = Object.values(prev).flat();
      const qbCount = allSelectedPlayers
        .map((p) => Object.values(playerpool).flat().find((pl) => pl.player_name === p))
        .filter((p) => p?.position === "QB").length;

      const playerObj = Object.values(playerpool)
        .flat()
        .find((p) => p.player_name === playerName);

      if (!playerObj) return prev;
      if (tierSelected.includes(playerName))
        return { ...prev, [tier]: tierSelected.filter((p) => p !== playerName) };

      if (playerObj.position === "QB" && qbCount >= 2) {
        toast.error("You can only select 2 QBs total");
        return prev;
      }

      if (tierSelected.length >= (tierLimits[tier] || 99)) {
        toast.error(`Tier limit reached: ${tierLimits[tier]}`);
        return prev;
      }

      return { ...prev, [tier]: [...tierSelected, playerName] };
    });
  };

  const getTotalSelectedCount = () =>
    Object.values(selectedPlayers).reduce((sum, arr) => sum + arr.length, 0);

  const validateRoster = () => {
    const total = getTotalSelectedCount();
    if (total !== 14) {
      toast.error(`You must select exactly 14 players (currently ${total})`);
      return false;
    }
    for (const [tier, required] of Object.entries(tierLimits)) {
      const count = (selectedPlayers[tier] || []).length;
      if (count !== required) {
        toast.error(`Tier ${tier}: ${required} players required (currently ${count})`);
        return false;
      }
    }
    return true;
  };

  const handleSubmitClick = async () => {
    if (!authenticated) return toast.error("Please verify your password first!");
    if (!validateRoster()) return;

    const allPlayersMap = Object.values(playerpool)
      .flat()
      .reduce((acc, p) => {
        acc[p.player_name] = p;
        return acc;
      }, {});

    const payload = Object.entries(selectedPlayers)
      .flatMap(([tier, players]) =>
        players.map((playerName) => {
          const playerObj = allPlayersMap[playerName];
          if (!playerObj) return null;
          return {
            name,
            player_name: playerObj.player_name,
            position: playerObj.position,
            team: playerObj.team,
            tier,
          };
        })
      )
      .filter(Boolean);

    try {
      await axios.post("/api/rosters", payload);
      toast.success(`Thanks, ${name}, your roster has been submitted!`);
      setSelectedPlayers({});
      setName("SELECT YOUR NAME IN DROPDOWN!");
      setPassword("");
      setAuthenticated(false);
    } catch (err) {
      console.error("Error submitting roster:", err);
      toast.error("Error submitting your roster. Please try again.");
    }
  };

  const isRosterValid =
    getTotalSelectedCount() === 14 &&
    Object.entries(tierLimits).every(([tier, required]) => (selectedPlayers[tier] || []).length === required);

  /* -------------------- RENDER -------------------- */
  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <Toaster />

      {/* Roster Selection Steps */}
      <div
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          padding: "8px",
          backgroundColor: "#f9fafb",
        }}
      >
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={() => setShowSteps((prev) => !prev)}
        >
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>Roster Selection Steps</h3>
          <span style={{ fontSize: "14px", color: "#4f46e5" }}>{showSteps ? "Hide ▲" : "Show ▼"}</span>
        </div>
        {showSteps && <div style={{ marginTop: "8px" }}><Roster_Selection_Steps /></div>}
      </div>

      {/* Name selection & password */}
      {!authenticated && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerifyPassword();
          }}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <DropdownButton
            id="dropdown-basic-button"
            title={name}
            onSelect={handleNameSelect}
          >
            {namesList}
          </DropdownButton>

          <input
            type="password"
            autoComplete="off"
            placeholder="Enter password"
            value={password}
            onChange={handlePasswordChange}
            style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #ccc" }}
          />

          <Button type="submit" style={{ padding: "6px 12px" }}>
            Verify
          </Button>
        </form>
      )}

      {/* Sort Buttons */}
      {authenticated && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <span style={{ fontWeight: 500 }}>Sort by:</span>
          {["alphabetical", "position", "team"].map((mode) => (
            <button
              key={mode}
              onClick={() => setSortBy(mode)}
              style={{
                padding: "4px 8px",
                borderRadius: "6px",
                border: sortBy === mode ? "2px solid #4f46e5" : "1px solid #ccc",
                backgroundColor: sortBy === mode ? "#eef2ff" : "#fff",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {mode.replace("alphabetical", "Alphabetical")}
            </button>
          ))}
        </div>
      )}

      {/* Player Columns */}
      {authenticated && (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "12px" }}>
          {Object.entries(playerpool).map(([tier, players]) => {
            const tierSelected = selectedPlayers[tier] || [];
            const selectedCount = tierSelected.length;
            return (
              <div key={tier} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "bold" }}>
                  Tier {tier} — Pick {selectedCount} of {tierLimits[tier] || "—"}
                </h3>
                {sortPlayers(players).map((player) => {
                  const isSelected = tierSelected.includes(player.player_name);
                  const allSelectedPlayers = Object.values(selectedPlayers).flat();
                  const qbCount = allSelectedPlayers
                    .map((p) => Object.values(playerpool).flat().find((pl) => pl.player_name === p))
                    .filter((p) => p?.position === "QB").length;

                  const disableCheckbox = !isSelected && (
                    tierSelected.length >= (tierLimits[tier] || 99) ||
                    (player.position === "QB" && qbCount >= 2)
                  );

                  const colors = positionColors[player.position] || positionColors.default;

                  return (
                    <label
                      key={player.player_name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        border: `1px solid ${isSelected ? colors.border : "#ccc"}`,
                        backgroundColor: isSelected ? colors.bg : "#fff",
                        borderRadius: "8px",
                        padding: "4px",
                        cursor: disableCheckbox ? "not-allowed" : "pointer",
                        opacity: disableCheckbox ? 0.5 : 1,
                        fontSize: "12px",
                        color: colors.text,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={disableCheckbox}
                        onChange={() => handlePlayerSelect(tier, player.player_name)}
                        style={{ marginRight: "6px", width: "16px", height: "16px" }}
                      />
                      <div>
                        <span style={{ fontWeight: "500" }}>{player.player_name}</span>
                        <span style={{ color: "#555", marginLeft: "4px" }}>
                          ({player.team} / {player.position})
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* --- LIVE ROSTER GROUPED BY POSITION --- */}
      {authenticated && (
        <div style={{ marginTop: "24px", borderTop: "1px solid #d1d5db", paddingTop: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600" }}>Your Live Roster</h3>
          {getTotalSelectedCount() === 0 ? (
            <p>No players selected yet.</p>
          ) : (
            ["QB", "RB", "WR", "TE"].map((pos) => {
              const playersOfPos = Object.values(selectedPlayers)
                .flat()
                .map((playerName) => Object.values(playerpool).flat().find((p) => p.player_name === playerName))
                .filter((p) => p?.position === pos);

              if (playersOfPos.length === 0) return null;

              return (
                <div key={pos} style={{ marginBottom: "12px" }}>
                  <strong>{pos}s:</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                    {playersOfPos.map((player) => {
                      const colors = positionColors[player.position] || positionColors.default;
                      const tier = Object.entries(selectedPlayers).find(([tier, arr]) => arr.includes(player.player_name))?.[0];
                      return (
                        <div
                          key={player.player_name}
                          style={{
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderRadius: "8px",
                            padding: "4px 8px",
                            fontSize: "12px",
                          }}
                        >
                          {player.player_name} ({player.team}) — Tier {tier}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
      
      {/* Submit Button */}
      {/* {authenticated && (
        <Button
          onClick={handleSubmitClick}
          disabled={!isRosterValid}
          style={{
            marginTop: "16px",
            padding: "8px 16px",
            backgroundColor: isRosterValid ? "#4f46e5" : "#ccc",
            color: "#fff",
            borderRadius: "8px",
            cursor: isRosterValid ? "pointer" : "not-allowed",
          }}
        >
          Submit Roster
        </Button>
      )} */}
    </div>
  );
}
