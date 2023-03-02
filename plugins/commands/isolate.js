exports.type = "command";
exports.name = "Isolate";
exports.calls = ['isolate', 'quarantine'];

exports.callback = (message, args) => {
    if (!adminRoles.includes(message.member.roles.highest.id)) return;
    if (args.length === 0) return message.reply('You need at least one argument.');

    let target = args.shift();
    if (target.match(/<@[0-9]+>/)) target = target.match(/[0-9]+/);

    let duration;
    let reason;

    if (args.length > 0) 
        duration = parseTime(args.shift().toLowerCase());

    if (args.length > 0) 
        reason = args.join(' ');

    // Search for ID
    message.guild.members.fetch(target).then(member => {
        if (member.id === client.user.id) return message.reply('<:hmm:968641662278565938>');
        if (adminRoles.includes(member.roles.highest.id)) return message.reply('<a:homerhide:773607863569481728>');

        if (getIsolationInstance(member)) {
            return message.reply(`**${member.displayName}** is already isolated.`);
        }
        
        isolateMember(member, duration, reason).then(isolation => {
            let str = `<@${member.id}> isolated successfully.`;
            
            if (Number.isFinite(isolation.endTime)) 
            str += ` They have been removed for **${formatTime(duration)}** and will return <t:${Math.round(isolation.endTime / 1000)}:f>.`;
            
            message.reply(str);
        }).catch(err => {
            message.reply(`Unable to isolate member fully: \`${err}\``)
        });
    }).catch(errorID => {
        message.guild.members.fetch({query: target}).then(members => {
            if (members.size > 1) return message.reply(`${members.size} members found with the query **${target}**. Please be more specific.`);
            else if (members.size === 0) return message.reply(`Unable to find a member with the query of **${target}**.`);
            
            let member = members.first();
            if (member.id === client.user.id) return message.reply('<:hmm:968641662278565938>');
            if (adminRoles.includes(member.roles.highest.id)) return message.reply('<a:homerhide:773607863569481728>');

            if (getIsolationInstance(member)) {
                return message.reply(`**${member.displayName}** is already isolated.`);
            }

            isolateMember(member, duration, reason).then(isolation => {
                let str = `<@${member.id}> isolated successfully.`;
    
                if (Number.isFinite(isolation.endTime)) 
                    str += ` They have been removed for **${formatTime(duration)}** and will return <t:${Math.round(isolation.endTime / 1000)}:f>.`;
    
                message.reply(str);
            }).catch(err => {
                message.reply(`Unable to isolate member fully: \`${err}\``)
            });
        }).catch(errorNoNames => {
            message.reply(`Unable to find a member with the query of **${target}**.`);
        });
    });
}

exports.commandObject = {
    name: "isolate",
    description: "Put a member in isolation. Removes them from all channels and roles.",
    default_member_permissions: 2, // 2 = kick members
    options: [
        {
            name: "member",
            description: "The person to be isolated from the server.",
            required: true,
            type: 6
        },
        {
            name: "duration",
            description: "How long should the user be isolated for? Mods are limited to 10s - 1h (10 seconds - 1 hour).",
            type: 3
        },
        {
            name: "reason",
            description: "Why this user is being isolated.",
            type: 3
        }
    ]
}

exports.interactionCallback = interaction => {
    if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.KickMembers)) {
        return interaction.reply({content: "You must be a moderator to be able to isolate members.", ephemeral: true});
    }

    let target = interaction.options.getMember("member");

    if (!target) {
        return interaction.reply({content: "Failed to get the member to be isolated.", ephemeral: true});
    }

    if (target.roles.highest.position >= interaction.member.roles.highest.position && interaction.member.id !== interaction.guild.ownerId) {
        return interaction.reply({content: "Target member has higher or equal power to you.", ephemeral: true});
    }

    if (getIsolationInstance(target)) {
        return interaction.reply({content: "This member is already isolated.", ephemeral: true});
    }

    let duration;
    let durationRaw = interaction.options.getString("duration");
    if (durationRaw) {
        duration = parseTime(durationRaw);
        if (!Number.isFinite(duration)) {
            return interaction.reply({content: "Invalid duration.", ephemeral: true});
        } else if (duration < 10_000 && duration !== 0) {
            return interaction.reply({content: "User must be isolated for at least 10 seconds.", ephemeral: true});
        } else if (duration > 60_000 * 60 && !interaction.member.permissions.has(Discord.PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({content: "You can only isolate for up to an hour.", ephemeral: true});
        }
    }

    let reason = interaction.options.getString("reason");

    interaction.reply({content: `Isolating **${target.displayName}**...`});
    isolateMember(target, duration, reason).then(isolationInstance => {
        let str = `<@${target.id}> isolated successfully.`;
    
        if (Number.isFinite(isolationInstance.endTime)) 
            str += ` They have been removed for **${formatTime(duration)}** and will return <t:${Math.round(isolationInstance.endTime / 1000)}:f>.`;
        
        interaction.editReply(str);
    }).catch(err => {
        interaction.editReply(`Unable to isolate member fully: ${err}`);
    });
}