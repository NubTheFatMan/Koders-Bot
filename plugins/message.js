let devChannel;
global.messageDevs = message => {
    if (!devChannel) {
        devChannel = client.channels.resolve(startChannel);   
    }

    if (devChannel) {
        devChannel.send(message).catch(console.error);
    } else {
        console.error(`Could not send message to ${devChannel}`);
        console.log(message);
    }
}

// Ripped from old bot code. Sloppy and over commented, but I'm way to lazy to update 🗿
global.parseArgs = function(str, adv = true) {
	let out = []; //First output table, the simple one
	//Advanced Output; indexed by variable (defined by "-" before it) which as an array
	//"ban -player nub" => advOut.player[0] = "nub"
	let advOut = {__unindexed: []};

	let quote = false; //If they want an argument to contain spaces, they start it with a ". This keeps track of that.
	let s = ''; //The current string to be added to the output.

	for (let i = 0; i < str.length; i++) { //Loop through all characters of the input string
		let t = s.trim();
		if (str[i] === " " && !quote && t.length > 0) { //if character is a space, not a quote, and trimming it isn't empty
			out.push(t); //Push to output table
			s = ''; //Reset the current string
		} else if (str[i] === '"' && str[i - 1] !== "\\") { //if the string is a " and the character before wasn't a backslash
			quote = !quote; //Toggle quote
		} else {
			if (str[i] === "\\" && str[i + 1] === '"') continue; //if the character is a backslash and the next is a ", skip adding the backslash to only add the "
			s += str[i]; //Add the character to the current string
		}
	}
	let t = s.trim();
	if (t.length > 0) { //If the current string isn't empty, add it to the output
		out.push(t);
	}

	if (adv) { //Advanced output
		let cmd = "__unindexed"; //Arguments are added here if the first argument isn't a variable def
		for (let i = 0; i < out.length; i++) { //Loop through the previous output table
			if (out[i].startsWith("-")) { //Def of variable: argument starts with a -
				let newCmd = out[i].substring(1); //We want the command to be something, we don't want an empty cmd
				if (newCmd.trim().length) {
					cmd = newCmd;
					if (!advOut[cmd]) advOut[cmd] = []; //If the advanced output doesn't have a key for our variable, create one
					continue;
				}
			}
			if (out[i].substring(0, 1) === "\\-") { //If they did a backslash to prevent it becoming a new argument, we don't want that backslash
				out[i] = out[i].substring(1);
			}
			if (!advOut[cmd]) advOut[cmd] = []; //If the advanced output doesn't have a key for our variable, create one
			advOut[cmd].push(out[i]); //Push the argument to the advanced output
		}
	}
	return adv ? [advOut, out] : out;	//If advanced, return both advanced and normal output, otherwise just return the output
}