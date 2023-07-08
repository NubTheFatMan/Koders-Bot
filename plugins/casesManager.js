global.Case = class Case {
    static entries = new Map();
    static directory = process.cwd() + '/userdata/cases';
    static channelId = "771529639054278696";

    static types = { 
        kick: 0,
        ban: 1,
        warn: 2,
        isolation: 3,
        custom: 4
    }
    static typeColors = [
        0x3eff3e,
        0xff3e3e,
        0xffff3e,
        0x3effff,
        0x3e3e3e
    ]

    constructor (options) {
        if (!(options instanceof Object))
            throw new Error('Expected an Object {}, got ' + (options === undefined || options === null ? String(options) : options.__proto__.constructor.name));
        
        if (typeof options.type !== "number") 
            throw new Error("Expected 'type' in the options to be a number, got " + (options.type === undefined || options.type === null ? String(options.type) : options.type.__proto__.constructor.name))
        
        if (!Object.values(this.constructor.types).includes(options.type))
            throw new Error("Invalid 'type' number. See Case.types");

        this.number = NaN;

        this.type = options.type;

        this.enforcers = options.enforcers instanceof Array ? options.enforcers : [];
        this.targets   = options.targets   instanceof Array ? options.targets   : [];

        // this.createdTimestamp = typeof options.createdTimestamp === "string" ? options.createdTimestamp : Date.now();
        this.createdTimestamp = NaN;
        if (typeof options.createdTimestamp === "string")
            this.createdTimestamp = Number(options.createdTimestamp);
        if (Number.isNaN(this.createdTimestamp))
            this.createdTimestamp = Date.now();
        
        this.reason = typeof options.reason === "string" ? options.reason.substring(0, 512) : null;
        
        this.messageId = typeof options.messageId === "string" ? options.messageId : null;
    }

    generateCaseNumber() {
        let highestIndex = 0;
        this.constructor.entries.forEach(caseEntry => {
            if (caseEntry.number > highestIndex)
                highestIndex = caseEntry.number;
        });
        this.number = highestIndex + 1;
    }

    toString() {
        return JSON.stringify(this);
    }

    saveEntry() {
        if (Number.isNaN(this.number))
            this.generateCaseNumber();
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

    delete() {
        if (this.isSaved)
            fs.unlinkSync(this.filePath);
        
        if (this.constructor.entries.has(this.number))
            this.constructor.entries.delete(this.number);
    }
    get deleted() {
        return !this.isSaved && !this.constructor.entries.has(this.number);
    }

    get fetchChannel() {
        return new Promise(async (resolve, reject) => {
            if (!client.isReady())
                return reject(new Error("Client is not ready."));
            
            let channel = await client.guilds.cache.first().channels.fetch(this.constructor.channelId);
            if (!channel)
                return reject(new Error("Couldn't find cases channel."));
            
            resolve(channel);
        });
    }
    get fetchMessage() {
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

    updateMessage() {
        return new Promise(async (resolve, reject) => {
            if (!Number.isFinite(this.number))
                return reject(new Error("No case number associated with this case."));

            let message;
            try {
                message = await this.fetchMessage();
            } finally {}
            
            let embed = new Discord.EmbedBuilder();
            embed.setTitle(`Case: ${this.typeName}`);
            embed.setColor(this.typeColor);
            embed.setFooter(`Case #${this.number}`);
            embed.setTimestamp(this.createdTimestamp);
            embed.setDescription(this.reason !== null ? this.reason : "No reason provided.");

            let enforcedOn = Math.round(this.createdTimestamp / 1000);
            embed.addFields(
                {name: `Affected Member${this.targets.length !== 1 ? 's' : ''}`, value: this.targets.length > 0 ? `<@${this.targets.join('>, <@')}>` : 'No one has been listed.'},
                {name: 'Enforced By', value: this.enforcers.length > 0 ? `<@${this.enforcers.join('>, <@')}>` : 'No one has been listed.'},
                {name: 'Enforced On', value: `<t:${enforcedOn}:f> (<t:${enforcedOn}:R>)`}
            );

            if (message) {
                resolve(await message.edit({embeds: [embed]}));
            } else {
                let channel = await this.fetchChannel();
                let newMessage = await channel.send({embeds: [embed]});
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
            resolve(message);
        });
    }

    static addEntry(options) {
        let caseEntry = new this(options);
        caseEntry.save();
        return caseEntry;
    }
}


// Populating Case.entries on startup
let fileNames = fs.readdirSync(Case.directory);
for (let fileName of fileNames) {
    if (fileName.endsWith('.json')) {
        fs.readFile(Case.directory + '/' + fileName, (err, contents) => {
            if (err) return console.error(err.stack);
            
            let options = JSON.parse(contents);
            let caseEntry = new Case(options);
            caseEntry.saveEntry();
        });
    }
}