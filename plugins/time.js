let times = {};
times.s = 1000;
times.m = times.s * 60;
times.h = times.m * 60;
times.d = times.h * 24;
times.w = times.d * 7;
times.y = times.w * 52;

// Parses a time string into ms time: 5d3h = 5 days, 3 hours
global.parseTime = input => {
    if (typeof input !== "string") return NaN;
    if (input.includes("forever")) return Infinity;

    if (!input.match(/[0-9]/)) return new Error("No number to quantify time.");

    let keys = Object.keys(times);
    let regexSplitter = new RegExp(`[(${keys.join(')(?:')})]`, 'g');
    let slicePosition = 0;
    let value = 0;

    let matchesLeft = 32;
    while (--matchesLeft) {
        let result = regexSplitter.exec(input);
        if (result === null) break;
        
        let timeType = input.charAt(result.index);
        if (keys.includes(timeType)) {
            let thisValue = Number(input.substring(slicePosition, result.index));
            if (Number.isFinite(thisValue) && !Number.isNaN(thisValue)) {
                value += thisValue * times[timeType];
            }
        }

        slicePosition = result.index + 1;
    }

    return value;
}


global.formatTime = ms => {
    if (Number.isNaN(ms)) return "NaN";
    if (!Number.isFinite(ms) || ms <= 0) return "forever";

    let t = Math.floor(ms / 1000);

    let seconds = t % 60;
    let minutes = Math.floor((t / 60) % 60);
    let hours   = Math.floor((t / 3600) % 24);
    let days    = Math.floor(((t / 3600) / 24) % 7);
    let weeks   = Math.floor(((t / 3600) / 24) / 7);

    let stringArray = [];
    if (weeks   > 0) stringArray.push(weeks   + " week"    + (weeks   > 1 ? "s" : ""));
    if (days    > 0) stringArray.push(days    + " day"     + (days    > 1 ? "s" : ""));
    if (hours   > 0) stringArray.push(hours   + " hour"    + (hours   > 1 ? "s" : ""));
    if (minutes > 0) stringArray.push(minutes + " minute"  + (minutes > 1 ? "s" : ""));
    if (seconds > 0) stringArray.push(seconds + " second"  + (seconds > 1 ? "s" : ""));

    if (stringArray.length === 0) return "forever";
    return stringArray.join(" ");
}