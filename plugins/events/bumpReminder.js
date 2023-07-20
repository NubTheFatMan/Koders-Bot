exports.type = 'event';
exports.name = 'Bump Reminders';
exports.event = 'messageCreate';

let bumpFile = process.cwd() + '/userdata/nextBumpMessage.txt';

let nextBumpTimestamp = 0;
let initialBumpReminder = false; // True sends the first "needs bump" message, false sends the "still needs bump" alternate method
try {
    let contents = fs.readFileSync(bumpFile);
    if (contents === '0') {
        nextBumpTimestamp = 0;
    } else {
        nextBumpTimestamp = Number(contents.slice(1));
        let reminderType = contents[0];
        switch(reminderType) {
            case "b":
                initialBumpReminder = true;
            break;
            
            case "r":
                initialBumpReminder = false;
            break;
        }
    }
} catch (err) {
    nextBumpTimestamp = 0;
    initialBumpReminder = false;
}

exports.callback = message => {
    if (message.author.id !== disboardId || client.user.id !== liveClientId)
        return;
    
    if (!message.embeds)
        return;

    let embed = message.embeds[0];
    if (embed?.description?.includes('Bump done!')) {
        let linked = nextBumpTimestamp == 0;
        nextBumpTimestamp = message.createdTimestamp + (60_000 * 120) + 5000; // +5 seconds for latency compensation
        initialBumpReminder = true;
        fs.writeFileSync(bumpFile, 'b' + nextBumpTimestamp.toString());
        message.react(bumpedReaction);

        if (linked)
            message.reply('Bump reminders linked!');
    }
}

let bumpChannel;
setInterval(async () => {
    if (!client.isReady() || client.user.id !== liveClientId)
        return; 
    
    if (nextBumpTimestamp !== 0 && Date.now() >= nextBumpTimestamp) {
        try {
            if (!bumpChannel)
                bumpChannel = await client.guilds.cache.first().channels.fetch(bumpChannelId);

            if (bumpChannel) {
                if (initialBumpReminder) 
                    bumpChannel.send(`<@&${bumpRoleId}> it's time to </bump:947088344167366698> the server again!`);
                else 
                    bumpChannel.send(`<@&${bumpRoleId}> the server still needs </bump:947088344167366698>ed!`);
                
                initialBumpReminder = false;
                nextBumpTimestamp += 60_000 * 60;
                fs.writeFileSync(bumpFile, 'r' + nextBumpTimestamp.toString());
            }
        } catch(err) {
            nextBumpTimestamp = 0;
            fs.writeFileSync(bumpFile, '0');
            messageDevs(`Error with bump reminder:\`\`\`\n${err.stack}\`\`\``);

            if (bumpChannel)
                bumpChannel.send('Error occured in bump reminder system, now unlinked.');
        } 
    }
}, 5000)