exports.type = 'event';
exports.name = "Counting";
exports.event = "messageCreate";

let storageFile = process.cwd() + "/userdata/counting.json";
let countingManager = JSON.parse(fs.readFileSync(storageFile));

function resendPinnedMessage(channel) {
    channel.messages.fetchPinned(false).then(pins => {
        let pinnedMessage = pins.get(countingManager.lastMilestonePin); 
        if (pinnedMessage) {
            pinnedMessage.unpin();
        }

        channel.send(`The next reward is when the number **${countingManager.nextMilestone}** is counted.`)
            .then(message => {
                message.pin();
                countingManager.lastMilestonePin = message.id;
                fs.writeFileSync(storageFile, JSON.stringify(countingManager));
            });
    });
}

exports.callback = message => {
    if (client.user.id !== liveClientId) return;
    if (message.author.bot) return;
    if (message.channel.id !== countingChannel) return;
    if (message.system) return;

    if (message.member.permissions.has(Discord.PermissionsBitField.Flags.Administrator)) {
        if (message.content.startsWith(adminPrefix)) {
            let args = message.content.split(/ +/g);
            let cmd = args[0].substring(adminPrefix.length).toLowerCase();

            switch(cmd) {
                case "setnumber": {
                    let nextNumber = Number(args[1]);
                    if (!Number.isNaN(nextNumber)) {
                        countingManager.expectedNumber = nextNumber;
                        fs.writeFileSync(storageFile, JSON.stringify(countingManager));
                        message.reply(`The next number is **${countingManager.expectedNumber}**.`);
                    } else {
                        message.reply('Please input a number.');
                    }
                } break;

                case "setmilestone": {
                    let nextMilestone = Number(args[1]);
                    if (!Number.isNaN(nextMilestone)) {
                        countingManager.nextMilestone = nextMilestone;
                        fs.writeFileSync(storageFile, JSON.stringify(countingManager));
                        resendPinnedMessage(message.channel);
                    } else {
                        message.reply('Please input a number.');
                    }
                } break;

                case "number":
                case "nextnumber": {
                    message.reply(`The next number is **${countingManager.expectedNumber}**.`);
                } break;

                case "pin":
                case "refreshpin":
                case "milestone":
                case "refreshmilestonepin": {
                    resendPinnedMessage(message.channel);
                } break;

                default: {
                    message.reply("Admin don't know the admin commands 💀");
                } break;
            }

            return; // Stop the message counter if message was from admin and started with prefix
        }
    }

    // counter
    if (message.content.startsWith(countingManager.expectedNumber)) {
        if (countingManager.expectedNumber === countingManager.nextMilestone) {
            countingManager.nextMilestone += countingManager.milestoneIncrease;
            message.reply(`Congratulations! You have counted the milestone number! <@292447249672175618> will be in touch shortly.`)
                .then(() => resendPinnedMessage(message.channel));
        }
        
        countingManager.expectedNumber++;
        
        fs.writeFileSync(storageFile, JSON.stringify(countingManager));
        message.react('✅');
    } else {
        countingManager.expectedNumber -= wrongNumberKnockOff;
        if (countingManager.expectedNumber < 1) countingManager.expectedNumber = 1;

        message.reply(`Oh no! You miscounted! ${wrongNumberKnockOff} digits have been knocked off. The next number is **${countingManager.expectedNumber}**.`);
        fs.writeFileSync(storageFile, JSON.stringify(countingManager));
        message.react('❌');
    }
}