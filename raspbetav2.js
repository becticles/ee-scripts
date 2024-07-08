const mysql = require('mysql');
const irc = require('irc');

// MySQL connection setup
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'brian',
    password: process.env.MYSQL_PASSWORD,
    database: 'alliance'
});

// IRC bot setup
const bot = new irc.Client('irc.scourge.se', 'enemytracker', {
    channels: ['#AllianceNetworth hahanoperms', '#hire mercs4life'],
    debug: true,
    userName: 'raspbeta',
    realName: 'rasp',
    autoRejoin: true,
    autoConnect: true,
});

// Function to track changes
function changeTracker() {
    const sql = 'SELECT number FROM changes';
    connection.query(sql, (error, results, fields) => {
        if (error) {
            bot.say("#AllianceNetworth", error);
            return;
        }

        results.forEach(result => {
            const num = result.number;

            // Query to get new networth and land
            let new_nw_query = 'SELECT networth, land, number, alive FROM alliance_ranks WHERE number=?';
            connection.query(new_nw_query, [num], (error, results, fields) => {
                if (error) {
                    bot.say("#AllianceNetworth", error);
                    return;
                }

                const new_nw = results[0].networth;
                const new_land = results[0].land;
                const aliveCountry = results[0].alive;

                // Query to get old networth and other details
                let old_nw_query = 'SELECT networth_change, name, number, land_change, tag, online, timeonline, timestamp, targets FROM changes WHERE number=?';
                connection.query(old_nw_query, [num], (error, results, fields) => {
                    if (error) {
                        bot.say("#AllianceNetworth", error);
                        return;
                    }

                    const countryName = results[0].name;
                    const countryTag = results[0].tag;
                    const targets = results[0].targets;
                    const countryNumber = results[0].number;
                    const oldNW = results[0].networth_change;
                    const oldLND = results[0].land_change;
                    const difference = new_nw - oldNW;

                    // Handle positive networth difference
                    if (difference > 0) {
                        bot.say("#AllianceNetworth", `\u000304 ENEMY #${countryNumber} (${countryTag}) \u000311 ${new_land}A \u000303 (${(new_land - oldLND).toLocaleString()}A) \u000f \u000309 Networth increased: \u000f ${oldNW.toLocaleString()} to ${new_nw.toLocaleString()} \u000303 (+${difference.toLocaleString()})`);

                        // Update timestamp and networth in database
                        const timeStampQuery = 'UPDATE changes SET timestamp=?, networth_change=?, land_change=?, cooldown=?, online=?, timeonline=? WHERE number=?';
                        const currentTime = Math.round(new Date().getTime() / 1000);
                        const inserts = [currentTime, new_nw, new_land, 0, 1, currentTime, countryNumber];
                        connection.query(timeStampQuery, inserts, (error, results, fields) => {
                            if (error) {
                                bot.say("#AllianceNetworth", error);
                            }
                        });
                    }

                    // Other conditions and updates can be added similarly
                });
            });
        });
    });
}

// Run change tracker every 30 seconds
setInterval(changeTracker, 30000);

