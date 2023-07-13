exports.type = 'event';
exports.name = "Something Sus Role Toggle";
exports.event = "messageCreate";

exports.callback = message => {
    if (message.guild !== undefined && message.content.toLowerCase().includes('sus')) {
        if (alts.includes(message.author.id)) {
            let roleManager = message.member.roles;
            if (roleManager.cache.get(bumRole)) {
                roleManager.remove(bumRole)
                    .then(() => {
                        message.react(roleToggledReaction);
                        message.reply(`${spongeDange} No longer a <@&${bumRole}>`);
                    }).catch((err) => {
                        console.log(err.stack);
                        message.react(failedToRole);
                    });
            } else {
                roleManager.add(bumRole)
                    .then(() => {
                        message.react(roleToggledReaction);
                        message.reply(`${spongeDange} You are now a <@&${bumRole}>`);
                    }).catch((err) => {
                        console.log(err.stack);
                        message.react(failedToRole);
                    });
            }
        } else {
            message.react(susReactions[Math.floor(Math.random() * susReactions.length)]);
        }
    }
}