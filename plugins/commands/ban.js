exports.type = "command";
exports.name = "Ban";

global.bansDirectory = process.cwd() + '/userdata/bans'

class Ban {
    constructor(memberOrId, options = {}) {
        let isGuildMember = memberOrId instanceof Discord.GuildMember;
        let isString      = typeof memberOrId === "string";

        if (!isGuildMember && !isString)
            throw new Error("Bad target, must be a GuildMember or string ID (snowflake), got " + memberOrId.__proto__.constructor.name);

        if (typeof options !== "object")
            throw new Error("Bad options, expected an Object {}, got " + options.__proto__.constructor.name)

        this.memberId = null;
        if (isGuildMember) {
            this.memberId = memberOrId.id;
        } else if (isString) {
            if (Number(memberOrId) != memberOrId)
                throw new Error("Bad target, must be a string of numbers");

            this.memberId = memberOrId;
        }

        if (!this.memberId)
            throw new Error("Bad target, unable to fetch an ID.");

        this.reason = typeof options?.reason === "string" ? options.reason : null;

        this.createdTimestamp = typeof options?.createdTimestamp === "number" ? options.createdTimestamp : Date.now();
        this.unbanTimestamp = typeof options?.unbanTimestamp === "number" 
            ? options.unbanTimestamp 
            : typeof options?.duration === "number" 
                ? this.createdTimestamp + options.duration 
                : NaN;

        this.caseNumber = typeof options?.caseNumber === "number" ? options.caseNumber : null; 
        if (this.caseNumber === null) {
            // To be implemented later
            
        }
    }

    get duration() {
        if (!Number.isFinite(this.unbanTimestamp))
            return NaN;

        return this.unbanTimestamp - this.createdTimestamp;
    }
    set duration(value) {
        if (typeof value !== "number")
            throw new Error("Bad duration, expected a number but got " + value.__proto__.constructor.name);
        
        this.unbanTimestamp = this.createdTimestamp + value;
    }

    toString() {
        return JSON.stringify(this);
    }

    saveEntry() {
        this.constructor.entries.set(this.memberId, this);

        if (Number.isFinite(this.unbanTimestamp)) {
            this.constructor.automaticUnbans.set(this.memberId, this);
        } else if (this.constructor.automaticUnbans.has(this.memberId)) {
            this.constructor.automaticUnbans.delete(this.memberId);
        }
    }

    get fileName() {
        return this.constructor.directory + '/' + this.memberId + '.json';
    }
    saveFile() {
        fs.writeFileSync(this.fileName, this.toString())
    }
    get isSaved() {
        try {
            fs.accessSync(this.fileName);
            return true;
        } catch(err) {
            return false;
        }
    }

    save() {
        this.saveEntry();
        this.saveFile();
    }

    delete() {
        if (this.isSaved) 
            fs.unlinkSync(this.fileName);
        
        if (this.constructor.entries.has(this.memberId)) 
            this.constructor.entries.delete(this.memberId);

        if (this.constructor.automaticUnbans.has(this.memberId))
            this.constructor.automaticUnbans.delete(this.memberId);
    }
    get deleted() {
        return !this.isSaved && !this.constructor.has(this.memberId) && !this.constructor.automaticUnbans.has(this.memberId);
    }

    get case() {
        if (this.caseNumber === null)
            return null;
        
        // To be implemented
    }

    static addEntry(member, options = {}) {
        let ban = new this(member, options);
        ban.save();
        return ban;
    }

    static directory = process.cwd() + '/userdata/bans';

    static entries = new Map();
    static automaticUnbans = new Map();
}
global.Ban = Ban;

exports.commandObject = {
    name: "ban",
    description: "Ban a member from the server.",
    default_member_permissions: 4, // 4 = ban members
    options: [
        {
            name: "member",
            description: "The person to be banned from the server.",
            required: true,
            type: 6
        },
        {
            name: "duration",
            description: "How long should the user be banned for? Don't specify or 0 for permanent.",
            type: 3
        },
        {
            name: "reason",
            description: "Why is this member being kicked?",
            type: 3
        },
        {
            name: "keep-messages",
            description: "Should messages from this member up to 7 days old be deleted?",
            type: 5
        },
        {
            name: "silent",
            description: "Should the successful ban message be publicly visible?",
            type: 5
        }
    ]
}

