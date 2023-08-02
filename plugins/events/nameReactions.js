exports.type = "event";
exports.name = "Name Reactions";
exports.event = "messageCreate";

// <:kaching:1135966356580352060> 
// <:fuckboi:1135966358455201864> 
// <:bitinglipmmm:1099133287202553906> 
// <:joeShh:1135966344500744282> 
// <:madcat:1135966355032653987>

exports.storageFile = process.cwd() + '/userdata/nameReactions.json';

// Format:
// {
//     names: ["name1", "name2"],
//     reactions: {
//         name1: ["emoteID", "🗿"],
//         name2: ["emoteID", "🗿"],
//     }
// }
exports.namesManager = JSON.parse(fs.readFileSync(this.storageFile));

exports.callback = message => {
    let cleanContentLowerCase = message.cleanContent.toLowerCase();
    let toReactWith;
    for (let i = 0; i < this.namesManager.names.length; i++) {
        let name = this.namesManager.names[i];
        if (cleanContentLowerCase.includes(name)) {
            toReactWith = this.namesManager.reactions[name];
            break;
        }
    }

    if (toReactWith instanceof Array) {
        message.react(toReactWith[Math.floor(Math.random() * toReactWith.length)]);
    }
}

exports.subPlugins = [
    {
        type: "command",
        name: "Set Name Reaction",
        calls: ["setnamereaction", "snr", "namereact"],
        callback: (message, args) => {
            if (!message.member.permissions.has(Discord.PermissionsBitField.Flags.Administrator))
                return message.reply("You must be administrator to use this.");

            if (args.length < 2) 
                return message.reply("You must specify at least 2 arguments, a name and at least one emoji");

            let name = args.shift();
            if (!this.namesManager.names.includes(name))
                this.namesManager.names.push(name);

            let reactions = [];
            for (let i = 0; i < args.length; i++) {
                let arg = args[i];
                let id = arg.match(/[0-9]+/);
                if (id) 
                    reactions.push(id[0]);
                else
                    reactions.push(arg);
            }

            this.namesManager.reactions[name] = reactions;
            fs.writeFileSync(this.storageFile, JSON.stringify(this.namesManager));
            message.reply(`Reactions **set** for the name "${name}"`);
        }
    },
    {
        type: "command",
        name: "Remove Name Reaction",
        calls: ["removenamereaction", "rnr"],
        callback: (message, args) => {
            if (!message.member.permissions.has(Discord.PermissionsBitField.Flags.Administrator))
                return message.reply("You must be administrator to use this.");

            if (args.length < 1) 
                return message.reply("You must specify the name.");

            let name = args.shift();
            if (this.namesManager.names.includes(name)) {
                this.namesManager.names.splice(this.namesManager.names.indexOf(name), 1);
                delete this.namesManager.reactions[name];
                fs.writeFileSync(this.storageFile, JSON.stringify(this.namesManager));
                message.reply(`Reactions **removed** for the name "${name}"`);
            } else {
                message.reply("No name to remove reactions for.");
            }
        }
    }
]