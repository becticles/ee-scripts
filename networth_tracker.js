const mysql = require('mysql');
const irc = require('irc');

// MySQL setup
const connection = mysql.createConnection({
    host: 'localhost',
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: 'alliance'
});

// IRC bot setup
const bot = new irc.Client('irc.scourge.se', 'networthbot', {
    channels: ['#AllianceNetworth hahanoperms'],
    debug: true,
    userName: 'raspnetworth',
    realName: 'Networth Tracker',
    autoRejoin: true,
    autoConnect: true,
});

function trackNetworth() {
    const currentTime = Math.round(Date.now() / 1000);

    connection.query('SELECT number FROM changes', (err, countryIds) => {
        if (err) {
            bot.say("#AllianceNetworth", err.toString());
            return;
        }

        countryIds.forEach(row => {
            const num = row.number;

            connection.query('SELECT networth, land FROM alliance_ranks WHERE number=?', [num], (err, newData) => {
                if (err || newData.length === 0) return;
                const { networth: newNW, land: newLand } = newData[0];

                connection.query('SELECT networth_change, land_change, tag FROM changes WHERE number=?', [num], (err, oldData) => {
                    if (err || oldData.length === 0) return;

                    const { networth_change: oldNW, land_change: oldLand, tag } = oldData[0];
                    const diffNW = newNW - oldNW;

                    if (diffNW > 0) {
                        bot.say("#AllianceNetworth",
                            `\u000304 ENEMY #${num} (${tag}) \u000311 ${newLand}A \u000303 (${(newLand - oldLand).toLocaleString()}A)` +
                            ` \u000f \u000309 Networth increased: \u000f ${oldNW.toLocaleString()} → ${newNW.toLocaleString()}` +
                            ` \u000303 (+${diffNW.toLocaleString()})`
                        );

                        connection.query(`
                            UPDATE changes
                            SET timestamp=?, networth_change=?, land_change=?
                            WHERE number=?`,
                            [currentTime, newNW, newLand, num]
                        );
                    }
                });
            });
        });
    });
}

setInterval(trackNetworth, 30000);

