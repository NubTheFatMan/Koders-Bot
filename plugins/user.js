let isolatedFile = process.cwd() + '/isolatedUsers.json';
global.isolatedUsers = JSON.parse(fs.readFileSync(isolatedFile));

let isolatedRole = '1075571132360556635';

global.isolateMember = (target, duration = 0, reason = null) => {
    let promise = new Promise(async (resolve, reject) => {
        let member;
        if (target instanceof Discord.GuildMember) member = target;
        else if (typeof target === "string" && !Number.isNaN(Number(target))) member = await client.guilds.cache.first().members.fetch(target); 

        if (member) {
            if (member.id === client.user.id) 
                reject(new Error("<:hmm:968641662278565938>"));
            else {
                let isolation = {
                    userid: member.id,
                    reason: reason,
                    roles: Array.from(member.roles.cache.keys())
                }
            
                if (!Number.isNaN(duration) && Number.isFinite(duration) && duration > 0) {
                    isolation.endTime = Date.now() + duration;
                }
            
                await member.roles.remove(isolation.roles);
                await member.roles.add(isolatedRole);
            
                isolatedUsers.push(isolation);
                fs.writeFileSync(isolatedFile, JSON.stringify(isolatedUsers));

                resolve(isolation);
            }
        } else {
            reject(new Error("Invalid target - must be a guild member or the ID of a guild member."));
        }
    });

    return promise;
}

global.getIsolationInstance = target => {
    for (let i = 0; i < isolatedUsers.length; i++) {
        let isolation = isolatedUsers[i];
        if (isolation.userid === target.id) {
            return {isolation: isolation, index: i};
        }
    }
    return null;
}

global.removeFromIsolation = (target) => {
    let promise = new Promise(async (resolve, reject) => {
        let member;
        if (target instanceof Discord.GuildMember) member = target;
        else if (typeof target === "string" && !Number.isNaN(Number(target))) member = await client.guilds.cache.first().members.fetch(target); 

        let rolesToAdd;
        for (let i = 0; i < isolatedUsers.length; i++) {
            let isolation = isolatedUsers[i];
            if (isolation.userid === member.id) {
                rolesToAdd = isolation.roles;
                isolatedUsers.splice(i, 1);
                fs.writeFileSync(isolatedFile, JSON.stringify(isolatedUsers));
                break;
            }
        }

        if (member) {
            await member.roles.remove(isolatedRole);
            await member.roles.add(rolesToAdd);

            resolve();
        } else {
            reject(new Error("Invalid target - must be a guild member or the ID of a guild member."));
        }
    });

    return promise;
}


setInterval(() => {
    for (let i = 0; i < isolatedUsers.length; i++) {
        let user = isolatedUsers[i];
        if (user.endTime && Date.now() >= user.endTime) {
            removeFromIsolation(user.userid);
        }
    }
}, 5_000);