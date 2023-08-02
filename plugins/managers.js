global.refreshEvents = () => {
    for (let event of client.eventNames()) {
        client.removeAllListeners(event);
    }

    for (let [name, ev] of eventHandlers) {
        client.on(ev.event, ev.callback);
    }
}

global.refreshEvent = (ev) => {
    if (ev instanceof Object && ev.type === 'event') {
        client.removeListener(ev.event, ev.callback);

        client.on(ev.event, ev.callback);
    }
}

global.calculateSlashCommandsArray = () => {
    let apiSlashCommandInput = [];
    slashCommands.forEach(plugin => {
        apiSlashCommandInput.push(plugin.commandObject);
    });
    return apiSlashCommandInput;
}