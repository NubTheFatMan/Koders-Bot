exports.type = 'command';
exports.name = 'Ping';
exports.calls = ['ping', 'pong'];

exports.commandObject = {
    name: "ping",
    description: "Check the response time of the bot"
}

exports.callback = (message, args) => {
    message.reply('Ponging...').then(msg => {
        let totalDif = msg.createdTimestamp - message.createdTimestamp;
        let ping = client.ws.ping;
        msg.edit(`Pong! Took **${totalDif}ms** to respond.\nLatency to Discord servers is **${ping}ms**\nTime to process command: **${totalDif - ping}ms**`).catch(console.error);
    }).catch(console.error);
}

exports.interactionCallback = interaction => {
    interaction.reply(`Pong! Discord API response time: **${client.ws.ping}**ms`);
}