exports.type = "command";
exports.name = "Kick";
exports.calls = ["kick"];

exports.callback = async (message, args) => {
    if (!message.member.permissions.has(Discord.PermissionsBitField.Flags.KickMembers))
        return message.reply("You don't have access to kicking.");

    if (message.mentions.members.size === 0) 
        return message.reply('You must specify at least one person to kick');

    if (message.mentions.members.size > 3)
        return message.reply("You are limited to kicking 3 people at a time.");

    let callerPower = message.member.roles.highest.position;

    let kickable = [];
    let mentionIds = [];
    message.mentions.members.forEach(target => {
        if (target.roles.highest.position < callerPower && target.kickable && !kickable.includes(target)) {
            kickable.push(target);
            mentionIds.push(target.id);
        }
    });

    if (kickable.length === 0) 
        return message.reply('Out of the targets you specified, you are unable to kick any of them.');

    let reason = message.content.substring(message.content.indexOf(args[0]))
        .replace(new RegExp(`(<@${mentionIds.join('>)|(<@')}>)`), '')
        .trim()
        .substring(0, 512); // Can be up to 512 characters long.

    if (reason === "")
        reason = `No reason provided by ${message.member.displayName}.`;

    let response = await message.reply(`Kicking **${kickable.length}** member${kickable.length === 1 ? '' : 's'}...\nReason: ${reason}`);

    let failedToDm = [];
    for (let target of kickable) {
        try {
            await target.send(`You have been kicked from Koders for the following reason:\n${reason}`);
        } catch (error) {
            failedToDm.push(target.displayName);
        }
        await target.kick(reason);
    }

    let newReponseLines = [
        `Kicked **${kickable.length}** member${kickable.length === 1 ? '' : 's'}.`,
        `Reason: ${reason}`
    ];

    if (failedToDm.length > 0) {
        newReponseLines.push(`\nFailed to DM **${failedToDm.join('**, **')}**.`);
    }

    response.edit(newReponseLines.join('\n'));
}

exports.commandObject = {
    name: "kick",
    description: "Kick a member. It is recommended you use /isolate instead, however this is available to you.",
    default_member_permissions: 2, // 2 = kick members
    options: [
        {
            name: "member",
            description: "The person to be kicked from the server.",
            required: true,
            type: 6
        },
        {
            name: "reason",
            description: "Why is this member being kicked?",
            type: 3
        },
        {
            name: "silent",
            description: "If successful, should the message be visible to everyone?",
            type: 5
        }
    ]
}

exports.interactionCallback = interaction => {
    if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.KickMembers)) {
        return interaction.reply({content: "You don't have permission to kick.", ephemeral: true});
    }

    let target = interaction.options.getMember("member");

    if (!target) {
        return interaction.reply({content: "Failed to get the member to be isolated.", ephemeral: true});
    }

    if (target.id === client.user.id) {
        return interaction.reply('💀 you funny as hell bruh');
    }

    if (target.roles.highest.position >= interaction.member.roles.highest.position && interaction.member.id !== interaction.guild.ownerId) {
        return interaction.reply({content: "Target member has higher or equal power to you.", ephemeral: true});
    }

    if (!target.kickable) {
        return interaction.reply({content: `Unable to kick this member.`, ephemeral: true});
    }

    let reason = interaction.options.getString("reason");
    interaction.reply({content: `Kicking **${target.displayName}**...`, ephemeral: interaction.options.getBoolean("silent") ? true : false}).then(async () => {
        let failedToDm = false;
        try {
            await target.send(`Kicked from Koders for the following reason:\n${reason !== null ? reason : "No reason given."}`);
        } catch (err) {
            failedToDm = true;
        }

        await target.kick(reason);
        
        let response = `Kicked **${target.displayName}**.`;
        if (failedToDm) response += " Failed to DM them.";
        interaction.editReply(response);
    });
}