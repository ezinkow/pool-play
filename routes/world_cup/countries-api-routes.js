const db = require("../../models");

module.exports = function (app) {
    app.get("/api/worldcup/countries", async (req, res) => {
        const countries = await db.WorldCupCountryInfo.findAll();
        res.json(countries);
    });
}