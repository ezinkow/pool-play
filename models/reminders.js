module.exports = (sequelize, DataTypes) => {
    const Reminder = sequelize.define("Reminder", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false
        },
        subject: {
            type: DataTypes.STRING,
            allowNull: false
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        send_at: {
            type: DataTypes.DATE,
            allowNull: false
        },
        sent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: "reminders",
        timestamps: true
    });

    return Reminder;
};