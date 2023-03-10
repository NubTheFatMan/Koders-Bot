exports.type = 'command';
exports.name = 'Restart';
exports.calls = ['restazryt', 'restart'];

let responses = [
    "You're really busting my balls over here <:no:773607864601411584>",
    "Please end my suffering and just run the stop command <:sadPepe:773607863779852318>",
    "Leave me alone <:stopp:1041623419013300265>"
];

exports.callback = (message, args) => {
    if (message.member.permissions.has(Discord.PermissionsBitField.Flags.Administrator)) {
        message.reply(responses[Math.floor(Math.random() * responses.length)]).then(msg => {
            process.exit();
        }).catch(console.error);
    } else {
        message.reply("If only you could do that <:tbhfam:780678139520352286>");
    }
}