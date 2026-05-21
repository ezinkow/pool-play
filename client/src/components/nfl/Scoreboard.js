import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";

/** CONFIG */
const ROUND_LAYOUT = {
  1: ["QB", "RB", "RB", "WR", "WR", "WR", "SUPERFLEX", "SUPERFLEX"],
  2: ["QB", "RB", "WR", "WR", "SUPERFLEX", "SUPERFLEX"],
  3: ["RB", "WR", "SUPERFLEX", "SUPERFLEX", "SUPERFLEX"],
  4: ["SUPERFLEX", "SUPERFLEX", "SUPERFLEX", "SUPERFLEX"],
};

const ROUND_SCORE_COLUMN = {
  1: "wild_card_score",
  2: "divisional_score",
  3: "conf_championship_score",
  4: "super_bowl_score",
};

const POSITION_COLORS = {
  QB: { bg: "#fee2e2", text: "#991b1b" },
  RB: { bg: "#d1fae5", text: "#065f46" },
  WR: { bg: "#dbeafe", text: "#1e3a8a" },
  TE: { bg: "#dbeafe", text: "#1e3a8a" },
  SUPERFLEX: { bg: "#fef2f8", text: "#9d174d" },
  default: { bg: "#f3f4f6", text: "#1f2937" },
};

/** HELPERS */
function getNextEligiblePlayer(players, slot, usedIndexes) {
  if (!players) return null;

  for (let i = 0; i < players.length; i++) {
    if (usedIndexes.has(i)) continue;

    const p = players[i];
    const eligible =
      slot === "SUPERFLEX" ||
      (slot === "WR" &&
        (p.position === "WR" || p.position === "TE")) ||
      p.position === slot;

    if (eligible) {
      usedIndexes.add(i);
      return p;
    }
  }

  return null;
}

function groupRowsByUser(rows) {
  const grouped = {};

  rows.forEach((row) => {
    if (!grouped[row.name]) {
      grouped[row.name] = { rounds: {}, total: 0 };
    }

    if (!grouped[row.name].rounds[row.round]) {
      grouped[row.name].rounds[row.round] = [];
    }

    grouped[row.name].rounds[row.round].push(row);

    const score =
      Number(row[ROUND_SCORE_COLUMN[row.round]]) || 0;

    grouped[row.name].total += score;
  });

  return grouped;
}

