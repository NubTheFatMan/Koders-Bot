exports.type = 'event';
exports.name = 'Bump Reminders';
exports.event = 'messageCreate';

let disboardId = '302050872383242240';
let bumpedReaction = '⏱️';
let bumpRoleId = '1081036398775250975';
let bumpChannelId = '771528387650125855';

let bumpFile = process.cwd() + '/userdata/nextBumpMessage.txt';

let nextBumpTimestamp = 0;
try {
    nextBumpTimestamp = Number(fs.readFileSync(bumpFile));
} catch (err) {
    nextBumpTimestamp = 0;
}

exports.callback = message => {
    if (message.author.id !== disboardId)
        return;
    
    if (!message.embeds)
        return;
    
    if (message.embeds[0].content.includes('Bump done!')) {
        nextBumpTimestamp = message.createdTimestamp + (60_000 * 120);
        fs.writeFileSync(bumpFile, nextBumpTimestamp.toString());
        message.react(bumpedReaction);
    }
}

let bumpChannel;
setInterval(async () => {
    if (!client.isReady())
        return; 
    
    if (nextBumpTimestamp !== 0 && Date.now() >= nextBumpTimestamp) {
        try {
            if (!bumpChannel)
                bumpChannel = await client.guilds.cache.first().channels.fetch(bumpChannelId);
            if (bumpChannel)
                bumpChannel.send(`<@&${bumpRoleId}> it's time to bump the server again!`);
        } finally {}
        
        nextBumpTimestamp = 0;
        fs.writeFileSync(bumpFile, nextBumpTimestamp.toString());
    }
}, 5000)