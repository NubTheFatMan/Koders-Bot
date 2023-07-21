console.log("Initializing...");

global.Stopwatch = require('@sapphire/stopwatch').Stopwatch;

global.startWatch = new Stopwatch();
global.initTime = null;

global.Discord = require('discord.js');
global.fs      = require('fs');

require('dotenv').config();
console.log("NPM dependencies loaded and .env loaded.");

// This is highly *NOT* recommended, however I'm not going to sit around and wait for djs to fix their code
Discord.User.prototype.__Koders_InjectPatch = Discord.User.prototype._patch;
Discord.User.prototype._patch = function (data) {
    this.__Koders_InjectPatch(data);

    if ('global_name' in data) {
        this.globalName = data.global_name;
    } else {
        this.globalName ??= null;
    }
}
Object.defineProperty(Discord.User.prototype, "displayName", {
    get: function displayName() {return this.globalName ?? this.username;}
});
Object.defineProperty(Discord.GuildMember.prototype, "displayName", {
    get: function displayName() {return this.nickname ?? this.user.displayName;}
});
console.log('Injected discord user display name fix into discord.js 🗿');

let intents = Discord.GatewayIntentBits;
global.client = new Discord.Client({
    intents: [
        intents.Guilds,
        intents.GuildMembers,
        intents.GuildBans,
        intents.GuildMessages,
        intents.GuildMessageReactions,
        intents.GuildModeration,
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

    console.log(`Requiring file: ${file}`);
    let plugin = require(file);
    plugin.file = file;
    if (!plugin.name) plugin.name = file;
    if (plugin.type === 'command') {
        if (plugin.calls instanceof Array && plugin.callback) {
            commands.set(plugin.name, plugin);
        }

        if (plugin.commandObject?.name && plugin.interactionCallback) {
            slashCommands.set(plugin.commandObject.name, plugin);
        }
    } else if (plugin.type === 'event') {
        eventHandlers.set(plugin.name, plugin);
    }

    if (plugin.events instanceof Array) {
        for (let i = 0; i < plugin.events.length; i++) {
            let ev = plugin.events[i];
            if (typeof ev.event == "string" && ev.callback instanceof Function) {
                eventHandlers.set(`${plugin.name}.event.${ev.event}.${i}`, ev);
            }
        }
    }

    plugins.set(plugin.name, plugin);

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
console.log('Loaded vars.js')

console.log('Loading plugin files...');
requireAll('./plugins');
console.log('Plugin files loaded.');

refreshEvents();
console.log("Event listers are listening.");

client.login();
console.log("Logging in client...");

global.isRestarting = false;
global.kodersRestart = () => {
    isRestarting = true;
}

process.on('unhandledRejection', (reason, promise) => {
    messageDevs(`A promise wasn't handled with a \`.catch()\`.\`\`\`\n${reason.stack}\`\`\``);
    console.error(reason);
});
process.on('uncaughtException', (error, origin) => {
    // Since an error occured, send a message to the dev channel and 
    // safely save all files before actually terminating the process (preventing corrupting any .json mid-save)
    console.error(error);

    // Used to make sure a message is sent to the dev channel at least before a restart
    let devMessagePromise = messageDevs(`An exception wasn't caught. Since part of the bot may be corrupted, saving all json files and restarting.\`\`\`\n${error.stack}\`\`\``);
    if (devMessagePromise) {
        devMessagePromise.then(kodersRestart)
    } else {
        kodersRestart();
    }
});