exports.type = 'command';
exports.name = 'Restart';
exports.calls = ['restazryt', 'restart']; // First string was a typo I accidentally made, kept for shits and giggles

exports.callback = (message, args) => {
    if (message.member.permissions.has(Discord.PermissionsBitField.Flags.Administrator)) {
        message.reply(restartCommandResponses[Math.floor(Math.random() * restartCommandResponses.length)]).then(msg => {
            process.exit();
        }).catch(console.error);
    } else {
        message.reply(restartCommandNoAccess);
    }
}