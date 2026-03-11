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
const bot = new irc.Client('irc.scourge.se', 'targetbot', {
    channels: ['#hire mercs4life'],
    debug: true,
    userName: 'rasptarget',
    realName: 'Target Tracker',
    autoRejoin: true,
    autoConnect: true,
});

const formatTargetList = (arr) => [...new Set(arr.map(t => t.trim()).filter(Boolean))];
let lastRecentCount = 0;

function trackTargets() {
    const currentTime = Math.round(Date.now() / 1000);
    let recentTargets = [];

    connection.query('SELECT number FROM changes', (err, countryIds) => {
        if (err) {
            bot.say("#hire", err.toString());
            return;
        }

        countryIds.forEach(row => {
            const num = row.number;

            connection.query('SELECT online, alive, timeonline, timestamp, targets FROM changes WHERE number=?', [num], (err, oldData) => {
                if (err || oldData.length === 0) return;

                const { online, alive, timeonline, timestamp, targets } = oldData[0];

                const diffTimeMin = ((currentTime - timeonline) / 60).toFixed(2);
                const diffSinceChangeMin = ((currentTime - timestamp) / 60).toFixed(2);

                if (online > 0 && alive > 0 && diffSinceChangeMin <= 60 && targets) {
                    const targetList = targets.split(',').map(t => t.trim()).filter(Boolean);
                    targetList.forEach(t => recentTargets.push(t));
                }
            });
        });

        setTimeout(() => {
            const dedupedRecent = Array.from(new Set(recentTargets));
            const recentCountNow = dedupedRecent.length;

            if (recentCountNow > 0 && recentCountNow !== lastRecentCount) {
                bot.say("#hire", `\u000304 ${recentCountNow} Possibly Online in last 60 min: \u000307 #${dedupedRecent.join(', #')}`);
                lastRecentCount = recentCountNow;
            }
        }, 1000);
    });
}

setInterval(trackTargets, 30000);

