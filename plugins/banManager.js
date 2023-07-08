// This file handles creating ban records in `/userdata/bans` and automatically unbanning if set

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

        // this.createdTimestamp = typeof options?.createdTimestamp === "string" ? Number(options.createdTimestamp) : Date.now();
        this.createdTimestamp = NaN;
        if (typeof options?.createdTimestamp === "string") 
            this.createdTimestamp = Number(options.createdTimestamp);
        if (Number.isNaN(this.createdTimestamp))
            this.createdTimestamp = Date.now();
        
        // this.unbanTimestamp = typeof options?.unbanTimestamp === "string" 
        //     ? options.unbanTimestamp 
        //     : typeof options?.duration === "number" 
        //         ? this.createdTimestamp + options.duration 
        //         : NaN;
        this.unbanTimestamp = NaN;
        if (typeof options?.unbanTimestamp === "string")
            this.unbanTimestamp = Number(options.unbanTimestamp);
        else if (typeof options?.duration === "number")
            this.unbanTimestamp = this.createdTimestamp + options.duration;

        this.caseNumber = typeof options?.caseNumber === "number" ? options.caseNumber : null; 
        if (this.caseNumber === null) {
            let caseOptions = {
                type: Case.types.ban,
                targets: [this.memberId],
                reason: this.reason
            }

            if (typeof options?.enforcer === "string") 
                caseOptions.enforcers = [options.enforcer];

            let caseInstance = Case.addEntry(caseOptions);
            caseInstance.updateMessage();
            this.caseNumber = caseInstance.number;
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
        return !this.isSaved && !this.constructor.entries.has(this.memberId) && !this.constructor.automaticUnbans.has(this.memberId);
    }

    get case() {
        if (this.caseNumber === null || !Number.isFinite(this.caseNumber))
            return null;
        
        return Case.entries.get(this.caseNumber);
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
        
        ban.delete();
    })
}, 5000);