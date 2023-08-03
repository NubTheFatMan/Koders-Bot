exports.type = 'command';
exports.name = "Hotloader";
exports.calls = ['hotload', 'reload'];

exports.unloadPlugin = pluginObject => {
    if (!(pluginObject instanceof Object))
        throw new Error("Invalid plugin.");

    if (typeof pluginObject.event === "string" && pluginObject.callback instanceof Function) 
        client.removeListener(pluginObject.event, pluginObject.callback);

    let name = pluginObject.name;
    commands.delete(name);
    slashCommands.delete(name);
    eventHandlers.delete(name);

    if (pluginObject.subPlugins instanceof Array) {
        for (let i = 0; i < pluginObject.subPlugins.length; i++) {
            this.unloadPlugin(pluginObject.subPlugins[i]);
        }
    }

    if (pluginObject.file) {
        try {
            let requireResolved = require.resolve(pluginObject.file);
            if (require.cache[requireResolved]) {
                delete require.cache[requireResolved];
            }
        } catch (err) {}
    }

    plugins.delete(name);
}

exports.loadPlugin = file => {
    let newPlugin = loadFile(file);

    switch (newPlugin.type) {
        case "command": {
            if (newPlugin.commandObject instanceof Object && newPlugin.interactionCallback instanceof Function) 
                client.application.commands.set(calculateSlashCommandsArray());
        } break;

        case "event": {
            if (typeof newPlugin.event === "string" && newPlugin.callback instanceof Function)
                client.on(newPlugin.event, newPlugin.callback);
        }
    }

    return newPlugin;
}

exports.reloadPlugin = pluginObject => {
    if (!(pluginObject instanceof Object))
        throw new Error("Invalid plugin.");

    let pluginFile = pluginObject.file;
    this.unloadPlugin(pluginObject);

    this.loadPlugin(pluginFile);
}

exports.callback = (message, args) => {
    if (!message.member.permissions.has(Discord.PermissionsBitField.Flags.Administrator)) return;

    if (args.length === 0) {
        message.reply('You need to specify a plugin to reload!').catch(console.error);
        return;
    }

    let target = args.join(' ');
    let reloaded = false;
    try {
        for (let [name, plugin] of plugins) {
            if (target === name || target === plugin.file || (plugin.calls instanceof Array && plugin.calls.includes(target))) {
                this.reloadPlugin(plugin);
                reloaded = true;
                break;
            }
        }
    } catch (error) {
        return message.reply(`Failed to reload **${target}**:\`\`\`\n${error.stack}\`\`\``);
    }

    if (!reloaded) {
        try {
            this.loadPlugin(target);
            reloaded = true;
        } catch (error) {
            return message.reply(`Failed to reload **${target}**:\`\`\`\n${error.stack}\`\`\``);
        }
    }

    message.reply(reloaded ? `Reloaded **${target}**` : `Unable to reload **${target}**`);
    client.application.commands.set(calculateSlashCommandsArray());
}