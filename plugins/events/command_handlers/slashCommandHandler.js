exports.type = "event";
exports.name = "Slash Command Handler";
exports.event = "interactionCreate";

exports.callback = interaction => {
    let found = false;
    if (interaction.isCommand()) {
        let command = slashCommands.get(interaction.commandName);
        if (command) {
            found = true;
            command.interactionCallback(interaction);
        }
    }

    if (!found) {
        interaction.reply('Uh oh! I failed to find a set if instructions for the command you tried to run.');
    }
}