const mysql = require('mysql');
const irc = require('irc');

// MySQL connection setup
const connection = mysql.createConnection({
    host: 'localhost',
    user: process.env.MYSQL_USER,
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

// Utility to format targets
const formatTargetList = (arr) => [...new Set(arr.map(t => t.trim()).filter(Boolean))];
let lastOnlineCount = 0;

// Main change tracker
function changeTracker() {
    const currentTime = Math.round(Date.now() / 1000);
    let activeNowCount = 0, recentCount = 0;
    let activeNowTargets = [], recentTargets = [];
    let onlineSummaryPosted = false;

    connection.query('SELECT number FROM changes', (err, countryIds) => {
        if (err) {
            bot.say("#AllianceNetworth", err.toString());
            return;
        }

        countryIds.forEach((row, index) => {
            const num = row.number;

            connection.query('SELECT networth, land, alive FROM alliance_ranks WHERE number=?', [num], (err, newData) => {
                if (err || newData.length === 0) return;
                const { networth: newNW, land: newLand, alive: aliveCountry } = newData[0];

                connection.query(`
                    SELECT networth_change, name, number, land_change, tag, online, timeonline, timestamp, targets, onlinecount
                    FROM changes WHERE number=?`, [num], (err, oldData) => {
                    if (err || oldData.length === 0) return;

                    const row = oldData[0];
                    const {
                        networth_change: oldNW,
                        land_change: oldLand,
                        name,
                        number: countryNumber,
                        tag,
                        online: isOnline,
                        timeonline,
                        timestamp,
                        targets,
                        onlinecount
                    } = row;

                    const diffNW = newNW - oldNW;
                    const diffTimeMin = ((currentTime - timeonline) / 60).toFixed(2);
                    const diffSinceChangeMin = ((currentTime - timestamp) / 60).toFixed(2);

                    // Networth Change Alert
                    if (diffNW > 0) {
                        bot.say("#AllianceNetworth",
                            `\u000304 ENEMY #${countryNumber} (${tag}) \u000311 ${newLand}A \u000303 (${(newLand - oldLand).toLocaleString()}A)` +
                            ` \u000f \u000309 Networth increased: \u000f ${oldNW.toLocaleString()} → ${newNW.toLocaleString()}` +
                            ` \u000303 (+${diffNW.toLocaleString()})`
                        );

                        connection.query(`
                            UPDATE changes 
                            SET timestamp=?, networth_change=?, land_change=?, cooldown=?, online=?, timeonline=? 
                            WHERE number=?`,
                            [currentTime, newNW, newLand, 0, 1, currentTime, countryNumber]
                        );
                    }

                    // Currently Online (<= 0.4 mins)
                    if (isOnline && aliveCountry > 0 && diffTimeMin <= 0.4) {
                        bot.say("#hire", `${name} \u000307 #${countryNumber} (${tag}) \u000304 Active ${diffTimeMin} mins ago`);
                        connection.query('UPDATE changes SET timestamp=? WHERE number=?', [currentTime, countryNumber]);

                        if (targets) {
    const targetList = targets.split(',').map(t => t.trim()).filter(Boolean);
    activeNowTargets.push(...targetList.map(t => `${t}|${tag}`));
    activeNowCount += targetList.length;
}
                    }

                    // Changed Networth in Last 60 mins
                    if (isOnline && aliveCountry > 0 && diffSinceChangeMin <= 60) {
                        if (targets) {
    const targetList = targets.split(',').map(t => t.trim()).filter(Boolean);
    recentTargets.push(...targetList.map(t => `${t}|${tag}`));
    recentCount += targetList.length;
}
                    }

                    // Post onlinecount + targets summary only if onlinecount changed
                    if (!onlineSummaryPosted && onlinecount > 0 && targets && onlinecount !== lastOnlineCount) {
                        const summaryTargets = formatTargetList(targets.split(',').map(t => t.trim()));
                        if (summaryTargets.length > 0) {
                            bot.say("#hire", `\u000304 ${onlinecount} Possibly Online: \u000307 ${summaryTargets.join(', ')}`);
                            lastOnlineCount = onlinecount;
                            onlineSummaryPosted = true;
                        }
                    }

                    // Final summary with breakdown by target and tag
                    if (index === countryIds.length - 1) {
                        const formatTaggedList = (list) => {
                            const grouped = {};
                            list.forEach(entry => {
                                const [id, tag] = entry.split('|');
                                if (!grouped[tag]) grouped[tag] = [];
                                grouped[tag].push(`#${id}`);
                            });
                            return Object.entries(grouped)
                                .map(([tag, ids]) => `07 [${tag}]: ${ids.join(', ')}`)
                                .join('  ');
                        };

                        const nowList = formatTargetList(activeNowTargets);
                        const recentList = formatTargetList(recentTargets);

                        if (nowList.length > 0) {
                            bot.say("#hire", `04 ${nowList.length} Possibly Online: ${formatTaggedList(activeNowTargets)}`);
                        }

                        if (recentList.length > 0) {
                            bot.say("#hire", `04 ${recentList.length} Possibly Online in last 60 min: ${formatTaggedList(recentTargets)}`);
                        }
                                                            }
                });
            });
        });
    });
    });
    });
            });
        });
    });
}

// Run every 30 seconds
setInterval(changeTracker, 30000);


