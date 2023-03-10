exports.type = "command";
exports.name = "Remove From Isolation";
exports.calls = ['unisolate', 'unquarantine', 'reinstate', 'removefromisolation'];

exports.callback = (message, args) => {
    if (!adminRoles.includes(message.member.roles.highest.id)) return;
    if (args.length === 0) return message.reply('You need at least one argument.');

    let target = args.shift();
    if (target.match(/<@[0-9]+>/)) target = target.match(/[0-9]+/);

    if (args.length > 0) 
        duration = parseTime(args.shift().toLowerCase());

    if (args.length > 0) 
        reason = args.join(' ');

    // Search for ID
    message.guild.members.fetch(target).then(member => {
        if (member.id === client.user.id) return message.reply('<:hmm:968641662278565938>');
        if (adminRoles.includes(member.roles.highest.id)) return message.reply('<a:homerhide:773607863569481728>');

        if (!getIsolationInstance(member)) {
            return message.reply(`**${member.displayName}** is not currently isolated.`);
        }
        
        removeFromIsolation(member)
            .then(() => message.reply(`<@${member.id}> removed from isolated successfully.`))
            .catch(err => message.reply(`Unable to isolate member fully: \`${err}\``));
    }).catch(errorID => {
        message.guild.members.fetch({query: target}).then(members => {
            if (members.size > 1) return message.reply(`${members.size} members found with the query **${target}**. Please be more specific.`);
            else if (members.size === 0) return message.reply(`Unable to find a member with the query of **${target}**.`);
            
            let member = members.first();
            if (member.id === client.user.id) return message.reply('<:hmm:968641662278565938>');
            if (adminRoles.includes(member.roles.highest.id)) return message.reply('<a:homerhide:773607863569481728>');

            if (!getIsolationInstance(member)) {
                return message.reply(`**${member.displayName}** is not currently isolated.`);
            }

            removeFromIsolation(member)
                .then(() => message.reply(`<@${member.id}> removed from isolated successfully.`))
                .catch(err => message.reply(`Unable to isolate member fully: \`${err}\``));
        }).catch(errorNoNames => {
            message.reply(`Unable to find a member with the query of **${target}**.`);
        });
    });
}

exports.commandObject = {
    name: "remove-from-isolation",
    description: "Remove a member from isolation",
    default_member_permissions: 2, // 2 = kick members
    options: [
        {
            name: "member",
            description: "The person to be brought back from isolation.",
            required: true,
            type: 6
        },
    ]
}

exports.interactionCallback = interaction => {
    if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply({content: "You must be a moderator to be able to isolate members.", ephemeral: true});
    }

    let target = interaction.options.getMember("member");

    if (!target) {
        return interaction.reply({content: "Failed to get the member to be isolated.", ephemeral: true});
    }

    if (!getIsolationInstance(target)) {
        return interaction.reply({content: "This user isn't currently isolated.", ephemeral: true});
    }

    interaction.reply({content: `Removing **${target.displayName}** from isolation...`});
    removeFromIsolation(target).then(() => {
        interaction.editReply(`<@${target.id}> removed from isolation successfully.`);
    }).catch(err => {
        interaction.editReply(`Unable to remove member from isolation fully: ${err}`);
    });
}