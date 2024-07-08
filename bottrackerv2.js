const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'brian',
    password: process.env.MYSQL_PASSWORD,
    database: 'alliance'
});

const irc = require('irc');
const bot = new irc.Client('irc.scourge.se', 'bottracker', {
    channels: ['#AllianceNetworth hahanoperms'],
    debug: true,
    userName: 'bottracker',
    realName: 'rasp',
    autoRejoin: true,
    autoConnect: true,
});

connection.connect(function(err) {
    if (err) {
        bot.say("#AllianceNetworth", "error connecting: " + err.stack);
        return;
    }
});

function changeTracker() {
    const sql = 'SELECT number FROM bots';
    connection.query(sql, function(error, results, fields) {
        if (error) {
            bot.say("#AllianceNetworth", error);
            return;
        }

        // Loop through each result
        results.forEach(function(result) {
            const num = result.number;

            // Query to get new networth and land
            const new_nw_query = 'SELECT networth, number, land, tag, alive FROM alliance_ranks WHERE number=?';
            const inserts = [num];
            const new_nw_sql = mysql.format(new_nw_query, inserts);

            connection.query(new_nw_sql, function(error, new_nw_results, fields) {
                if (error) {
                    bot.say("#AllianceNetworth", error);
                    return;
                }

                const new_nw = new_nw_results[0].networth;
                const new_land = new_nw_results[0].land;
                const aliveCountry = new_nw_results[0].alive;

                // Query to get old networth and land changes
                const old_nw_query = 'SELECT networth_change, name, number, land_change, tag, online, timeonline, onlinecount, timestamp, targets, strat FROM bots WHERE number=?';
                const old_nw_sql = mysql.format(old_nw_query, inserts);

                connection.query(old_nw_sql, function(error, old_nw_results, fields) {
                    if (error) {
                        bot.say("#AllianceNetworth", error);
                        return;
                    }

                    const countryName = old_nw_results[0].name;
                    const countryTag = old_nw_results[0].tag;
                    const targets = old_nw_results[0].targets;
                    const countryNumber = old_nw_results[0].number;
                    const oldNW = old_nw_results[0].networth_change;
                    const oldLND = old_nw_results[0].land_change;
                    const strat = old_nw_results[0].strat;

                    const difference = new_nw - oldNW;
                    const differenceLND = new_land - oldLND;

                    // Time related calculations
                    const getTimeStamp = old_nw_results[0].timestamp;
                    const tenMinuteStamp = getTimeStamp + 360;
                    const time = new Date();
                    const seconds = Math.round(time.getTime() / 1000);
                    const onlineCountry = old_nw_results[0].online;
                    const onlineCount = old_nw_results[0].onlinecount;
                    const timeOnline = old_nw_results[0].timeonline;
                    const tStamp = old_nw_results[0].timestamp;
                    const differenceTME = (tStamp - timeOnline) / 60;

                    // Handle networth increase
                    if (difference > 0) {
                        bot.say("#AllianceNetworth", `\u000315 ${strat} BOT | #${countryNumber} (${countryTag}) \u000311 ${new_land}A \u000303 (${differenceLND.toLocaleString()}A) \u000f \u000309 Networth increased: \u000f ${oldNW.toLocaleString()} to ${new_nw.toLocaleString()} (+${difference.toLocaleString()})`);
                        const timeStampUpdate = 'UPDATE bots SET timestamp=?, networth_change=?, land_change=?, cooldown=?, online=?, timeonline=? WHERE number=?';
                        const updateInserts = [seconds, new_nw, new_land, 0, 1, seconds, countryNumber];
                        const timeStampQuery = mysql.format(timeStampUpdate, updateInserts);

                        connection.query(timeStampQuery, function(error, updateResults, fields) {
                            if (error) {
                                bot.say("#AllianceNetworth", error);
                            }
                        });
                    }

                    // Handle networth decrease
                    if (difference <= -10000) {
                        const hasTimeStampQuery = 'SELECT timestamp FROM bots WHERE number=?';
                        const hasTimeStampInserts = [countryNumber];
                        const hasTimeStampSql = mysql.format(hasTimeStampQuery, hasTimeStampInserts);

                        connection.query(hasTimeStampSql, function(error, hasTimeStampResults, fields) {
                            if (error) {
                                bot.say("#AllianceNetworth", error);
                                return;
                            }

                            const getTimeStamp = hasTimeStampResults[0].timestamp;
                            const tenMinuteStamp = getTimeStamp + 360;
                            const time = new Date();
                            const seconds = Math.round(time.getTime() / 1000);

                            if (seconds >= tenMinuteStamp) {
                                if (getTimeStamp <= tenMinuteStamp) {
                                    bot.say("#AllianceNetworth", `\u000315 ${strat} BOT | ${countryName} #${countryNumber} (${countryTag}) \u000308 ${new_land}A \u000304 (${differenceLND.toLocaleString()}A) \u000f \u000307 Networth dropped: \u000f ${oldNW.toLocaleString()} to ${new_nw.toLocaleString()} (${difference.toLocaleString()})`);

                                    const timeStampUpdate = 'UPDATE bots SET timestamp=?, networth_change=?, land_change=?, cooldown=? WHERE number=?';
                                    const updateInserts = [seconds, new_nw, new_land, 1, countryNumber];
                                    const timeStampQuery = mysql.format(timeStampUpdate, updateInserts);

                                    connection.query(timeStampQuery, function(error, updateResults, fields) {
                                        if (error) {
                                            bot.say("#AllianceNetworth", error);
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            });
        });
    });
}

setInterval(changeTracker, 30000);

