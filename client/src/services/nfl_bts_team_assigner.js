const { NflBtsTeamAssignments, NflTeams } = require('../../../models');

function shuffleArray(array) {
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

async function assignTeamsToRoom(usersList, roomId = 1) {
    if (usersList.length < 16) {
        console.log(`⚠️ Room needs 16 users. Currently has ${usersList.length}.`);
        return false;
    }

    // Fetch all teams directly from the database
    const allTeams = await NflTeams.findAll();

    // Separate into NFC and AFC pools based on the team's conference or division field
    const nfcPool = allTeams
        .filter(t => t.division && t.division.startsWith("NFC"))
        .map(t => ({ team: t.name, division: t.division }));

    const afcPool = allTeams
        .filter(t => t.division && t.division.startsWith("AFC"))
        .map(t => ({ team: t.name, division: t.division }));

    const shuffledNfc = shuffleArray(nfcPool);
    const shuffledAfc = shuffleArray(afcPool);
    const shuffledUsers = shuffleArray(usersList);

    for (let i = 0; i < 16; i++) {
        const user = shuffledUsers[i];
        const nfcAssignment = shuffledNfc[i];
        const afcAssignment = shuffledAfc[i];

        await NflBtsTeamAssignments.create({
            room_id: roomId,
            user_id: user.id,
            team_name_1: nfcAssignment.team,
            division_1: nfcAssignment.division,
            team_name_2: afcAssignment.team,
            division_2: afcAssignment.division
        });
    }

    console.log(`✅ Successfully assigned one NFC team and one AFC team to ${usersList.length} users in Room ${roomId}!`);
    return true;
}

module.exports = assignTeamsToRoom;