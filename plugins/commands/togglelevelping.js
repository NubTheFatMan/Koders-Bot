exports.type = "command";
exports.name = "Toggle Levelup Ping";
exports.calls = ['tlp', 'togglelevelping', 'togglelevelupping'];

exports.callback = (message, args) => {
    let userLevel = userLevels.get(message.member.id);
    if (!userLevel) {
        userLevel = Object.assign({}, blankLevel);
        userLevels.set(message.member.id, userLevel);
    }

    userLevel.wantsPing = !userLevel.wantsPing;
    message.reply(userLevel.wantsPing ? 'You will now be pinged when you level up in the future.' : 'You will no longer be pinged for leveling up in the future.');

    let id = message.member.id;
    fs.writeFile(`${levelsDirectory}/${id}.json`, JSON.stringify(userLevel), error => {
        if (error) messageDevs(`Unable to save **${id}.json** (<@${id}>): \`${error}\``);
    });
}

exports.commandObject = {
    name: "toggle-level-ping",
    description: "Toggle receiving notifications when you level up."
}

exports.interactionCallback = interaction => {
    let userLevel = userLevels.get(interaction.member.id);
    if (!userLevel) {
        userLevel = Object.assign({}, blankLevel);
        userLevels.set(interaction.member.id, userLevel);
    }

    userLevel.wantsPing = !userLevel.wantsPing;
    interaction.reply(userLevel.wantsPing ? 'You will now be pinged when you level up in the future.' : 'You will no longer be pinged for leveling up in the future.');

    let id = interaction.member.id;
    fs.writeFile(`${levelsDirectory}/${id}.json`, JSON.stringify(userLevel), error => {
        if (error) messageDevs(`Unable to save **${id}.json** (<@${id}>): \`${error}\``);
    });
}