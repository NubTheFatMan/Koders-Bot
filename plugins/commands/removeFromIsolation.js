exports.type = "command";
exports.name = "Remove From Isolation";

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