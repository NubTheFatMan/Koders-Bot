exports.type = "command";
exports.name = "Level";

exports.commandObject = {
    name: "level",
    description: "View your current level and how much XP is needed to level up."
}

exports.progressBarLength = 48;

let levelingPlugin;
exports.interactionCallback = interaction => {
    if (!levelingPlugin)
        levelingPlugin = plugins.get("Leveling Handler");

    if (!levelingPlugin)
        return interaction.reply('Unable to fetch level handler.');

    let memberLevel;
    try {
        memberLevel = levelingPlugin.getLevelInformation(interaction.member.id);
    } catch (err) {
        return interaction.reply(`Unable to fetch your level information:\`\`\`\n${err.stack}\`\`\``)
    }

    // let memberLevel = userLevels.get(interaction.member.id);
    // if (!memberLevel) 
    //     return interaction.reply("You haven't gained any experience yet! No level information is available to display.");
    
    let progress = memberLevel.experience / memberLevel.experiencedNeededToLevel;
    let boxes = Math.round(progress * this.progressBarLength);

    let lines = [
        `Current level: **${memberLevel.level}**`,
        `Experience: ${memberLevel.experience}/${memberLevel.experiencedNeededToLevel} (__${(progress * 100).toFixed(2)}%__)`,
        `\`[${'▮'.repeat(boxes)}${' '.repeat(this.progressBarLength - boxes)}]\``
    ];

    interaction.reply(lines.join('\n'));

    // ▮ 
}