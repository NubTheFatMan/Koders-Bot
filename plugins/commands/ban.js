exports.type = "command";
exports.name = "Ban";

exports.commandObject = {
    name: "ban",
    description: "Ban a member from the server.",
    default_member_permissions: 4, // 4 = ban members
    options: [
        {
            name: "member",
            description: "The person to be banned from the server. If not specified, must use id field.",
            type: 6
        },
        {
            name: "id",
            description: "The person to be banned from the server. If not specified, must use member field.",
            type: 3
        },
        {
            name: "duration",
            description: "How long should the user be banned for? Don't specify for permanent.",
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

exports.interactionCallback = async interaction => {
    if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply({content: "You don't have permission to ban members.", ephemeral: true});
    }

    let member = interaction.options.getMember("member");
    let id;
    if (member) {
        id = member.id;
    } else {
        id = interaction.options.getString("id");
        let matched = id.match(/[0-9]+/g);
        if (!matched || (matched && matched[0] !== id))
            return interaction.reply({content: "Failed to get the member to be banned.", ephemeral: true});
    }

    if (id === client.user.id) 
        return interaction.reply('💀 you funny as hell bruh'); 

    if (!member) {
        try {
            member = await interaction.guild.members.fetch(id);
        } finally {} // who needs error handling 🗿
    }

    if (member) {
        if (member.roles.highest.position >= interaction.member.roles.highest.position && member.roles.highest !== isolatedRole) {
            return interaction.reply({content: "Target member has higher or equal power to you.", ephemeral: true});
        }
    
        if (!member.bannable) {
            return interaction.reply({content: `Unable to ban this member.`, ephemeral: true});
        }
    }

    let duration;
    let durationRaw = interaction.options.getString("duration");
    if (durationRaw) {
        duration = parseTime(durationRaw);
        if (!Number.isFinite(duration)) 
            return interaction.reply({content: "Invalid duration.", ephemeral: true});
        
        if (duration > 0 && duration < 30_000)
            return interaction.reply({content: "You must ban for a minimum of 30 seconds.", ephemeral: true});
    }

    let reason = interaction.options.getString("reason");
    interaction.reply({content: `Banning **${member.displayName}**...`, ephemeral: interaction.options.getBoolean("silent") ? true : false}).then(async () => {
        let banEntry = new Ban(member, {reason: reason, duration: duration, createdTimestamp: interaction.createdTimestamp, enforcer: interaction.member.id});

        let failedToDm = false;
        if (member) {
            try {
                let messageLines = [
                    `You've been banned from Koders by **${interaction.member.displayName}** for the following reason:`,
                    reason !== null ? reason : "no reason provided.",
                    ''
                ];

                if (Number.isFinite(banEntry.unbanTimestamp)) {
                    messageLines.push(`This is a __${formatTime(duration)}__ ban and you will be able to rejoin at <t:${Math.round(banEntry.unbanTimestamp / 1000)}:f>`);
                    messageLines.push(`If you wish to rejoin at that time, here is an invite: https://discord.gg/9scamAc3vw`);
                } else {
                    messageLines.push(`This is a __permanent__ ban and you will not be able to rejoin.`);
                }

                await member.send(messageLines.join('\n'));
            } catch (err) {
                failedToDm = true;
            }
        }

        let banOptions = {reason: reason, deleteMessageSeconds: interaction.options.getBoolean("keep-messages") ? 604800 : 0}
        try {
            if (member) {
                await member.ban(banOptions);
            } else {
                await interaction.guild.bans.create(id, banOptions)
            }
            banEntry.save();

            let response = `Banned **${member.displayName}**.`;
            if (failedToDm) response += " Unable to DM them, either not on server or DMs are disabled.";
            interaction.editReply(response);

            let loggingSystem = plugins.get("Logging System");
            if (loggingSystem) {
                loggingSystem.fetchLogChannel("modLogs").then(channel => {
                    let fields = [{name: "Reason:", value: reason ?? "No reason provided."}];

                    if (Number.isFinite(banEntry.unbanTimestamp)) {
                        let time = Math.round(banEntry.unbanTimestamp / 1000);
                        fields.push({name: "Unban on:", value: `<t:${time}:f> (<t:${time}:R>)`});
                    }

                    let embed = new Discord.EmbedBuilder()
                        .setTitle("Member Banned")
                        .setDescription(`Enforcing ban by <@${interaction.user.id}> on **${member.displayName}**`)
                        .setColor(0xff0000)
                        .setTimestamp()
                        .addFields(...fields);
                    channel.send({embeds: [embed]});
                });
            }
        } catch (err) {
            interaction.editReply(`Unable to complete ban: ${err}`);
        }
    });
}