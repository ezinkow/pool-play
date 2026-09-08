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
    if (!usersList || usersList.length === 0) {
        console.log(`⚠️ No users provided for Room ${roomId}.`);
        return false;
    }

    const allTeams = await NflTeams.findAll();
    
    const nfcPool = allTeams
        .filter(t => t.division && t.division.startsWith("NFC"))
        .map(t => ({ team: t.name, division: t.division }));

    const afcPool = allTeams
        .filter(t => t.division && t.division.startsWith("AFC"))
        .map(t => ({ team: t.name, division: t.division }));

    const shuffledNfc = shuffleArray(nfcPool);
    const shuffledAfc = shuffleArray(afcPool);
    const shuffledUsers = shuffleArray(usersList);

    const assignCount = Math.min(shuffledUsers.length, shuffledNfc.length);

    for (let i = 0; i < assignCount; i++) {
        const userItem = shuffledUsers[i];
        // Handle both object payload ({ id: ... }) or direct primitive ID value
        const userId = typeof userItem === 'object' && userItem !== null ? (userItem.id || userItem.user_id) : userItem;

        if (!userId) {
            console.error(`❌ Invalid user identifier found at index ${i}:`, userItem);
            continue;
        }

        const nfcAssignment = shuffledNfc[i];
        const afcAssignment = shuffledAfc[i];

        await NflBtsTeamAssignments.create({
            room_id: roomId,
            user_id: userId,
            team_name_1: nfcAssignment.team,
            division_1: nfcAssignment.division,
            team_name_2: afcAssignment.team,
            division_2: afcAssignment.division
        });
    }

    console.log(`✅ Successfully assigned one NFC team and one AFC team to ${assignCount} users in Room ${roomId}!`);
    return true;
}

module.exports = assignTeamsToRoom;