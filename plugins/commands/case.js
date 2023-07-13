// THIS FILE IS UNTESTED :moyai:

exports.type = "command";
exports.name = "Case";

exports.commandObject = {
    name: "case",
    description: "Create or edit a case.",
    default_member_permission: 1 << 1,
    dm_permission: false,
    options: [
        {
            type: 1,
            name: "edit",
            description: "Edit an already existing case number. To edit it, you must be the one who created it.",
            options: [
                {
                    type: 4, // int
                    name: "number",
                    description: "Which case number you are editing?",
                    required: true
                },
                {
                    type: 3, // string
                    name: "reason",
                    description: "Why was this case created? Why is it being enforced?",
                    max_length: 512
                },
                {
                    type: 6, // @user
                    name: "add-enforcer",
                    description: "Was someone else involved with this case?"
                },
                {
                    type: 6, // @user
                    name: "remove-enforcer",
                    description: "Was one of the enforcers not involved with this case? You cannot remove yourself."
                },
                {
                    type: 6, // @user
                    name: "add-target",
                    description: "Was someone else affected by this case?"
                },
                {
                    type: 6, // @user
                    name: "remove-target",
                    description: "Was one of the targets not actually affected by this case?"
                }
            ]
        },
        {
            type: 1,
            name: "create",
            description: "Create a new case.",
            options: [
                {
                    type: 4, // int
                    name: "type",
                    description: "What type of case is this?",
                    required: true,
                    // autocomplete: true,
                    choices: [
                        {name: "kick",      value: 0},
                        {name: "ban",       value: 1},
                        {name: "warn",      value: 2},
                        {name: "isolation", value: 3},
                        {name: "custom",    value: 4}
                    ]
                },
                {
                    type: 6, // @user
                    name: "target",
                    description: "Who is being targetted with this case?",
                    required: true
                },
                {
                    type: 3, // string
                    name: "reason",
                    description: "Why was this case created? Why is it being enforced?",
                    max_length: 512
                }
            ]
        }, 
        {
            type: 1,
            name: "view",
            description: "Replies with a case embed.", 
            options: [{
                type: 4, // int
                name: "number",
                description: "Which case number you are trying to view?",
                required: true
            }]
        }, 
        {
            type: 1,
            name: "delete",
            description: "Deletes a case. You must be an administrator.", 
            options: [{
                type: 4, // int
                name: "number",
                description: "Which case number you are deleting?",
                required: true
            }]
        }
    ]
}

exports.interactionCallback = async interaction => {
    let command = interaction.options.getSubcommand(false);
    if (!command) 
        return interaction.reply({content: "You need to provide a subcommand.", ephemeral: true});

    switch (command) {
        case "edit": {
            let caseInstance;
            try {
                caseInstance = await Case.fetch(interaction.options.getInteger("number"));
            } catch (error) {
                return interaction.reply({content: `Unable to fetch the case: \`${error}\``, ephemeral: true});
            }

            if (!caseInstance.enforcers.includes(interaction.member.id) && !interaction.member.permissions.has(Discord.PermissionsBitField.Flags.Administrator))
                return interaction.reply({content: "You don't have permission to edit this case.", ephemeral: true});

            let reason = interaction.options.getString("reason");
            if (reason) 
                caseInstance.reason = reason.substring(0, 511);

            let enforcerAdd = interaction.options.getMember("add-enforcer");
            if (enforcerAdd && !caseInstance.enforcers.includes(enforcerAdd.id))
                caseInstance.enforcers.push(enforcerAdd.id);

            let enforcerRemove = interaction.options.getMember("remove-enforcer");
            if (enforcerRemove && caseInstance.enforcers.includes(enforcerRemove.id) && caseInstance.enforcers[0] !== enforcerRemove.id)
                caseInstance.enforcers.splice(caseInstance.enforcers.indexOf(enforcerRemove.id), 1);

            let targetAdd = interaction.options.getMember("add-target");
            if (targetAdd && !caseInstance.targets.includes(targetAdd.id))
                caseInstance.targets.push(targetAdd.id);

            let targetRemove = interaction.options.getMember("remove-target");
            if (targetRemove && caseInstance.targets.includes(targetRemove.id))
                caseInstance.targets.splice(caseInstance.targets.indexOf(targetRemove.id), 1);

            caseInstance.saveFile();
            caseInstance.updateMessage();

            interaction.reply({content: `Edited case #**${caseInstance.number}**.`, embeds: [caseInstance.embed]});
        } break;

        case "create": {
            let type = interaction.options.getInteger("type");
            if (!Object.values(Case.types).includes(type))
                return interaction.reply({content: "Invalid case type.", ephemeral: true});
            
            let member = interaction.options.getMember("target");
            if (!member)
                return interaction.reply({content: "You are required to specify a target member.", ephemeral: true});

            let caseInstance = Case.addEntry({
                type: type,
                targets: [member],
                enforcers: [interaction.member.id],
                reason: interaction.options.getString("reason")
            });
            interaction.reply({content: `Case #**${caseInstance.number}** created.`, embeds: [caseInstance.embed]});
        } break;

        case "view": {
            let caseInstance;
            try {
                caseInstance = await Case.fetch(interaction.options.getInteger("number"));
            } catch (error) {
                return interaction.reply({content: `Unable to fetch the case: \`${error}\``, ephemeral: true});
            }
            interaction.reply({embeds: [caseInstance.embed]});
        } break;

        case "delete": {
            let caseInstance;
            try {
                caseInstance = await Case.fetch(interaction.options.getInteger("number"));
            } catch (error) {
                return interaction.reply({content: `Unable to fetch the case: \`${error}\``, ephemeral: true});
            }

            if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.Administrator))
                return interaction.reply({content: "You don't have permission to delete this case.", ephemeral: true});

            caseInstance.delete();
            interaction.reply({content: "Case deleted."});
        } break;

        default:
            interaction.reply({content: "Invalid subcommand.", ephemeral: true});
        break;
    }
}