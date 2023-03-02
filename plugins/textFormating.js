global.removeFormatting = str => {
    return str.replace(/`+/g, '\\`').replace(/\*+/g, '\\*').replace(/\|+/g, '\\|').replace(/_+/g, '\\_').replace(/~+/g, '\\~').replace(/> /g, '\\> ');
}