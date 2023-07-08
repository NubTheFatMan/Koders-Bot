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
    if (!plugin.name) plugin.name = file;
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

global.isRestarting = false;
global.kodersRestart = () => {
    isRestarting = true;
}

process.on('unhandledRejection', (reason, promise) => {
    messageDevs(`A promise wasn't handled with a \`.catch()\`.\`\`\`\n${reason.stack}\`\`\``);
});
process.on('uncaughtException', (error, origin) => {
    // Since an error occured, send a message to the dev channel and 
    // safely save all files before actually terminating the process (preventing corrupting any .json mid-save)

    // Used to make sure a message is sent to the dev channel at least before a restart
    let devMessagePromise = messageDevs(`An exception wasn't caught. Since part of the bot may be corrupted, saving all json files and restarting.`);
    if (devMessagePromise) {
        devMessagePromise.then(kodersRestart)
    } else {
        kodersRestart();
    }
});