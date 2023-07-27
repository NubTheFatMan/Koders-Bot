exports.type = "command";
exports.name = "Steal Sticker";
exports.calls = ["stealsticker", "ss", "sticker", "stickerlink"];

exports.callback = (message, args) => {
    message.fetchReference().then(messageWithSticker => {
        if (messageWithSticker.stickers.size > 0) {
            let sticker = messageWithSticker.stickers.first();

            let lines = [];
            lines.push(`Name: **${sticker.name}**`);
            if (sticker.description) lines.push(`Description: ${sticker.description}`);

            let created = Math.round(sticker.createdTimestamp / 1000);
            lines.push(`Created: <t:${created}:f> (<t:${created}:R>)`);

            lines.push(sticker.url);
            message.reply(lines.join('\n'));
        } else {
            message.reply("No sticker attached to this message.");
        }
    }).catch(err => {
        message.reply('You must reply to a message with a sticker.');
    });
}