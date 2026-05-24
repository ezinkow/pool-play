const { Users, Picks, Games } = require("../../models");
const { Op } = require("sequelize");

const lockLines = async () => {
    const now = new Date();

    // 1. Lock lines for games within 1hr of start
    const gamesToLock = await Games.findAll({
        where: {
            line: { [Op.not]: null },
            locked_favorite: null, // only lock ones not yet locked
        }
    });

    for (const game of gamesToLock) {
        const lockThreshold = new Date(new Date(game.game_date).getTime() - 60 * 60 * 1000);
        if (now >= lockThreshold) {
            await game.update({
                locked_favorite: game.favorite,
                locked_underdog: game.underdog,
                locked_fav_logo: game.fav_logo,
                locked_dog_logo: game.dog_logo,
                line_locked_time: lockThreshold,
            });
        }
    }

    // 2. Missed picks — bulk query instead of N×M findOne calls
    const startedGames = await Games.findAll({
        where: { game_date: { [Op.lt]: now } }
    });

    if (startedGames.length === 0) return;

    const startedGameIds = startedGames.map(g => g.id);
    const allUsers = await Users.findAll();

    // Fetch ALL existing picks for started games in one query
    const existingPicks = await Picks.findAll({
        where: { game_id: { [Op.in]: startedGameIds } },
        attributes: ["name", "game_id"]
    });

    // Build a Set for O(1) lookup
    const pickSet = new Set(existingPicks.map(p => `${p.name}||${p.game_id}`));

    // Build missed picks array
    const missedPicks = [];
    for (const game of startedGames) {
        for (const user of allUsers) {
            if (!pickSet.has(`${user.name}||${game.id}`)) {
                missedPicks.push({
                    name: user.name,
                    game_id: game.id,
                    pick: game.underdog,
                    game_date: game.game_date,
                    missed_pick_flag: true,
                });
            }
        }
    }

    // One bulk insert instead of N×M individual creates
    if (missedPicks.length > 0) {
        await Picks.bulkCreate(missedPicks, {
            ignoreDuplicates: true
        });
        console.log(`Created ${missedPicks.length} missed picks`);
    }
};

module.exports = lockLines;