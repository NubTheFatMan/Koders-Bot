exports.type = 'event';
exports.name = "Ban Isolated Member Upon Leaving";
exports.event = "guildMemberRemove";

exports.callback = member => {
    if (member.roles.highest.id !== isolatedRole) 
        return;
    
    let reason = "Leaving the server while in isolation.";
    member.ban({reason})
        .then(() => {
            Case.addEntry({
                type: Case.types.ban, 
                targets: [member.id], 
                reason: reason, 
                enforcers: [client.user.id]
            }).updateMessage();

            for (let i = 0; i < isolatedUsers.length; i++) {
                let isolation = isolatedUsers[i];
                if (isolation.userid === member.id) {
                    isolatedUsers.splice(i, 1);
                    fs.writeFileSync(isolatedFile, JSON.stringify(isolatedUsers));
                    break;
                }
            }
        })
        .catch(err => messageDevs(`Unable to ban member <@${member.id}> (${member.id}) who left while in isolation.`));
}