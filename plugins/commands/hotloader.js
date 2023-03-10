exports.type = 'command';
exports.name = "Hotloader";
exports.calls = ['hotload', 'reload'];
exports.callback = (message, args) => {
    if (!message.member.permissions.has(Discord.PermissionsBitField.Flags.Administrator)) return;

    if (args.length === 0) {
        message.reply('You need to specify a plugin to reload!').catch(console.error);
        return;
    }

    plugin = args.join(' ');
    if (plugin === '*') {
        try {
            let reloaded = requireAll('./plugins');
            message.reply(`Reloaded **${reloaded.length}** plugins`).catch(console.error);
            refreshEvents();
        } catch (err) {
            message.reply(`An error occured while reloading plugins: \`\`\`\n${err.stack}\`\`\``).catch(console.error);
        }
    } else {
        let reloaded = false;
        for (let [file, plug] of plugins) {
            if (file === plugin || plug.name === plugin || plug.calls.includes(plugin)) {
                try {
                    if (plug.type === 'event')
                        client.removeListener(plug.event, plug.callback);

                    let reloaded = loadFile(file);
                    if (reloaded) {
                        if (reloaded.type === 'command') {
                            message.reply(`Reloaded command \`${reloaded.name}\``).catch(console.error);
                        } else if (reloaded.type === 'event') {
                            message.reply(`Reloaded event \`${reloaded.name}\``).catch(console.error);
                            client.on(reloaded.event, reloaded.callback);
                        }
                    } else {
                        message.reply(`${emotes.approve} Reloaded file, but had no structure.`).catch(console.error);
                    }
                } catch (err) {
                    message.reply(`An error occured while reloading \`${plug.name}\`: \`\`\`\n${err.stack}\`\`\``).catch(console.error);
                }
                reloaded = true;
                break;
            }
        }

        if (!reloaded) {
            try {
                let plug = loadFile(plugin);
                if (plug) {
                    if (plug.type === 'command') {
                        message.reply(`Loaded command \`${plug.name}\``).catch(console.error);
                    } else if (plug.type === 'event') {
                        message.reply(`Loaded event \`${plug.name}\``).catch(console.error);
                        client.on(plug.event, plug.callback);
                    }
                } else {
                    message.reply(`${emotes.approve} Loaded file, but had no structure.`).catch(console.error);
                }
            } catch (err) {
                message.reply(`An error occured while loading \`${plugin}\`: \`\`\`\n${err.stack}\`\`\``).catch(console.error);
            }
        }
    }
}