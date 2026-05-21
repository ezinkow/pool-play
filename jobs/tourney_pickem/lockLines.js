// 1. Point to the root models folder
const db = require("../../models");
const { Op } = require("sequelize");

const lockLines = async () => {
    // 2. Destructure inside the function from the Pickem sub-object
    const { UsersPickem, PicksPickem, GamesPickem } = db;

    const now = new Date();

    // 1. Lock lines for games within 1hr of start
    const gamesToLock = await GamesPickem.findAll({
        where: {
            line: { [Op.not]: null },
            locked_favorite: null,
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

    // 2. Missed picks — bulk query
    const startedGamesPickem = await GamesPickem.findAll({
        where: { game_date: { [Op.lt]: now } }
    });

    if (startedGamesPickem.length === 0) return;

    const startedGameIds = startedGamesPickem.map(g => g.id);
    const allUsers = await UsersPickem.findAll();

    const existingPicks = await PicksPickem.findAll({
        where: { game_id: { [Op.in]: startedGameIds } },
        attributes: ["user_id", "game_id"]
    });

    const pickSet = new Set(existingPicks.map(p => `${p.user_id}||${p.game_id}`));

    const missedPicks = [];
    for (const game of startedGamesPickem) {
        for (const user of allUsers) {
            if (!pickSet.has(`${user.id}||${game.id}`)) {
                missedPicks.push({
                    user_id: user.id,
                    game_id: game.id,
                    pick: game.underdog, // Automatically gives them the underdog
                    game_date: game.game_date,
                    missed_pick_flag: true,
                });
            }
        }
    }

    if (missedPicks.length > 0) {
        await PicksPickem.bulkCreate(missedPicks, {
            ignoreDuplicates: true
        });
        console.log(`[Job] Created ${missedPicks.length} missed picks`);
    }
};

module.exports = lockLines;