/** COMPONENT */
export default function Scoreboard() {
  const [rows, setRows] = useState([]);
  const [collapsedRounds, setCollapsedRounds] = useState({});

  const scrollRef = useRef(null);
  const topScrollRef = useRef(null);

  useEffect(() => {
    axios.get("/api/nfl/startingrosters").then((res) => {
      setRows(res.data);
    });
  }, []);

  /** Sync horizontal scroll */
  useEffect(() => {
    if (!scrollRef.current || !topScrollRef.current) return;

    const main = scrollRef.current;
    const top = topScrollRef.current;

    const syncFromMain = () => {
      top.scrollLeft = main.scrollLeft;
    };

    const syncFromTop = () => {
      main.scrollLeft = top.scrollLeft;
    };

    main.addEventListener("scroll", syncFromMain);
    top.addEventListener("scroll", syncFromTop);

    return () => {
      main.removeEventListener("scroll", syncFromMain);
      top.removeEventListener("scroll", syncFromTop);
    };
  }, []);

  const groupedByName = useMemo(
    () => groupRowsByUser(rows),
    [rows]
  );

  const sortedNames = useMemo(() => {
    return Object.keys(groupedByName).sort(
      (a, b) =>
        groupedByName[b].total - groupedByName[a].total
    );
  }, [groupedByName]);

  const isMobile =
    typeof window !== "undefined" && window.innerWidth < 768;

  const toggleRound = (round) => {
    setCollapsedRounds((prev) => ({
      ...prev,
      [round]: !prev[round],
    }));
  };

  return (
    <div style={{ padding: "16px" }}>
      <h2 style={{ marginBottom: "12px" }}>
        🏆 Playoff Leaderboard
      </h2>

      {/* Sticky top scrollbar */}
      <div
        ref={topScrollRef}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          overflowX: "auto",
          overflowY: "hidden",
          height: "14px",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            width: `${sortedNames.length * 276}px`,
            height: "1px",
          }}
        />
      </div>

      {/* Main scroll container */}
      <div
        ref={scrollRef}
        style={{
          overflowX: "auto",
        }}
      >
        <div style={{ display: "flex", gap: "16px" }}>
          {sortedNames.map((name, index) => {
            const { rounds, total } = groupedByName[name];

            return (
              <div
                key={name}
                style={{
                  minWidth: "260px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  background: "#f9fafb",
                }}
              >
                {/* HEADER */}
                <div
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "#fff",
                    borderBottom:
                      "1px solid #e5e7eb",
                    padding: "10px",
                    textAlign: "center",
                    fontWeight: 600,
                    zIndex: 5,
                  }}
                >
                  {index === 0 && "🥇 "}
                  {index === 1 && "🥈 "}
                  {index === 2 && "🥉 "}
                  {name}
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#2563eb",
                    }}
                  >
                    Total: {total.toFixed(2)}
                  </div>
                </div>

                <div style={{ padding: "10px" }}>
                  {Object.entries(ROUND_LAYOUT).map(
                    ([round, slots]) => {
                      const collapsed =
                        isMobile &&
                        collapsedRounds[round] !==
                          false;

                      const used = new Set();
                      let roundTotal = 0;

                      return (
                        <div
                          key={round}
                          style={{
                            marginBottom: "14px",
                          }}
                        >
                          <div
                            onClick={() =>
                              isMobile &&
                              toggleRound(round)
                            }
                            style={{
                              fontWeight: 600,
                              cursor: isMobile
                                ? "pointer"
                                : "default",
                              borderBottom:
                                "1px solid #e5e7eb",
                              marginBottom: "6px",
                            }}
                          >
                            Round {round}
                          </div>

                          {!collapsed &&
                            slots.map(
                              (slot, idx) => {
                                const player =
                                  getNextEligiblePlayer(
                                    rounds?.[round],
                                    slot,
                                    used
                                  );

                                const points =
                                  player
                                    ? Number(
                                        player[
                                          ROUND_SCORE_COLUMN[
                                            round
                                          ]
                                        ] || 0
                                      )
                                    : 0;

                                roundTotal += points;

                                const colors =
                                  POSITION_COLORS[
                                    player?.position
                                  ] ||
                                  POSITION_COLORS.default;

                                return (
                                  <div
                                    key={`${round}-${slot}-${idx}`}
                                    style={{
                                      display:
                                        "flex",
                                      justifyContent:
                                        "space-between",
                                      background:
                                        colors.bg,
                                      color:
                                        colors.text,
                                      borderRadius:
                                        "8px",
                                      padding:
                                        "6px",
                                      fontSize:
                                        "12px",
                                      marginBottom:
                                        "4px",
                                    }}
                                  >
                                    <strong>
                                      {slot}
                                    </strong>

                                    <span
                                      style={{
                                        flex: 1,
                                        marginLeft:
                                          "6px",
                                        whiteSpace:
                                          "nowrap",
                                        overflow:
                                          "hidden",
                                        textOverflow:
                                          "ellipsis",
                                      }}
                                    >
                                      {player
                                        ? player.player_name ===
                                          "(hidden)"
                                          ? "(hidden)"
                                          : `${player.player_name} (${player.team})`
                                        : "---"}
                                    </span>

                                    <span>
                                      {points.toFixed(
                                        2
                                      )}
                                    </span>
                                  </div>
                                );
                              }
                            )}

                          {!collapsed && (
                            <div
                              style={{
                                fontWeight: 600,
                                textAlign:
                                  "right",
                                marginTop:
                                  "6px",
                              }}
                            >
                              Round Total:{" "}
                              {roundTotal.toFixed(
                                2
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
