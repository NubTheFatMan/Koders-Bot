exports.name = "Logging System";

exports.loggingChannels = {
    messageLogs: "1131044675344662579",
    joinLogs: "1131045013707554927",
    modLogs: "1131045104778493952"
}

exports.channelsCache = {
    messageLogs: null,
    joinLogs: null,
    modLogs: null
}

exports.fetchLogChannel = async (key) => {
    return new Promise(async (resolve, reject) => {
        if (typeof key !== "string")
            return reject(new Error("Key must be a string."))

        if (!Object.keys(this.loggingChannels).includes(key))
            return reject(new Error("Invalid Key."))

        if (!this.channelsCache[key])
            this.channelsCache[key] = await client.channels.fetch(this.loggingChannels[key]);
        
        resolve(this.channelsCache[key]);
    });
}

exports.subPlugins = [
    {
        type: "event",
        name: "Audit Log Monitoring",
        event: "guildAuditLogEntryCreate",
        callback: async audit => {
            if (client.user.id !== liveClientId) return;
            let channel = await this.fetchLogChannel("modLogs");
            if (!channel) return;

            switch (audit.action) {
                case Discord.AuditLogEvent.MessageDelete: {
                    let embed = new Discord.EmbedBuilder()
                        .setTitle("Message Deleted")
                        .setDescription(`<@${audit.executorId}> deleted a message from <@${audit.targetId}> in <#${audit.extra?.channel?.id}>`)
                        .setColor(0xff3e3e)
                        .setTimestamp();
                    channel.send({embeds: [embed]});
                } break;

                case Discord.AuditLogEvent.MemberKick: {
                    if (audit.executorId === client.user.id) return;

                    let embed = new Discord.EmbedBuilder()
                        .setTitle("Member Kicked")
                        .setDescription(`<@${audit.executorId}> kicked <@${audit.targetId}>`)
                        .setColor(0xffff3e)
                        .setTimestamp()
                        .addFields({name: "Reason:", value: audit.reason ?? "No reason provided."});
                    channel.send({embeds: [embed]});

                    if (audit.executorId && audit.targetId) {
                        Case.addEntry({
                            type: Case.types.kick, 
                            targets: [audit.targetId], 
                            reason: audit.reason, 
                            enforcers: [audit.executorId]
                        }).updateMessage();
                    }
                } break;

                case Discord.AuditLogEvent.MemberBanAdd: {
                    if (audit.executorId === client.user.id) return;

                    let embed = new Discord.EmbedBuilder()
                        .setTitle("Member Banned")
                        .setDescription(`<@${audit.executorId}> banned <@${audit.targetId}>`)
                        .setColor(0xffff3e)
                        .setTimestamp()
                        .addFields({name: "Reason:", value: audit.reason ?? "No reason provided."});
                    channel.send({embeds: [embed]});

                    if (audit.executorId && audit.targetId) {
                        Case.addEntry({
                            type: Case.types.ban, 
                            targets: [audit.targetId], 
                            reason: audit.reason, 
                            enforcers: [audit.executorId]
                        }).updateMessage();
                    }
                }

                case Discord.AuditLogEvent.MemberBanRemove: {
                    if (audit.executorId === client.user.id) return;

                    let embed = new Discord.EmbedBuilder()
                        .setTitle("Member Unbanned")
                        .setDescription(`<@${audit.executorId}> unbanned <@${audit.targetId}>`)
                        .setColor(0x3eff7c)
                        .setTimestamp();
                    channel.send({embeds: [embed]});

                    if (audit.executorId && audit.targetId) {
                        Case.addEntry({
                            type: Case.types.unban, 
                            targets: [audit.targetId], 
                            enforcers: [audit.executorId]
                        }).updateMessage();
                    }
                } break;

                case Discord.AuditLogEvent.MemberUpdate: {
                    if (audit.executorId === client.user.id) return;

                    let member = await channel.guild.members.fetch(audit.targetId);
                    if (member) {
                        if (member.communicationDisabledUntilTimestamp) {
                            let time = Math.round(member.communicationDisabledUntilTimestamp / 1000);
                            let embed = new Discord.EmbedBuilder()
                                .setTitle("Member Timed Out")
                                .setDescription(`<@${audit.executorId}> timed out <@${audit.targetId}>`)
                                .setColor(0x3e86ff)
                                .setTimestamp()
                                .addFields({name: "Reason:", value: audit.reason ?? "No reason provided."}, {name: "Expires:", value: `<t:${time}:f> (<t:${time}:R>)`});
                            channel.send({embeds: [embed]});

                            Case.addEntry({
                                type: Case.types.timeout, 
                                targets: [audit.targetId], 
                                enforcers: [audit.executorId],
                                expires: member.communicationDisabledUntilTimestamp,
                                reason: audit.reason
                            }).updateMessage();
                        }
                    }

                    // channel.send(`\`\`\`json\n${JSON.stringify(audit.target)}\`\`\``);
                }
            }
        }
    },
    {
        type: "event",
        name: "Log Message Deletions",
        event: "messageDelete",
        callback: async message => {
            if (client.user.id !== liveClientId) return;
            let channel = await this.fetchLogChannel("messageLogs");
            if (!channel) return;

            let embed = new Discord.EmbedBuilder()
                .setTitle("Message Deleted")
                .setDescription(`<@${message.author.id}>'s message in <#${message.channel.id}> was deleted.`)
                .setTimestamp()
                .setColor(0xff3e3e);

            let fields = [];

            let messageObject = {embeds: [embed]};
            if (message.content.split('\n').length >= 10 || message.content.length > 1000) 
                messageObject.files = [{name: 'content.txt', attachment: Buffer.from(message.content)}];
            else
                fields.push({name: "Content:", value: message.content || "Empty message."});

            if (message.attachments.size > 0) {
                let attachments = [];
                message.attachments.forEach(attachment => {
                    attachments.push(`[${attachment.name}.${attachment.contentType}](${attachment.url})`);
                });
                fields.push({name: "Attachments (may not be available):", value: attachments.join('\n')});
            }

            if (message.stickers.size > 0) {
                let stickers = [];
                message.stickers.forEach(sticker => {
                    stickers.push(`[${sticker.name}](${sticker.url})`);
                });
                fields.push({name: "Stickers:", value: stickers.join('\n')});
            }

            embed.addFields(...fields);
            channel.send(messageObject);
        }
    },
    {
        type: "event",
        name: "Log Message Edits",
        event: "messageUpdate",
        callback: async (oldMessage, newMessage) => {
            if (client.user.id !== liveClientId) return;
            if (oldMessage.content == newMessage.content) return;
            
            let channel = await this.fetchLogChannel("messageLogs");;
            if (!channel) return;

            let embed = new Discord.EmbedBuilder()
                .setTitle('Message Edited')
                .setDescription(`<@${newMessage.author.id}> has edited their message. [Jump to message](${newMessage.url}).`)
                .setColor(0xffff3e)
                .setTimestamp();

            let attachFiles = false;
            if (oldMessage.content.split('\n').length >= 10 || oldMessage.content.length > 1000 || 
                newMessage.content.split('\n').length >= 10 || newMessage.content.length > 1000) 
                    attachFiles = true;

            let messageObject = {embeds: [embed]};
            if (attachFiles) {
                messageObject.files = [
                    {name: 'before.txt', attachment: Buffer.from(oldMessage.content)}, 
                    {name: 'after.txt',  attachment: Buffer.from(newMessage.content)}
                ];
            } else {
                embed.addFields(
                    {name: 'Before:', value: oldMessage.content},
                    {name: 'After:',  value: newMessage.content}
                );
            } 
                
            channel.send(messageObject);
        }
    }, 
    {
        type: "event",
        name: "Log Member Joining",
        event: "guildMemberAdd",
        callback: async member => {
            if (client.user.id !== liveClientId) return;
            let channel = await this.fetchLogChannel("joinLogs");;
            if (!channel) return;

            let description = `<@${member.id}> (${member.user.username} - ${member.id}) has joined the server.`;

            let created = Math.round(member.user.createdTimestamp / 1000);
            if (created < 60 * 60 * 24 * 7) 
                description += '\n' + '⚠️ Account is under a week old ⚠️';

            let embed = new Discord.EmbedBuilder()
                .setTitle('Member Joined')
                .setDescription(description)
                .setColor(0x3eff3e)
                .setTimestamp()
                .addFields({name: "Account Created:", value: `<t:${created}:f> (<t:${created}:R>)`});

            channel.send({embeds: [embed]});
        }
    }, 
    {
        type: "event",
        name: "Log Member Leaving",
        event: "guildMemberRemove",
        callback: async member => {
            if (client.user.id !== liveClientId) return;
            let channel = await this.fetchLogChannel("joinLogs");;
            if (!channel) return;

            let fields = [];

            let joined = Math.round(member.joinedTimestamp / 1000);
            let embed = new Discord.EmbedBuilder()
                .setTitle('Member Left')
                .setDescription(`**${member.displayName}** (${member.user.username} - ${member.id}) has left the server.`)
                .setColor(0xff3e3e)
                .setTimestamp();
                
            fields.push({name: "Joined:", value: `<t:${joined}:f> (<t:${joined}:R>)`},);

            if (member.roles.highest.id !== member.guild.roles.everyone.id)
                fields.push({name: "Top Role:", value: `<@&${member.roles.highest.id}>`})

            embed.addFields(...fields);
            channel.send({embeds: [embed]});
        }
    }
];