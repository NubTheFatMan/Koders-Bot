exports.type = "command";
exports.name = "Timeout";

exports.commandObject = {
    name: "timeout",
    description: "Timeout a member, preventing any sort of interaction.",
    default_member_permissions: 1 << 40, // MODERATE_MEMBERS
    options: [
        {
            name: "member",
            description: "Who should be timed out?",
            type: 6,
            required: true
        }, 
        {
            name: "duration",
            description: "How long should this member be timed out? Should be between 10 seconds (10s) and 1 week (1w)",
            type: 3,
            required: true
        },
        {
            name: "reason",
            description: "Why is this member being timed out?",
            type: 3
        },
        {
            name: "silent",
            description: "Should the successful timeout message be publicly visible?",
            type: 5
        }
    ]
}

exports.interactionCallback = async interaction => {
    if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply({content: "You don't have permission to ban members.", ephemeral: true});
    }

    let member = interaction.options.getMember("member");
    if (!member) return interaction.reply({content: "Invalid member", ephemeral: true});

    if (member.id === client.user.id) 
        return interaction.reply('💀 you funny as hell bruh'); 
    
    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({content: "Target member has higher or equal power to you.", ephemeral: true});
    }

    if (!member.manageable) {
        return interaction.reply({content: `Unable to timeout this member.`, ephemeral: true});
    }

    let durationRaw = interaction.options.getString("duration");
    if (!durationRaw)
        return interaction.reply({content: 'You must provide a duration.'});

    let duration = parseTime(durationRaw);
    if (!Number.isFinite(duration)) 
        return interaction.reply({content: "Invalid duration.", ephemeral: true});
    
    if (duration < 10_000)
        return interaction.reply({content: "You must timeout for a minimum of 10 seconds.", ephemeral: true});

    if (duration > 604_800_000)
        return interaction.reply({content: "You can only timeout for up to 1 week.", ephemeral: true});

    let reason = interaction.options.getString("reason");
    interaction.reply({content: `Timing out **${member.displayName}**...`, ephemeral: interaction.options.getBoolean("silent") ? true : false}).then(async () => {
        member.timeout(duration, reason).then(() => {
            let caseInstance = Case.addEntry({
                type: Case.types.timeout,
                reason: reason,
                enforcers: [interaction.member.id],
                targets: [member.id],
                expires: interaction.createdTimestamp + duration
            }).updateMessage();

            interaction.editReply(`Timed out **${member.displayName}**. Generated case #**${caseInstance.number}**.`);

            let loggingSystem = plugins.get("Logging System");
            if (loggingSystem) {
                loggingSystem.fetchLogChannel("modLogs").then(channel => {
                    let embed = new Discord.EmbedBuilder()
                        .setTitle("Member Timed Out")
                        .setDescription(`Enforcing timeout by <@${interaction.user.id}> on <@${member.id}>`)
                        .setColor(0xffff3e)
                        .setTimestamp()
                        .addFields({name: "Reason:", value: reason ?? "No reason provided."});
                    channel.send({embeds: [embed]});
                });
            }
        }).catch(error => {
            interaction.editReply(`Unable to timeout member:\`\`\`\n${error.stack}\`\`\``);
        });
    });
}