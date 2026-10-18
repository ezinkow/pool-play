function getRowValue(row, key) {
    return typeof row.get === "function" ? row.get(key) : row[key];
}

function getLatestFirst(rows) {
    return [...rows].sort((a, b) => {
        const updatedA = new Date(getRowValue(a, "updatedAt") || 0).getTime();
        const updatedB = new Date(getRowValue(b, "updatedAt") || 0).getTime();
        if (updatedA !== updatedB) return updatedB - updatedA;
        return Number(getRowValue(b, "id") || 0) - Number(getRowValue(a, "id") || 0);
    });
}

module.exports = async function saveAtsWeekPicks({
    pickModel,
    gameModel,
    userId,
    week,
    picks,
    transaction,
    includeOuPick = false
}) {
    if (!Number.isInteger(week) || week < 1 || !Array.isArray(picks)) {
        const error = new Error("Invalid picks payload.");
        error.statusCode = 400;
        throw error;
    }

    const games = await gameModel.findAll({ where: { week }, transaction });
    const gamesById = new Map(games.map(game => [Number(game.id), game]));
    const incomingByGameId = new Map();

    for (const pick of picks) {
        if (!pick || typeof pick !== "object") {
            const error = new Error("Invalid picks payload.");
            error.statusCode = 400;
            throw error;
        }

        const gameId = Number(pick.game_id);
        const game = gamesById.get(gameId);
        if (!Number.isInteger(gameId) || !game) {
            const error = new Error("A submitted pick does not belong to this week.");
            error.statusCode = 400;
            throw error;
        }
        if (incomingByGameId.has(gameId)) {
            const error = new Error("A game can only have one submitted pick.");
            error.statusCode = 400;
            throw error;
        }

        const pickedTeam = typeof pick.picked_team === "string" ? pick.picked_team.trim() : "";
        if (pickedTeam && pickedTeam !== game.home_team && pickedTeam !== game.away_team) {
            const error = new Error("A submitted pick does not match either team in its game.");
            error.statusCode = 400;
            throw error;
        }

        incomingByGameId.set(gameId, {
            picked_team: pickedTeam || null,
            is_best_bet: Boolean(pick.is_best_bet),
            ...(includeOuPick ? { ou_pick: pick.ou_pick || null } : {})
        });
    }

    const existingPicks = await pickModel.findAll({
        where: { user_id: userId, week },
        transaction
    });
    const existingByGameId = new Map();
    for (const existingPick of existingPicks) {
        const gameId = Number(getRowValue(existingPick, "game_id"));
        const rows = existingByGameId.get(gameId) || [];
        rows.push(existingPick);
        existingByGameId.set(gameId, rows);
    }

    const now = new Date();
    let bestBetCount = 0;
    for (const [gameId, rows] of existingByGameId) {
        const game = gamesById.get(gameId);
        if (game?.game_date && now >= new Date(game.game_date)) {
            const latestPick = getLatestFirst(rows)[0];
            if (Boolean(getRowValue(latestPick, "is_best_bet"))) bestBetCount += 1;
        }
    }
    for (const [gameId, pick] of incomingByGameId) {
        const game = gamesById.get(gameId);
        const isLocked = game.game_date && now >= new Date(game.game_date);
        if (!isLocked && pick.picked_team && pick.is_best_bet) bestBetCount += 1;
    }

    if (bestBetCount > 3) {
        const error = new Error("You can only select a maximum of 3 Best Bets per week.");
        error.statusCode = 400;
        throw error;
    }

    for (const [gameId, rows] of existingByGameId) {
        const game = gamesById.get(gameId);
        if (!game) continue;

        const [canonicalPick, ...duplicatePicks] = getLatestFirst(rows);
        const isLocked = game.game_date && now >= new Date(game.game_date);

        if (isLocked) {
            for (const duplicatePick of duplicatePicks) {
                await duplicatePick.destroy({ transaction });
            }
            continue;
        }

        const submittedPick = incomingByGameId.get(gameId);
        if (!submittedPick?.picked_team) {
            for (const existingPick of rows) {
                await existingPick.destroy({ transaction });
            }
            continue;
        }

        await canonicalPick.update(submittedPick, { transaction });
        for (const duplicatePick of duplicatePicks) {
            await duplicatePick.destroy({ transaction });
        }
    }

    for (const [gameId, pick] of incomingByGameId) {
        const game = gamesById.get(gameId);
        const isLocked = game.game_date && now >= new Date(game.game_date);
        if (!isLocked && pick.picked_team && !existingByGameId.has(gameId)) {
            await pickModel.create({
                user_id: userId,
                week,
                game_id: gameId,
                ...pick
            }, { transaction });
        }
    }
};
