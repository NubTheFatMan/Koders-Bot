global.Stopwatch = require('@sapphire/stopwatch').Stopwatch;

global.startWatch = new Stopwatch();
global.initTime = null;

global.Discord = require('discord.js');
global.fs      = require('fs');

require('dotenv').config();

let intents = Discord.GatewayIntentBits;
global.client = new Discord.Client({
    intents: [
        intents.Guilds,
        intents.GuildMembers,
        intents.GuildBans,
        intents.GuildMessages,
        intents.GuildMessageReactions,
        intents.MessageContent
    ]
});

global.commands = new Map();
global.slashCommands = new Map();
global.eventHandlers = new Map();
global.plugins = new Map();

global.loadFile = file => {
    if (require.cache[require.resolve(file)]) {
        delete require.cache[require.resolve(file)];
    }

    let plugin = require(file);
    if (plugin.type === 'command') {
        if (plugin.calls instanceof Array && plugin.callback) {
            commands.set(plugin.name, plugin);
        }

        if (plugin.commandObject?.name && plugin.interactionCallback) {
            slashCommands.set(plugin.commandObject.name, plugin);
        }
    } else if (plugin.type === 'event') {
        plugin.file = file;
        eventHandlers.set(plugin.name, plugin);
    }
    plugins.set(file, plugin);

    return plugin;
}

global.requireAll = dir => {
    let plugins = [];
    fs.readdirSync(dir).forEach(file => {
        let path = dir + '/' + file;
        if (fs.statSync(path).isDirectory()) {
            plugins.push(...requireAll(path));
        } else {
            if (path.endsWith('.js')) {
                plugins.push(loadFile(path));
            }
        }
    });
    return plugins;
}

require('./vars.js'); // This takes priority before any plugins

requireAll('./plugins');

refreshEvents();

client.login();