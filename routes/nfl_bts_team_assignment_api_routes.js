// routes/adminNflBts.js (or inside your existing admin routes file)
const express = require('express');
const router = express.Router();
const assignTeamsToRoom = require('../service/nfl_bts_team_assigner');
const { UserEntries, User } = require('../models'); // Adjust based on your model paths
// Include your admin authentication middleware here if applicable

router.post('/assign-teams', async (req, res) => {
    const { room_id } = req.body;
    const roomId = room_id || 1;

    try {
        // Fetch users who have entered this specific room
        const entries = await UserEntries.findAll({
            where: { room_id: roomId },
            include: [{ model: User, attributes: ['id', 'username'] }]
        });

        const usersList = entries.map(e => ({
            id: e.User.id,
            name: e.User.username
        }));

        if (usersList.length < 32) {
            return res.status(400).json({ 
                error: `Not enough users in Room ${roomId}. Found ${usersList.length}, but 32 are required.` 
            });
        }

        const success = await assignTeamsToRoom(usersList, roomId);
        if (success) {
            return res.json({ message: `Successfully assigned 1 NFC and 1 AFC team to 32 users for Room ${roomId}!` });
        } else {
            return res.status(500).json({ error: "Team assignment failed." });
        }
    } catch (err) {
        console.error("Admin team assignment error:", err);
        return res.status(500).json({ error: "Server error during team assignment." });
    }
});

module.exports = router;