global.Case = class Case {
    static entries = new Map();
    static cacheSize = 50;
    static directory = process.cwd() + '/userdata/cases';
    static channelId = caseChannelID;
    static nextCaseNumber = 1;

    static types = { 
        kick: 0,
        ban: 1,
        warn: 2,
        isolation: 3,
        custom: 4,
        timeout: 5,
        unban: 6
    }
    static typeColors = [
        0x3eff3e,
        0xff3e3e,
        0xffff3e,
        0x3effff,
        0x3e3e3e,
        0x3e86ff,
        0x3eff7c
    ]

    constructor (options) {
        if (!(options instanceof Object))
            throw new Error('Expected an Object {}, got ' + (options === undefined || options === null ? String(options) : options.__proto__.constructor.name));
        
        if (typeof options.type !== "number") 
            throw new Error("Expected 'type' in the options to be a number, got " + (options.type === undefined || options.type === null ? String(options.type) : options.type.__proto__.constructor.name))
        
        if (!Object.values(this.constructor.types).includes(options.type))
            throw new Error("Invalid 'type' number. See Case.types");

        this.number = typeof options.number == "number" && Number.isFinite(options.number) ? options.number : this.constructor.nextCaseNumber;

        if (this.number == this.constructor.nextCaseNumber) 
            this.constructor.nextCaseNumber++;
            // this.constructor.generateNextCaseNumber();

        this.type = options.type;

        this.enforcers = options.enforcers instanceof Array ? options.enforcers : [];
        this.targets   = options.targets   instanceof Array ? options.targets   : [];

        this.expires   = typeof options.expires == "number" && Number.isFinite(options.expires) ? options.expires : 0;

        // this.createdTimestamp = typeof options.createdTimestamp === "string" ? options.createdTimestamp : Date.now();
        this.createdTimestamp = NaN;
        if (typeof options.createdTimestamp === "string")
            this.createdTimestamp = Number(options.createdTimestamp);
        if (Number.isNaN(this.createdTimestamp))
            this.createdTimestamp = Date.now();
        
        this.reason = typeof options.reason === "string" ? options.reason.substring(0, 512) : null;
        
        this.messageId = typeof options.messageId === "string" ? options.messageId : null;
    }

    toString() {
        return JSON.stringify(this);
    }

    saveEntry() {
        this.constructor.entries.set(this.number, this);
    }

    get filePath() {
        return this.constructor.directory + '/' + this.number + '.json';
    }
    saveFile() {
        if (!Number.isFinite(this.number))
            throw new Error("Please generate a new case number for this file before saving it.");
        fs.writeFileSync(this.filePath, this.toString());
    }
    get isSaved() {
        try {
            fs.accessSync(this.filePath);
            return true;
        } catch (e) {
            return false;
        }
    }

    save() {
        this.saveEntry();
        this.saveFile();
    }

    async delete() {
        if (this.isSaved)
            fs.unlinkSync(this.filePath);
        
        if (this.constructor.entries.has(this.number))
            this.constructor.entries.delete(this.number);

        await this.deleteMessage();

        this.number = null;
        this.type = null;
        this.reason = null;
        this.enforcers = [];
        this.targets = [];
    }

    fetchChannel() {
        return new Promise(async (resolve, reject) => {
            if (!client.isReady())
                return reject(new Error("Client is not ready."));
            
            let channel = await client.guilds.cache.first().channels.fetch(this.constructor.channelId);
            if (!channel)
                return reject(new Error("Couldn't find cases channel."));
            
            resolve(channel);
        });
    }
    fetchMessage() {
        return new Promise(async (resolve, reject) => {
            if (this.messageId === null)
                return reject(new Error("No message to delete."));

            let channel = await this.fetchChannel();

            let message = await channel.messages.fetch(this.messageId);
            if (!message) {
                this.messageId = null;
                this.saveFile();
                return reject(new Error("Couldn't fetch a message to delete."));
            }
            
            resolve(message);
        });
    }

    get typeName() {
        let keys = Object.keys(this.constructor.types);
        
        let name = keys[this.type];
        if (name === undefined)
            return "null";
        
        return name[0].toUpperCase() + name.substring(1);
    }
    get typeColor() {
        return this.constructor.typeColors[this.type];
    }

    get embed() {
        let embed = new Discord.EmbedBuilder()
            .setTitle(`Case ${this.number}: ${this.typeName}`)
            .setColor(this.typeColor)
            .setFooter({text: `Case #${this.number}`})
            .setTimestamp(this.createdTimestamp)
            .setDescription(this.reason ?? "No reason provided.");

        let enforcedOn = Math.round(this.createdTimestamp / 1000);
        embed.addFields(
            {name: `Affected Member${this.targets.length !== 1 ? 's' : ''}`, value: this.targets.length > 0 ? `<@${this.targets.join('>, <@')}>` : 'No one has been listed.'},
            {name: 'Enforced By', value: this.enforcers.length > 0 ? `<@${this.enforcers.join('>, <@')}>` : 'No one has been listed.'},
            {name: 'Enforced On', value: `<t:${enforcedOn}:f> (<t:${enforcedOn}:R>)`, inline: true}
        );

        if (this.expires > 0) {
            let expires = Math.round(this.expires / 1000);
            embed.addFields({name: 'Expires On', value: `<t:${expires}:f> (<t:${expires}:R>)`, inline: true});
        }

        return embed;
    }

    updateMessage() {
        return new Promise(async (resolve, reject) => {
            if (!Number.isFinite(this.number))
                return reject(new Error("No case number associated with this case."));

            let message;
            try {
                message = await this.fetchMessage().catch(()=>{});
            } finally {}

            if (message) {
                resolve(await message.edit({embeds: [this.embed]}));
            } else {
                let channel = await this.fetchChannel();
                let newMessage = await channel.send({embeds: [this.embed]});
                this.messageId = newMessage.id;
                this.saveFile();
                resolve(newMessage);
            }
        });
    }
    deleteMessage() {
        return new Promise(async (resolve, reject) => {
            let message = await this.fetchMessage();

            await message.delete();
            resolve();
        });
    }

    static addEntry(options) {
        let caseEntry = new this(options);
        caseEntry.save();
        return caseEntry;
    }

    static fetch(number) {
        return new Promise((resolve, reject) => {
            if (!Number.isFinite(number))
                return reject(new Error("Invalid case number, must be finite."));

            let fromCache = this.entries.get(number);
            if (fromCache) 
                return resolve(fromCache);

            let caseData;
            try {
                caseData = fs.readFileSync(`${this.directory}/${number}.json`);
            } catch (error) {
                return reject(new Error("Case doesn't exist"));
            }

            try {
                caseData = JSON.parse(caseData);
            } catch (error) {
                return reject(new Error("Unable to parse case file"));
            }

            resolve((new this(caseData)).saveEntry());
        });
    }

    static generateNextCaseNumber() {
        let fileNames = fs.readdirSync(this.directory);
        for (let fileName of fileNames) {
            if (fileName.endsWith('.json')) 
                this.nextCaseNumber = Math.max(this.nextCaseNumber, Number(fileName.substring(0, fileName.indexOf("."))) + 1);
        }

        this.entries.forEach(caseEntry => {
            // if (caseEntry.number >= this.nextCaseNumber)
            //     this.nextCaseNumber = caseEntry.number + 1;
            this.nextCaseNumber = Math.max(this.nextCaseNumber, caseEntry.number + 1)
        });
    }
}

Case.generateNextCaseNumber();

// Populating Case.entries on startup
// let fileNames = fs.readdirSync(Case.directory);
// for (let fileName of fileNames) {
//     if (fileName.endsWith('.json')) {
//         // fs.readFile(Case.directory + '/' + fileName, (err, contents) => {
//         //     if (err) return console.error(err.stack);
            
//         //     let options = JSON.parse(contents);
//         //     let caseEntry = new Case(options);
//         //     caseEntry.saveEntry();
//         // });
//         Case.nextCaseNumber = Math.max(Case.nextCaseNumber, Number(fileName.substring(0, fileName.indexOf("."))) + 1);
//     }
// }