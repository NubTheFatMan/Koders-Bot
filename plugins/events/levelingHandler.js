exports.type = 'event';
exports.name = "Leveling Handler";
exports.event = "messageCreate";

exports.blankLevel = {
    level: 0,
    experiencedNeededToLevel: 100, //Typo that I'm too lazy to fix, "experience" shouldn't be past tense :moyai:
    experience: 0,
    totalExperience: 0,
    lastMessageTimestamp: 0,
    wantsPing: false // User can set this false and the bot wont @ them upon leveling up
}

exports.levelUpReaction = '1136371604339834901';

exports.levelRoles = {
     1: '1077793696633847858', // @Image Perms
     5: '1077794221009948712', // @New
    10: '1077794718357929995', // @Frequent
    15: '1077795203768909844', // @Regular
    20: '1077795466370089052', // @Active
    25: '1077795704505905202', // @Needs a break
    30: '1077795804955295875', // @Touching Grass
    37: '1077795941400199301', // @Godly
    60: '1077796218954072114'  // @holy fuck
};

// Channel where levelups are posted
exports.levelingAnnouncementChannel = '1077774360452014111';

exports.cooldown = 1000; // ms between messages to count xp
exports.minimumMessageLength = 0; // How long messages should be to count XP

// If these are in a message, they are limited and give a fixed amount of XP
// Currently limits mentions, nitro emojis, dynamic timestamps, and links
exports.fixedAmountPatterns = /(<((@(!|&)?|#)[0-9]+|a?:.+:[0-9]+|t:[0-9]+(:\w)?)>|https?:\/\/\S+)/g;

exports.fixedPatternAmount  = 10; // Patterns matched above will add this amount of XP
exports.attachmentAmount    = 15; // Attachments to a message will add this amount of XP

exports.boosterMultiplier = 1.4; // Multiple the XP gained by this amount of the member is a server booster
exports.globalXPMultiplier = 1;

// Maximum level. Currently set to the level before experienceNeededToLevel would roll over on 32 bit
exports.maxLevel = 1089; 

exports.unloadTimeout = 1000 * 60 * 10; // How long until level information should be unloaded from memory after inactive chatting.

exports.levelsDirectory = process.cwd() + '/userdata/levels/';
exports.userLevels = new Map();
exports.unloadLevelDataTimestamps = new Map();

exports.getLevelInformation = id => {
    if (typeof id !== "string") throw new Error("Invalid user id");
    if (this.userLevels.get(id)) {
        return this.userLevels.get(id);
    } else if (fs.existsSync(this.levelsDirectory + `${id}.json`)) {
        let levelInformation = JSON.parse(fs.readFileSync(this.levelsDirectory + `${id}.json`));
        this.userLevels.set(id, levelInformation);
        this.unloadLevelDataTimestamps.set(id, Date.now() + this.unloadTimeout);
        return levelInformation;
    }
    
    let newLevel = Object.assign({}, this.blankLevel);
    this.userLevels.set(id, newLevel);
    this.unloadLevelDataTimestamps.set(id, Date.now() + this.unloadTimeout);
    return newLevel;
}

exports.getExperienceToLevel = currentLevel => {
    if (typeof currentLevel !== "number") return NaN;
    if (Number.isNaN(currentLevel)) return NaN;
    if (!Number.isFinite(currentLevel)) return Infinity;

    if (currentLevel < 0) return NaN;
    else if (currentLevel === 0) return this.blankLevel.experiencedNeededToLevel;
    else if (currentLevel > this.maxLevel) return Infinity;
    else return Math.round((currentLevel ** (7/3) + (500 * currentLevel)));
}
exports.getExperienceToReachLevel = desiredLevel => {
    if (typeof desiredLevel !== "number") return NaN;
    if (Number.isNaN(desiredLevel)) return NaN;
    if (!Number.isFinite(desiredLevel)) return Infinity;

    if (desiredLevel < 0) return NaN;
    else if (desiredLevel === 0) return this.blankLevel.experiencedNeededToLevel;
    else if (desiredLevel > this.maxLevel) return Infinity;
    else {
        let experience = 0;
        let currentLevel = 0;
        while (currentLevel++ <= desiredLevel) {
            experience += this.getExperienceToLevel(currentLevel);
        }

        return experience;
    }
}

function manageLevelRoles(member, roleToAdd, roleToRemove) {
    member.roles.add(roleToAdd).then(() => {
        if (roleToRemove) {
            member.roles.remove(roleToRemove).catch(err => messageDevs(`Unable to remove level role <@&${roleToRemove}> from <@${member.id}>: ${err}`));
        } 
    }).catch(err => messageDevs(`Unable to add level role <@&${roleToAdd}> to <@${member.id}>: ${err}`));
}

exports.addUserExperience = (userIdOrMessage, amount) => {
    let isMessage = userIdOrMessage instanceof Discord.Message;
    let isString = typeof userIdOrMessage === "string";

    let userLevelInformation;
    let id;
    let member;
    if (isString) {
        if (typeof amount !== "number")
            throw new Error("Bad argument #2: Expected a number, got " + typeof amount);

        if (Number.isNaN(amount))
            throw new Error("Bad argument #2: Number must be a number, not NaN");

        if (!Number.isFinite(amount))
            throw new Error("Bad argument #2: Number must be finite, not Infinity");

        id = userIdOrMessage;
        userLevelInformation = this.getLevelInformation(id);
    } else if (isMessage) {
        member = userIdOrMessage.member;
        id = userIdOrMessage.author.id;
        userLevelInformation = this.getLevelInformation(id);

        if (!Number.isFinite(amount))
            amount = 0;

        amount += userIdOrMessage.content.replace(this.fixedAmountPatterns, 'a'.repeat(this.fixedPatternAmount)).length;
        amount += userIdOrMessage.attachments.size * this.attachmentAmount;
        amount += userIdOrMessage.stickers.size * this.fixedPatternAmount;

        if (member.roles.premiumSubscriberRole) {
            amount *= this.boosterMultiplier;
        }
    } else {
        throw new Error("Invalid argument #1: Expected a Message or string, got " + typeof userIdOrMessage);
    }

    if (userLevelInformation) {
        amount = Math.round(amount * this.globalXPMultiplier);
        userLevelInformation.experience += amount;
        userLevelInformation.totalExperience += amount;

        let beforeLevel = userLevelInformation.level;
        while (userLevelInformation.experience >= userLevelInformation.experiencedNeededToLevel && userLevelInformation.level < this.maxLevel) {
            userLevelInformation.experience -= userLevelInformation.experiencedNeededToLevel;
            userLevelInformation.level++;
            userLevelInformation.experiencedNeededToLevel = this.getExperienceToLevel(userLevelInformation.level);

            let level = userLevelInformation.level;
            if (this.levelRoles[level]) {
                let keys = Object.keys(this.levelRoles);
                let lastRoleIndex = keys.indexOf(level.toString()) - 1;
                let roleToRemove = this.levelRoles[keys[lastRoleIndex]];
                
                if (!member) {
                    client.guilds.cache.first().members.fetch(userIdOrMessage)
                        .then(member => manageLevelRoles(member, this.levelRoles[level], roleToRemove))
                        .catch(err => messageDevs(`Couldn't fetch member for **${userIdOrMessage}** so no level roles were added or removed:\`\`\`\n${err.stack}\`\`\``));
                } else {
                    manageLevelRoles(member, this.levelRoles[level], roleToRemove);
                }
            }
        }

        this.userLevels.set(id, userLevelInformation);
        this.unloadLevelDataTimestamps.set(id, Date.now() + this.unloadTimeout);
        fs.writeFile(`${this.levelsDirectory}${id}.json`, JSON.stringify(userLevelInformation), error => {
            if (error) messageDevs(`Unable to save **${id}.json** (<@${id}>):\`\`\`\n${error.stack}\`\`\``);
        });

        let levelDifference = userLevelInformation.level - beforeLevel;
        return Object.assign({beforeLevel, levelDifference}, userLevelInformation);
    } else {
        throw new Error("Failed to get or create user level information");
    }
}

setInterval(() => {
    let now = Date.now();
    for (let [id, timestamp] of this.unloadLevelDataTimestamps) {
        if (now >= timestamp) {
            this.unloadLevelDataTimestamps.delete(id);
            this.userLevels.delete(id);
        }
    }
}, 1000);

let messageCache = new Map();
let blankMessageCache = {
    currentIndex: 0,
    messages: (new Array(50)).fill('')
}

let levelingChannel;
exports.callback = async message => {
    // if (message.author.id !== "292447249672175618") return;
    if (client.user.id !== liveClientId) return; // Don't want to track leveling on dev clients
    if (message.author.bot) return; // Don't track bots

    let memberLevel;
    try {
        memberLevel = this.getLevelInformation(message.author.id);
    } catch (err) {
        return message.reply(`Unable to load your level information:\`\`\`\n${err.stack}\`\`\``);
    }

    let cache = messageCache.get(message.member.id);
    if (!cache) {
        cache = Object.assign({}, blankMessageCache);
        messageCache.set(message.member.id, cache);
    }

    let meetsMessageLength = message.content.length >= this.minimumMessageLength;
    let offCooldown        = message.createdTimestamp - memberLevel.lastMessageTimestamp >= this.cooldown;

    // Reset for every message instead of when XP is added to help prevent copy/paste spam
    memberLevel.lastMessageTimestamp = message.createdTimestamp;

    if (cache.messages.includes(message.content)) {
        return;
    }

    if (meetsMessageLength && offCooldown) {
        let levelData = this.addUserExperience(message);

        cache.messages[cache.currentIndex] = message.content;
        cache.currentIndex++;
        if (cache.currentIndex >= cache.messages.length) cache.currentIndex = 0;

        if (levelData.levelDifference > 0) {
            message.react(this.levelUpReaction);
            if (!levelingChannel) {
                levelingChannel = await client.guilds.cache.first().channels.fetch(this.levelingAnnouncementChannel);
            }

            let name = levelData.wantsPing ? `<@${message.author.id}>` : `**${message.member.displayName}**`;
            let differenceInLevel = `**${levelData.beforeLevel}** -> **${levelData.level}**`;

            let xpToLevel = this.getExperienceToLevel(levelData.level);
            let xpToLevelPercent = ((levelData.experience / xpToLevel) * 100).toFixed(2);

            let lines = [
                `${name} has leveled up (${differenceInLevel})!`,
                `XP needed to level up: ${levelData.experience}/**${xpToLevel}** (__${xpToLevelPercent}%__)`
            ];

            if (levelData.wantsPing) 
                lines.push(`Don't want pinged? Use </toggle-level-ping:1080700415743639692>`);

            levelingChannel.send(lines.join('\n'));
        }
    }
}