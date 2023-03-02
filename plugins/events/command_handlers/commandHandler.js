exports.type = 'event';
exports.name = "Command Handler";
exports.event = "messageCreate";

exports.callback = message => {
    if (message.author.bot) return;

    let prefix = client.user.id === liveClientId ? '~' : devPrefix;

    let pat = [`<@${client.user.id}>`, `<@!${client.user.id}>`];

    let msg = message.content;
    if (msg === pat[0] || msg === pat[1]) {
        message.reply(`My prefix is \`${prefix}\``).catch(console.error);
        return;
    }

    if (msg.startsWith(pat[0])) {
        prefix = pat[0];
    } else if (msg.startsWith(pat[1])) {
        prefix = pat[1];
    }

    if (!msg.startsWith(prefix)) return;

    let args = msg.slice(prefix.length).trim().split(/ +/g);
    let cmd = removeFormatting(args.shift().toLowerCase());

    let ran = false;
    for (let [name, command] of commands) {
        let can = command.allowed?.length ? command.allowed.includes(message.author.id) : true;
        if (can) {
            for (let call of command.calls) {
                if (cmd === call) {
                    ran = true;
                    try {
                        command.callback(message, args);
                    } catch (err) {
                        console.error(err);
                        messageDevs(`**${message.author.tag}** (${message.author.id}) encountered an error in command \`${cmd}\`.\`\`\`\n${err.stack}\`\`\``);
                        message.reply(`An error occured while executing the command \`${name}\`. Developers have been notified, so you don't need to do anything!`).catch(console.error);
                    } finally {
                        break;
                    }
                }
            }
        }
    }

    if (!ran) {
        message.reply(`Unknown command`).catch(console.error);
        return;
    }
}