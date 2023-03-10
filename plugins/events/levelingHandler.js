exports.type = 'event';
exports.name = "Leveling Handler";
exports.event = "messageCreate";

// Channel where levelups are posted
let levelingAnnouncementChannel = '1077774360452014111';

let cooldown = 2000; // ms between messages to count xp
let minimumMessageLength = 0; // How long messages should be to count XP

// If these are in a message, they are limited and give a fixed amount of XP
// Currently limits mentions, emojis, dynamic timestamps, and links
let fixedAmountPatterns = /(<((@(!|&)?|#)[0-9]+|a?:.+:[0-9]+|t:[0-9]+(:\w)?)>|https?:\/\/\S+)/g;

let fixedPatternAmount  = 10; // Patterns matched above will add this amount of XP
let attachmentAmount    = 25; // Attachments to a message will add this amount of XP

// Maximum level. Currently set to the level before experienceNeededToLevel would roll over on 32 bit
let maxLevel = 1089; 

global.blankLevel = {
    level: 0,
    experiencedNeededToLevel: 100,
    experience: 0,
    totalExperience: 0,
    lastMessageTimestamp: 0,
    wantsPing: true // User can set this false and the bot wont @ them upon leveling up
}

global.levelsDirectory = process.cwd() + '/userdata/levels';
global.userLevels = new Map();

fs.readdir(levelsDirectory, (errorFolder, files) => {
    if (errorFolder) throw errorFolder; // Not gonna error handle since this is important

    for (let file of files) {
        if (!file.endsWith('.json')) continue;

        fs.readFile(levelsDirectory + '/' + file, (errorFile, contents) => {
            if (errorFile) throw errorFile;
            
            let userid = file.substring(0, file.indexOf('.'));
            userLevels.set(userid, JSON.parse(contents));
        });
    }
});

global.getExperienceToLevel = currentLevel => {
    if (typeof currentLevel !== "number") return NaN;
    if (Number.isNaN(currentLevel)) return NaN;
    if (!Number.isFinite(currentLevel)) return Infinity;

    if (currentLevel < 0) return NaN;
    else if (currentLevel === 0) return blankLevel.experiencedNeededToLevel;
    else if (currentLevel > maxLevel) return Infinity;
    else return Math.round((currentLevel ** (7/3) + (500 * currentLevel)));
}
global.getExperienceToReachLevel = desiredLevel => {
    if (typeof desiredLevel !== "number") return NaN;
    if (Number.isNaN(desiredLevel)) return NaN;
    if (!Number.isFinite(desiredLevel)) return Infinity;

    if (desiredLevel < 0) return NaN;
    else if (desiredLevel === 0) return blankLevel.experiencedNeededToLevel;
    else if (desiredLevel > maxLevel) return Infinity;
    else {
        let experience = 0;
        let currentLevel = 0;
        while (currentLevel++ <= desiredLevel) {
            experience += getExperienceToLevel(currentLevel);
        }

        return experience;
    }
}

global.addUserExperience = (userIdOrMessage, amount) => {
    let isMessage = userIdOrMessage instanceof Discord.Message;
    let isString = typeof userIdOrMessage === "string";

    let userLevelInformation;
    let id;
    if (isString) {
        if (typeof amount !== "number")
            throw new Error("Bad argument #2: Expected a number, got " + typeof amount);

        if (Number.isNaN(amount))
            throw new Error("Bad argument #2: Number must be a number, not NaN");

        if (!Number.isFinite(amount))
            throw new Error("Bad argument #2: Number must be finite, not Infinity");

        id = userIdOrMessage;
        userLevelInformation = userLevels.get(id);
        if (!userLevelInformation) 
            userLevelInformation = Object.assign({}, blankLevel);
    } else if (isMessage) {
        id = userIdOrMessage.author.id;
        userLevelInformation = userLevels.get(id);
        if (!userLevelInformation) 
            userLevelInformation = Object.assign({}, blankLevel);

        amount = userIdOrMessage.content.replace(fixedAmountPatterns, 'a'.repeat(fixedPatternAmount)).length;
        amount += userIdOrMessage.attachments.size * attachmentAmount;
    } else {
        throw new Error("Invalid argument #1: Expected a Message or string, got " + typeof userIdOrMessage);
    }

    if (userLevelInformation) {
        amount = Math.round(amount);
        userLevelInformation.experience += amount;
        userLevelInformation.totalExperience += amount;

        let beforeLevel = userLevelInformation.level;
        while (userLevelInformation.experience >= userLevelInformation.experiencedNeededToLevel && userLevelInformation.level < maxLevel) {
            userLevelInformation.experience -= userLevelInformation.experiencedNeededToLevel;
            userLevelInformation.level++;
            userLevelInformation.experiencedNeededToLevel = getExperienceToLevel(userLevelInformation.level);
        }

        userLevels.set(id, userLevelInformation);
        fs.writeFile(`${levelsDirectory}/${id}.json`, JSON.stringify(userLevelInformation), error => {
            if (error) messageDevs(`Unable to save **${id}.json** (<@${id}>): \`${error}\``);
        });

        let levelDifference = userLevelInformation.level - beforeLevel;
        return Object.assign({
            beforeLevel: beforeLevel,
            levelDifference: levelDifference
        }, userLevelInformation);
    } else {
        throw new Error("Failed to get or create user level information");
    }
}

let messageCache = new Map();
let blankMessageCache = {
    currentIndex: 0,
    messages: (new Array(50)).fill('')
}

let levelingChannel;
exports.callback = async message => {
    if (client.user.id !== liveClientId) return; // Don't want to track leveling on dev clients

    if (message.author.bot) return;

    let memberLevel = userLevels.get(message.member.id);
    if (!memberLevel) {
        memberLevel = Object.assign({}, blankLevel);
        userLevels.set(message.author.id, memberLevel);
    }

    let cache = messageCache.get(message.member.id);
    if (!cache) {
        cache = Object.assign({}, blankMessageCache);
        messageCache.set(message.member.id, cache);
    }

    let meetsMessageLength = message.content.length >= minimumMessageLength;
    let offCooldown        = message.createdTimestamp - memberLevel.lastMessageTimestamp >= cooldown;

    // Reset for every message instead of when XP is added to help prevent copy/paste spam
    memberLevel.lastMessageTimestamp = message.createdTimestamp;

    if (cache.messages.includes(message.content)) {
        return;
    }

    if (meetsMessageLength && offCooldown) {
        let levelData = addUserExperience(message);

        cache.messages[cache.currentIndex] = message.content;
        cache.currentIndex++;
        if (cache.currentIndex >= cache.messages.length) cache.currentIndex = 0;

        if (levelData.levelDifference > 0) {
            if (!levelingChannel) {
                levelingChannel = await client.guilds.cache.first().channels.fetch(levelingAnnouncementChannel);
            }

            let name = levelData.wantsPing ? `<@${message.author.id}>` : `**${message.member.displayName}**`;
            let differenceInLevel = `**${levelData.beforeLevel}** -> **${levelData.level}**`;
            let pingPreference = levelData.wantsPing ? "Don't want" : "Want";

            let xpToLevel = getExperienceToLevel(levelData.level);
            let xpToLevelPercent = ((levelData.experience / xpToLevel) * 100).toFixed(2);

            let lines = [
                `${name} has leveled up (${differenceInLevel})!`,
                `XP needed to level up: ${levelData.experience}/**${xpToLevel}** (__${xpToLevelPercent}%__)`,
                `${pingPreference} pinged? Use </toggle-level-ping:1080700415743639692>`
            ];

            let response = lines.join('\n');
            levelingChannel.send(response);
        }
    }
}