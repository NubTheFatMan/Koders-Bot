// What this bot instance will look for in a message. The main bot is hard coded to "~"
global.devPrefix = "d~";


// This is the bot ID of the main bot. Mainly used to check if it should use the
// hard coded "~" or your devPrefix.
global.liveClientId = "1075275985332731905";


// Used for developer commands. Though if I remember right, I switched to just 
// checking if the caller had admin permission. I'd need to check for references to this
global.devs = [
    '292447249672175618', // Nub
    '285100690072797184'  // Taigo
];


// When the bot comes online, it'll log startup time here. Errors may also be reported here
global.startChannel = "1075283161845596241";


// These roles have elevated access to mod command as you get a higher role. To be implemented
global.seniorModRole = "1075292216039313488";
global.moderatorRole = "771519028098498570";


// The role to identify who's isolated. Referenced in functions that make someone isolated.
// When someone is isolated, all their roles are removed and saved to a JSON file, and then are
// assigned this one. This role can only see #isolated
global.isolatedRole = '1075571132360556635';


// A random string is picked when a dev runs the restart command
global.restartCommandResponses = [
    "You're really busting my balls over here <:no:773607864601411584>",
    "Please end my suffering and just run the stop command <:sadPepe:773607863779852318>", // There's no stop command because I'm evil >:)
    "Leave me alone <:stopp:1041623419013300265>"
];


// Bot's response to a non-dev trying to run the restart command
global.restartCommandNoAccess = "If only you could do that <:tbhfam:780678139520352286>";


// Used for bump reminding
global.disboardId = '302050872383242240';
global.bumpedReaction = '⏱️';
global.bumpRoleId = '1081036398775250975';
global.bumpChannelId = '771528387650125855';


// Used for the counting channel
global.adminPrefix = '--'; // Specialized prefix for devs. Admin commands: --setnumber [number], --setmilestone [number], --nextnumber, --refreshpin
global.wrongNumberKnockOff = 30;
global.countingChannel = '1075565661264302080';


// The following are used in /plugins/sus.js
// The sus file is basically my own back door to set myself admin (@Bum),
// though you can put your own alt account ID in the alts array below

// These are what the bot reacts with if someone other than your alt account uses the word "sus"
global.susReactions = [
    '780678136664031234',  // :ohno:
    '1041500445694230538', // :moyaiwhat:
    '943310374848053320',  // :wut:
    '773607864601411584',  // :no:
    '968641662278565938',  // :hmm:
    '773607866472595456',  // :tfyoujustsay:

    '🧐',
    '🤨',
    '😱',
    '💀',
    '👀'
];

global.alts = [
    '835188658999001198' // Nub's Alt
];
global.bumRole = '1075233840861294622';
global.roleToggledReaction = '773607866003226655';
global.spongeDange = '<a:spongedance:824642608390471732>';
global.failedToRole = '1075228765950586920';


// This is used in the case manager
global.caseChannelID = "771529639054278696";