exports.interactionCallback = interaction => {
    if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply({content: "You don't have permission to ban members.", ephemeral: true});
    }

    let target = interaction.options.getMember("member");

    if (!target) {
        return interaction.reply({content: "Failed to get the member to be banned.", ephemeral: true});
    }

    if (target.id === client.user.id) {
        return interaction.reply('💀 you funny as hell bruh');
    }

    if (target.roles.highest.position >= interaction.member.roles.highest.position && interaction.member.id !== interaction.guild.ownerId) {
        return interaction.reply({content: "Target member has higher or equal power to you.", ephemeral: true});
    }

    if (!target.bannable) {
        return interaction.reply({content: `Unable to ban this member.`, ephemeral: true});
    }

    let duration;
    let durationRaw = interaction.options.getString("duration");
    if (durationRaw) {
        duration = parseTime(durationRaw);
        if (!Number.isFinite(duration)) {
            return interaction.reply({content: "Invalid duration.", ephemeral: true});
        }
    }

    let reason = interaction.options.getString("reason");
    interaction.reply({content: `Banning **${target.displayName}**...`, ephemeral: interaction.options.getBoolean("silent") ? true : false}).then(async () => {
        let banEntry = Ban.addEntry(target, {reason: reason, duration: duration, createdTimestamp: interaction.createdTimestamp});

        let failedToDm = false;
        try {
            let messageLines = [
                `You've been banned from Koders by **${interaction.member.displayName}** for the following reason:`,
                reason !== null ? reason : "no reason provided.",
                ''
            ];

            if (Number.isFinite(banEntry.unbanTimestamp)) {
                messageLines.push(`This is a __${formatTime(duration)}__ ban and you will be able to rejoin at <t:${Math.round(banEntry.unbanTimestamp / 1000)}:f>`);
                messageLines.push(`If you wish to rejoin at that time, here is an invite: https://nubstoys.xyz/koders`);
            } else {
                messageLines.push(`This is a __permanent__ ban and you will not be able to rejoin.`);
            }

            await target.send(messageLines.join('\n'));
        } catch (err) {
            failedToDm = true;
        }

        await target.ban({reason: reason, days: interaction.options.getBoolean("keep-messages") ? 0 : 7});
        
        let response = `Banned **${target.displayName}**.`;
        if (failedToDm) response += " Failed to DM them.";
        interaction.editReply(response);
    });
}


// Populating Ban.entries and Ban.automaticUnbans on startup
let fileNames = fs.readdirSync(Ban.directory);
for (let fileName of fileNames) {
    if (fileName.endsWith('.json')) {
        fs.readFile(Ban.directory + '/' + fileName, (err, contents) => {
            if (err) return console.log(err.stack);

            let options = JSON.parse(contents);
            let ban = new Ban(options.memberId, options);
            ban.saveEntry();
        });
    }
}

// Iterate through Ban.automaticUnbans and unban if needed
let guild;
setInterval(() => {
    if (!client.isReady())
        return;

    let now = Date.now() + 5000; // Going to unban everyone between actual now and the next iteration of this interval
    Ban.automaticUnbans.forEach(ban => {
        if (!Number.isFinite(ban.unbanTimestamp)) 
            return Ban.automaticUnbans.delete(ban.memberId);
        
        if (now < ban.unbanTimestamp)
            return;
        
        if (!guild)
            guild = client.guilds.cache.first();

        guild.bans.remove(ban.memberId, 'Ban duration is over.')
            .catch(err => messageDevs(`Unable to automatically unban <@${ban.memberId}> (**${ban.memberId}**): ${err}`));

        console.log(`unbanned ${ban.memberId}`);
        
        ban.delete();
    })
}, 5000);