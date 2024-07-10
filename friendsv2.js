const mysql = require('mysql');
const irc = require('irc');

const connection = mysql.createConnection({
    host: 'localhost',
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: 'alliance'
});

const bot = new irc.Client('irc.scourge.se', 'friendtracker', {
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
    const sql = 'SELECT number FROM friends';
    connection.query(mysql.format(sql), function(error, results) {
        if (error) {
            bot.say("#AllianceNetworth", error);
            return;
        }
        for (let i = 0; i < results.length; i++) {
            const num = results[i].number;
            const newNwQuery = 'SELECT networth, number, land, tag, alive FROM alliance_ranks WHERE number=?';
            connection.query(mysql.format(newNwQuery, [num]), function(error, results) {
                if (error) {
                    bot.say("#AllianceNetworth", error);
                    return;
                }
                const { networth: newNw, land: newLand, number, alive } = results[0];
                const oldNwQuery = 'SELECT networth_change, name, number, land_change, tag, online, timeonline, onlinecount, timestamp, targets FROM friends WHERE number=?';
                connection.query(mysql.format(oldNwQuery, [num]), function(error, results) {
                    if (error) {
                        bot.say("#AllianceNetworth", error);
                        return;
                    }
                    const { name: countryName, tag: countryTag, targets, number: countryNumber, networth_change: oldNW, land_change: oldLND, timestamp: getTimeStamp, online, timeonline, onlinecount } = results[0];
                    const difference = newNw - oldNW;
                    const differenceLND = newLand - oldLND;
                    const time = new Date();
                    const seconds = Math.round(time.getTime() / 1000);
                    const tenMinuteStamp = getTimeStamp + 360;

                    if (difference > 0) {
                        bot.say("#AllianceNetworth", `\x0309 FRIEND #${countryNumber} (${countryTag}) \x0311 ${newLand}A \x0303 (${differenceLND.toLocaleString()}A) \x0f \x0309 Networth increased: \x0f ${oldNW.toLocaleString()} to ${newNw.toLocaleString()} \x0303 (+${difference.toLocaleString()})`);
                        const timeStampUpdate = 'UPDATE friends SET timestamp=?, networth_change=?, land_change=?, cooldown=?, online=?, timeonline=? WHERE number=?';
                        connection.query(mysql.format(timeStampUpdate, [seconds, newNw, newLand, 0, 1, seconds, countryNumber]), function(error) {
                            if (error) {
                                bot.say("#AllianceNetworth", error);
                            }
                        });
                    } else if (difference <= -10000) {
                        connection.query(mysql.format('SELECT timestamp FROM friends WHERE number=?', [countryNumber]), function(error, results) {
                            if (error) {
                                bot.say("#AllianceNetworth", error);
                                return;
                            }
                            const getTimeStamp = results[0].timestamp;
                            const tenMinuteStamp = getTimeStamp + 360;
                            const currentTime = Math.round(new Date().getTime() / 1000);

                            if (currentTime >= tenMinuteStamp) {
                                bot.say("#AllianceNetworth", `\x0309 FRIEND ${countryName} #${countryNumber} (${countryTag}) \x0308 ${newLand}A \x0304 (${differenceLND.toLocaleString()}A) \x0f \x0307 Networth dropped: \x0f ${oldNW.toLocaleString()} to ${newNw.toLocaleString()} \x0304 (${difference.toLocaleString()})`);
                                const timeStampUpdate = 'UPDATE friends SET timestamp=?, networth_change=?, land_change=?, cooldown=? WHERE number=?';
                                connection.query(mysql.format(timeStampUpdate, [currentTime, newNw, newLand, 1, countryNumber]), function(error) {
                                    if (error) {
                                        bot.say("#AllianceNetworth", error);
                                    }
                                });
                            }
                        });
                    }
                });
            });
        }
    });
}

setInterval(changeTracker, 30000);
