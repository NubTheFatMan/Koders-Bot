exports.type = "command";
exports.name = "Eval";
exports.calls = ['eval'];

let logs = [];
function log() {
    logs.push(
        Array.from(arguments)
            .join(" ")
            .replace(process.env.DISCORD_TOKEN, "HIDDEN")
    );
}
let oldLog = console.log;

exports.callback = (message, args) => {
    if (!message.member.permissions.has(Discord.PermissionsBitField.Flags.Administrator)) return;

    if (!args.length) return message.reply(`You must provide code to evaluate.`);

    let code = args.join(" ").replace('```js', '').replace('```', '');
    console.log = log;
    logs = [];
    try {
        let start = new Stopwatch();
        let result = eval(code);
        let time = start.stop().toString();

        let msgObj = {};

        if (logs.length > 0) {
            let buffer = Buffer.from(logs.join("\n"));
            msgObj.files = [{attachment: buffer, name: "console.txt"}];
        }

        if (result === undefined || result === null) msgObj.content = `Evaluated successfully, no output.\n⏱️ Took \`${time}\``;
        else if (result instanceof Object || result instanceof Array) result = JSON.stringify(result, null, 2);
        else if (typeof result !== "string") result = result !== undefined ? result.toString() : "";

        if (!msgObj.content) {
            if (result.length > 1900) {
                let buffer = Buffer.from(
                    result.replace(process.env.OPENAI_API_KEY, 'HIDDEN')
                    .replace(process.env.DISCORD_BOT_TOKEN, "HIDDEN")
                    .replace(process.env.TEST_BOT_TOKEN, "HIDDEN")
                );
                msgObj.content = `Evaluated without error.\n⏱️ Took \`${time}\``;

                if (!msgObj.files) msgObj.files = [{attachment: buffer, name: "result.txt"}];
                else msgObj.files.push({attachment: buffer, name: "result.txt"});
            } else {
                msgObj.content = `Evaluated without error.\n⏱️ Took \`${time}\`\n\`\`\`\n${result}\`\`\``;
            }
        }

        msgObj.content = msgObj.content
            .replace(process.env.DISCORD_TOKEN, 'HIDDEN');

        message.reply(msgObj).catch(err => {
            message.reply(`Output too large but unable to attach file. Evaluated without error.\n⏱️ Took \`${time}\`\n\`${err.toString().replace('DiscordAPIError: ', '')}\``).catch(console.error);
        });
    } catch (err) {
        message.reply(`An error occured while evaluating that code.\`\`\`\n${err.stack}\`\`\``).catch(console.error);
    }
    console.log = oldLog;
}