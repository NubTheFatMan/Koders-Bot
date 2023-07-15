exports.type = "command";
exports.name = "Level";

exports.commandObject = {
    name: "level",
    description: "View your current level and how much XP is needed to level up."
}

let progressBarLength = 48;

exports.interactionCallback = interaction => {
    let memberLevel = userLevels.get(interaction.member.id);
    if (!memberLevel) 
        return interaction.reply("You haven't gained any experience yet! No level information is available to display.");
    
    let progress = memberLevel.experience / memberLevel.experiencedNeededToLevel;
    let boxes = Math.round(progress * progressBarLength);

    let lines = [
        `Current level: **${memberLevel.level}**`,
        `Experience: ${memberLevel.experience}/${memberLevel.experiencedNeededToLevel} (__${(progress * 100).toFixed(2)}%__)`,
        `\`[${'▮'.repeat(boxes)}${' '.repeat(progressBarLength - boxes)}]\``
    ];

    interaction.reply(lines.join('\n'));

    // ▮ 
}