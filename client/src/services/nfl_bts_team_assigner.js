const { FootballAssignments } = require('../models');

const NFL_TEAMS_BY_DIVISION = {
    "NFC North": ["Packers", "Vikings", "Lions", "Bears"],
    "NFC East": ["Cowboys", "Eagles", "Giants", "Commanders"],
    "NFC South": ["Saints", "Buccaneers", "Falcons", "Panthers"],
    "NFC West": ["49ers", "Cardinals", "Seahawks", "Rams"],
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

    let allTeams = [];
    Object.entries(NFL_TEAMS_BY_DIVISION).forEach(([division, teams]) => {
        teams.forEach(team => allTeams.push({ team, division }));
    });

    const shuffledTeams = shuffleArray(allTeams);
    const shuffledUsers = shuffleArray(usersList);

    for (let i = 0; i < 32; i++) {
        await FootballAssignments.create({
            room_id: roomId,
            user_id: shuffledUsers[i].id, // Anchored to user_id
            team_name: shuffledTeams[i].team,
            division: shuffledTeams[i].division
        });
    }

    console.log("✅ Successfully assigned 32 random teams using user_ids!");
    return true;
}

module.exports = assignTeamsToRoom;