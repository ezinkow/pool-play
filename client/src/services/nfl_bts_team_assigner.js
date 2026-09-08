const { FootballAssignments } = require('../models');

const NFC_TEAMS_BY_DIVISION = {
    "NFC North": ["Packers", "Vikings", "Lions", "Bears"],
    "NFC East": ["Cowboys", "Eagles", "Giants", "Commanders"],
    "NFC South": ["Saints", "Buccaneers", "Falcons", "Panthers"],
    "NFC West": ["49ers", "Cardinals", "Seahawks", "Rams"]
};

const AFC_TEAMS_BY_DIVISION = {
    "AFC North": ["Ravens", "Steelers", "Bengals", "Browns"],
    "AFC East": ["Dolphins", "Bills", "Patriots", "Jets"],
    "AFC South": ["Colts", "Texans", "Titans", "Jaguars"],
    "AFC West": ["Chiefs", "Raiders", "Chargers", "Broncos"]
};

function shuffleArray(array) {
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

async function assignTeamsToRoom(usersList, roomId = "room_1") {
    // usersList expects an array of objects e.g., [{ id: 1, name: 'Pascal' }, ...]
    if (usersList.length < 32) {
        console.log(`⚠️ Room needs 32 users. Currently has ${usersList.length}.`);
        return false;
    }

    let nfcPool = [];
    Object.entries(NFC_TEAMS_BY_DIVISION).forEach(([division, teams]) => {
        teams.forEach(team => nfcPool.push({ team, division }));
    });

    let afcPool = [];
    Object.entries(AFC_TEAMS_BY_DIVISION).forEach(([division, teams]) => {
        teams.forEach(team => afcPool.push({ team, division }));
    });

    const shuffledNfc = shuffleArray(nfcPool);
    const shuffledAfc = shuffleArray(afcPool);
    const shuffledUsers = shuffleArray(usersList);

    for (let i = 0; i < 32; i++) {
        const user = shuffledUsers[i];
        const nfcAssignment = shuffledNfc[i];
        const afcAssignment = shuffledAfc[i];

        await FootballAssignments.create({
            room_id: roomId,
            user_id: user.id,
            team_name_1: nfcAssignment.team,
            division_1: nfcAssignment.division,
            team_name_2: afcAssignment.team,
            division_2: afcAssignment.division
        });
    }

    console.log("✅ Successfully assigned one NFC team and one AFC team per user!");
    return true;
}

module.exports = assignTeamsToRoom;