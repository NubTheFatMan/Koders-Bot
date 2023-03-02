exports.type = "command";
exports.name = "Steal Sticker";
exports.calls = ["stealsticker", "ss", "sticker", "stickerlink"];

exports.callback = (message, args) => {
    message.fetchReference().then(messageWithSticker => {
        if (messageWithSticker.stickers.size > 0) {
            message.reply(messageWithSticker.stickers.first().url);
        } else {
            message.reply("No sticker attached to this message.");
        }
    }).catch(err => {
        message.reply('You must reply to a message.');
    });
}