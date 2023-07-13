exports.type = "command";
exports.name = "Isolate";

let isolatedFile = process.cwd() + '/userdata/isolatedUsers.json';
global.isolatedUsers = JSON.parse(fs.readFileSync(isolatedFile));

global.isolateMember = (target, duration = 0, reason = null) => {
    let promise = new Promise(async (resolve, reject) => {
        let member;
        if (target instanceof Discord.GuildMember) member = target;
        else if (typeof target === "string" && !Number.isNaN(Number(target))) member = await client.guilds.cache.first().members.fetch(target); 

        if (member) {
            if (member.id === client.user.id) 
                reject(new Error("<:hmm:968641662278565938>"));
            else {
                let isolation = {
                    userid: member.id,
                    reason: reason,
                    roles: Array.from(member.roles.cache.keys())
                }
            
                if (!Number.isNaN(duration) && Number.isFinite(duration) && duration > 0) {
                    isolation.endTime = Date.now() + duration;
                }
            
                await member.roles.remove(isolation.roles);
                await member.roles.add(isolatedRole);
            
                isolatedUsers.push(isolation);
                fs.writeFileSync(isolatedFile, JSON.stringify(isolatedUsers));

                resolve(isolation);
            }
        } else {
            reject(new Error("Invalid target - must be a guild member or the ID of a guild member."));
        }
    });

    return promise;
}

global.getIsolationInstance = target => {
    for (let i = 0; i < isolatedUsers.length; i++) {
        let isolation = isolatedUsers[i];
        if (isolation.userid === target.id) {
            return {isolation: isolation, index: i};
        }
    }
    return null;
}

global.removeFromIsolation = (target) => {
    let promise = new Promise(async (resolve, reject) => {
        let member;
        if (target instanceof Discord.GuildMember) member = target;
        else if (typeof target === "string" && !Number.isNaN(Number(target))) member = await client.guilds.cache.first().members.fetch(target); 

        let rolesToAdd;
        for (let i = 0; i < isolatedUsers.length; i++) {
            let isolation = isolatedUsers[i];
            if (isolation.userid === member.id) {
                rolesToAdd = isolation.roles;
                isolatedUsers.splice(i, 1);
                fs.writeFileSync(isolatedFile, JSON.stringify(isolatedUsers));
                break;
            }
        }

        if (member) {
            await member.roles.remove(isolatedRole);
            await member.roles.add(rolesToAdd);

            resolve();
        } else {
            reject(new Error("Invalid target - must be a guild member or the ID of a guild member."));
        }
    });

    return promise;
}


setInterval(() => {
    for (let i = 0; i < isolatedUsers.length; i++) {
        let user = isolatedUsers[i];
        if (user.endTime && Date.now() >= user.endTime) {
            removeFromIsolation(user.userid);
        }
    }
}, 5_000);

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
        },
        {
            name: "silent",
            description: "Should the successful isolation message be publicly visible?",
            type: 5
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

    let canBan = interaction.member.permissions.has(Discord.PermissionsBitField.Flags.BanMembers);

    let duration;
    let durationRaw = interaction.options.getString("duration");
    if (durationRaw) {
        duration = parseTime(durationRaw);
        if (!Number.isFinite(duration)) {
            return interaction.reply({content: "Invalid duration.", ephemeral: true});
        } else if (duration < 10_000) {
            return interaction.reply({content: "User must be isolated for at least 10 seconds.", ephemeral: true});
        } else if (duration > 60_000 * 60 && !canBan) {
            return interaction.reply({content: "You can only isolate for up to an hour.", ephemeral: true});
        }
    } else if (!canBan) {
        return interaction.reply({content: "You must specify the duration.", ephemeral: true});
    }

    let reason = interaction.options.getString("reason");

    interaction.reply({content: `Isolating **${target.displayName}**...`, ephemeral: interaction.options.getBoolean("silent") ? true : false}).then(() => {
        isolateMember(target, duration, reason).then(isolationInstance => {
            let str = `<@${target.id}> isolated successfully.`;
        
            if (Number.isFinite(isolationInstance.endTime)) 
                str += ` They have been removed for **${formatTime(duration)}** and will return <t:${Math.round(isolationInstance.endTime / 1000)}:f>.`;
            
            interaction.editReply(str);
        }).catch(err => {
            interaction.editReply(`Unable to isolate member fully: ${err}`);
        });
    });
}