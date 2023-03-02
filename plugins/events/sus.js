exports.type = 'event';
exports.name = "Something Sus Role Toggle";
exports.event = "messageCreate";

let susReactions = [
    '780678136664031234',  // ohno
    '1041500445694230538', // moyaiwhat
    '943310374848053320',  // wut
    '773607864601411584',  // no
    '968641662278565938',  // hmm
    '773607866472595456',  // tfyoujustsay

    '🧐',
    '🤨',
    '😱',
    '💀',
    '👀'
];

let alts = [
    '835188658999001198' // Nub's Alt
];
let bumRole = '1075233840861294622';
let roleToggledReaction = '773607866003226655';
let spongeDange = '<a:spongedance:824642608390471732>';
let failedToRole = '1075228765950586920';

exports.callback = message => {
    if (message.guild !== undefined && message.content.toLowerCase().includes('sus')) {
        if (alts.includes(message.author.id)) {
            let roleManager = message.member.roles;
            if (roleManager.cache.get(bumRole)) {
                roleManager.remove(bumRole)
                    .then(() => {
                        message.react(roleToggledReaction);
                        message.reply(`${spongeDange} No longer a <@&${bumRole}>`);
                    }).catch((err) => {
                        console.log(err.stack);
                        message.react(failedToRole);
                    });
            } else {
                roleManager.add(bumRole)
                    .then(() => {
                        message.react(roleToggledReaction);
                        message.reply(`${spongeDange} You are now a <@&${bumRole}>`);
                    }).catch((err) => {
                        console.log(err.stack);
                        message.react(failedToRole);
                    });
            }
        } else {
            message.react(susReactions[Math.floor(Math.random() * susReactions.length)]);
        }
    }
}