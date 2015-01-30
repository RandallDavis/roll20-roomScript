//whispers to a player:
function sendWhisper(from, to, message) {
    sendChat(from, "/w " + to.split(" ")[0] + " " + message);  
}

//receives API calls from the chat interface:
on("chat:message", function(msg) {
    if(msg.type == "api") {
        if(msg.content.match(/^!roomAdd$/)) {
            roomAdd(msg.selected, msg.who);
        } else if(msg.content.match(/^!roomRemove$/)) {
            roomRemove(msg.selected, msg.who);
        } else if(msg.content.match(/^!roomSideAdd\s?/)) {
            var chatCommand = msg.content.split(' ');
            if(chatCommand.length != 3) {
                sendWhisper("API", msg.who, "Expected syntax is '!roomSideAdd [side] [type]'.");
                return;
            }
            chatCommand = msg.content.replace("!roomSideAdd ", "");
            roomSideAdd(chatCommand, msg.selected, msg.who);
        } else if(msg.content.match(/^!roomSideRemove\s?/)) {
            var chatCommand = msg.content.split(' ');
            if(chatCommand.length != 2) {
                sendWhisper("API", msg.who, "Expected syntax is '!roomSideRemove [side]'.");
                return;
            }
            chatCommand = msg.content.replace("!roomSideRemove ", "");
            roomSideRemove(chatCommand, msg.selected, msg.who);
        } else {
            sendWhisper("API", msg.who, "Unknown API command. The known ones are: 'roomAdd', 'roomRemove', 'roomSideAdd', and 'roomSideRemove'.");
        }
    }
});