const axios = require("axios");
const db = require("../../models");

// Split-Window URL Configurations
const URL_WINDOWS = [
    "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260710", 
    "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260711-20260720"  
];

const ROUND_POINTS = {
    0: { label: "Group Stage", win: 1, draw: 2 },
    1: { label: "Round of 32", win: 2 },
    2: { label: "Round of 16", win: 3 },
    3: { label: "Quarterfinal", win: 5 },
    4: { label: "Semifinal", win: 7 },
    5: { label: "Final", win: 10 }
};

const GROUP_STAGE_DATA = {
    "760414": "Group A", "760415": "Group A", "760416": "Group B", "760417": "Group D",
    "760418": "Group C", "760419": "Group C", "760420": "Group B", "760421": "Group D",
    "760422": "Group E", "760423": "Group E", "760424": "Group F", "760425": "Group F",
    "760426": "Group G", "760427": "Group G", "760428": "Group H", "760429": "Group H",
    "760430": "Group I", "760431": "Group J", "760432": "Group I", "760433": "Group J",
    "760434": "Group L", "760435": "Group K", "760436": "Group K", "760437": "Group L",
    "760438": "Group A", "760439": "Group B", "760440": "Group B", "760441": "Group A",
    "760442": "Group D", "760443": "Group D", "760444": "Group C", "760445": "Group C",
    "760446": "Group E", "760447": "Group F", "760448": "Group E", "760449": "Group F",
    "760450": "Group H", "760451": "Group G", "760452": "Group G", "760453": "Group H",
    "760454": "Group I", "760455": "Group J", "760456": "Group J", "760457": "Group I",
    "760458": "Group L", "760459": "Group K", "760460": "Group L", "760461": "Group K",
    "760462": "Group B", "760463": "Group B", "760464": "Group C", "760465": "Group C",
    "760466": "Group A", "760467": "Group A", "760468": "Group E", "760469": "Group D",
    "760470": "Group D", "760471": "Group F", "760472": "Group F", "760473": "Group E",
    "760474": "Group I", "760475": "Group I", "760476": "Group G", "760477": "Group G",
    "760478": "Group H", "760479": "Group H", "760480": "Group L", "760481": "Group K",
    "760482": "Group K", "760483": "Group J", "760484": "Group J", "760485": "Group L"
};

/**
 * 🕵️‍♂️ HELPER FUNCTION: DETECTS API PLACEHOLDER STRINGS
 * Returns true if the string is an engineering placeholder rather than a real nation.
 */
function isPlaceholder(teamName) {
    if (!teamName) return true;
    const nameLower = teamName.toLowerCase();
    
    return (
        nameLower === "tbd" ||
        nameLower.includes("winner") ||
        nameLower.includes("loser") ||
        nameLower.includes("place") ||
        /^[w|l][0-9]+/i.test(nameLower) || // Matches things like W1, L12
        /\b(sf|qf|r32|r16)\b/i.test(nameLower) // Matches tournament round abbreviation codes
    );
}

function getWorldCupRound(event) {
    const slug = (event.season?.slug || "").toLowerCase();
    const desc = (event.status?.type?.description || "").toLowerCase();
    const combined = `${slug} ${desc}`;

    if (combined.includes("final") && !combined.includes("semi") && !combined.includes("quarter")) return 5;
    if (combined.includes("semifinals")) return 4;
    if (combined.includes("quarterfinals")) return 3;
    if (combined.includes("round-of-16") || combined.includes("round of 16")) return 2;
    if (combined.includes("round-of-32") || combined.includes("round of 32")) return 1;

    return 0;
}

async function syncWorldCup() {
    const { WorldCupMatches } = db;
    try {
        const responses = await Promise.all(URL_WINDOWS.map(url => axios.get(url)));
        
        const allEvents = responses.reduce((acc, currentRes) => {
            if (currentRes.data && currentRes.data.events) {
                return acc.concat(currentRes.data.events);
            }
            return acc;
        }, []);

        if (allEvents.length === 0) {
            console.warn("[WC Sync] Sync cancelled: No events recovered.");
            return;
        }

        let processedCount = 0;

        for (const event of allEvents) {
            // Drop 3rd Place match configurations cleanly
            if (event.id === "760516" || event.season?.slug === "3rd-place-match") {
                continue;
            }

            const comp = event.competitions?.[0];
            if (!comp) continue;

            const homeObj = comp.competitors.find(c => c.homeAway === "home");
            const awayObj = comp.competitors.find(c => c.homeAway === "away");

            if (!homeObj || !awayObj) continue;

            const roundNum = getWorldCupRound(event);
            const roundCfg = ROUND_POINTS[roundNum];

            const assignedGroup = GROUP_STAGE_DATA[String(event.id)] || null;

            const rawHomeName = homeObj.team?.displayName || "";
            const rawAwayName = awayObj.team?.displayName || "";

            // ✨ THE DYNAMIC UPGRADE: Check values instead of hardcoded IDs
            const isHomePlaceholder = isPlaceholder(rawHomeName);
            const isAwayPlaceholder = isPlaceholder(rawAwayName);

            const payload = {
                match_id: event.id,
                // Only write to the DB if it is a real country name, otherwise clear it out to null
                home_team: isHomePlaceholder ? null : rawHomeName,
                away_team: isAwayPlaceholder ? null : rawAwayName,
                home_logo: isHomePlaceholder ? null : homeObj.team.logo,
                away_logo: isAwayPlaceholder ? null : awayObj.team.logo,
                stage: roundCfg.label.toUpperCase(),
                match_date: event.date,
                locked: new Date() >= new Date(event.date),
                round: roundNum,
                round_label: roundCfg.label,
                points_value: roundCfg.win,
                draw_points_value: roundCfg.draw || 0,
                status: event.status?.type?.name,
                home_score: isHomePlaceholder ? 0 : parseInt(homeObj.score || 0),
                away_score: isAwayPlaceholder ? 0 : parseInt(awayObj.score || 0),
                group: assignedGroup, 
                result: (() => {
                    if (event.status?.type?.name !== "STATUS_FINAL" || isHomePlaceholder || isAwayPlaceholder) return "Pending";
                    if (homeObj.winner) return "Home";
                    if (awayObj.winner) return "Away";
                    return "Draw";
                })()
            };

            await WorldCupMatches.upsert(payload);
            processedCount++;
        }
    } catch (err) {
        console.error(`[WC Sync] Sync Error:`, err.message);
    }
}

module.exports = syncWorldCup;