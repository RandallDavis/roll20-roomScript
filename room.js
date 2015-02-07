// Github:    https://github.com/RandallDavis/roll20-roomScript
// By:        Rand Davis
// Contact:   https://app.roll20.net/users/163846/rand

var APIRoomManagement = APIRoomManagement || (function() {
    
    var version = 0.1;

    //creates a dynamic lighting segment from A to B on the parent's page: 
    function createLosWall(parent, pointA, pointB) {
        var n = +new Date();
        var isPositiveSlope = (((pointB.y - pointA.y) == 0) || (((pointB.x - pointA.x) / (pointB.y - pointA.y)) > 0));
        var top = Math.min(pointA.y, pointB.y);
        var left = Math.min(pointA.x, pointB.x);
        var path;
        
        //create a path for a segment from A to B relative to (left,top):
        if(isPositiveSlope) {
            if(pointA.x >= pointB.x) {
                path = "[[\"M\"," + (pointA.x - pointB.x) + "," + (pointA.y - pointB.y) + "],[\"L\",0,0]]";
            } else {
                path = "[[\"M\",0,0],[\"L\"," + (pointB.x - pointA.x) + "," + (pointB.y - pointA.y) + "]]";
            }
        } else {
            if(pointA.x >= pointB.x) {
                path = "[[\"M\"," + (pointA.x - pointB.x) + ",0],[\"L\",0," + (pointB.y - pointA.y) + "]]";
            } else {
                path = "[[\"M\",0," + (pointA.y - pointB.y) + "],[\"L\"," + (pointB.x - pointA.x) + ",0]]";
            }
        }
        
        //create a segment path on the walls layer to block LoS:
        var wall = createObj("path", {
            name: String(n),
            layer: "walls",
            pageid: parent.get("pageid"),
            top: top,
            left: left,
            stroke: WALL_COLOR,
            stroke_width: 1,
            _path: path
        });
        
        //hack to get around the bug where newly created objects can't be modified:
        var p = wall.changed._fbpath;
        var new_p = p.replace(/([^\/]*\/){4}/, "/");
        wall.fbpath = new_p;
        wall.set("name", "wall_" + n);
        
        return wall;
    }
    
    //shrinks images (but sadly not paths) and moves everything over to the top left corner of the page where they can be manually deleted:
    function trashObject(obj) {
        if(obj != null) {
            obj.set("rotation", 90);
            obj.set("top", 10);
            obj.set("left", 10);
            obj.set("scale", 0.0000001);
            obj.set("width", 1);
            obj.set("height", 1);
            obj.set("layer", "gmlayer");
        }
    }
    
    //finds a point on the AB segment, that is an 'offset' distance from B:
    function findPointWithOffset(pointA, pointB, offset) {
        var distABx = pointB.x - pointA.x;
        var distABy = pointB.y - pointA.y;
        var distAB = Math.sqrt(Math.pow(distABx, 2) + Math.pow(distABy, 2));
        var distAZ = distAB - offset;
        var sinA = distABy / distAB;
        var zY = pointA.y + (sinA * distAZ);
        var zX = pointA.x + (distABx * (distAZ / distAB));
        
        return { x : zX,  y : zY };
    }
    
    /*
    Courtesy of Konrad J. (https://app.roll20.net/users/77736)
    from https://app.roll20.net/forum/post/716328/helper-function-rotate-a-token-around-one-of-nine-pivot-points#post-716857
    */
    function trueRotation(rotation) {
    // fixes Roll20 rotation property so rotation can only be between 0 and 360 deg
      if(rotation < 0) {
          rotation = 360-Math.abs(rotation%360);
      }
      rotation = Math.abs(rotation%360);
      return rotation;
    }
    
    /*
    Courtesy of Konrad J. (https://app.roll20.net/users/77736)
    from https://app.roll20.net/forum/post/716328/helper-function-rotate-a-token-around-one-of-nine-pivot-points#post-716857
    */
    function getPoints(width, height, rot, midX, midY) {
    var points = {
            topLeft : {
                x : 0,
                y : 0
    		},
    		topMid : {
    			x : 0,
    			y : 0
    		},
    		topRight : {
    			x : 0,
    			y : 0
    		},
    		midLeft : {
    			x : 0,
    			y : 0
    		},
    		midMid : {
    			x : 0,
    			y : 0
    		},
    		midRight : {
    			x : 0,
    			y : 0
    		},
    		botLeft : {
    			x : 0,
    			y : 0
    		},
    		botMid : {
    			x : 0,
    			y : 0
    		},
    		botRight : {
    			x : 0,
    			y : 0
    		}
        };
    	var hw = 0;
    	var hh = 0;
    	var cos = 0;
    	var sin = 0;
    	var x = 0;
    	var y = 0;
    		
    	// Top Left
    	hw = -width / 2;
    	hh = -height / 2;
    	cos = Math.cos(rot * (Math.PI / 180));
    	sin = Math.sin(rot * (Math.PI / 180));
    	x = hw * cos - hh * sin;
    	y = hw * sin + hh * cos;
    	points.topLeft.x = midX + x;
    	points.topLeft.y = midY + y;
    
    	// Top Mid
    	hw = 0;
    	hh = -height / 2;
    	cos = Math.cos(rot * (Math.PI / 180));
    	sin = Math.sin(rot * (Math.PI / 180));
    	x = hw * cos - hh * sin;
    	y = hw * sin + hh * cos;
    	points.topMid.x = midX + x;
    	points.topMid.y = midY + y;
    	
    	// Top Right
    	hw = width / 2;
    	hh = -height / 2;
    	cos = Math.cos(rot * (Math.PI / 180));
    	sin = Math.sin(rot * (Math.PI / 180));
    	x = hw * cos - hh * sin;
    	y = hw * sin + hh * cos;
    	points.topRight.x = midX + x;
    	points.topRight.y = midY + y;
    
    	// Mid Left
    	hw = -width / 2;
    	hh = 0;
    	cos = Math.cos(rot * (Math.PI / 180));
    	sin = Math.sin(rot * (Math.PI / 180));
    	x = hw * cos - hh * sin;
    	y = hw * sin + hh * cos;
    	points.midLeft.x = midX + x;
    	points.midLeft.y = midY + y;
    
    	// Mid Mid (Centre, we already have this)
    	hw = 0;
    	hh = 0;
    	cos = Math.cos(rot * (Math.PI / 180));
    	sin = Math.sin(rot * (Math.PI / 180));
    	x = hw * cos - hh * sin;
    	y = hw * sin + hh * cos;
    	points.midMid.x = midX + x;
    	points.midMid.y = midY + y;
    	
    	// Mid Right
    	hw = width / 2;
    	hh = 0;
    	cos = Math.cos(rot * (Math.PI / 180));
    	sin = Math.sin(rot * (Math.PI / 180));
    	x = hw * cos - hh * sin;
    	y = hw * sin + hh * cos;
    	points.midRight.x = midX + x;
    	points.midRight.y = midY + y;
    	
    	// Bottom Left
    	hw = -width / 2;
    	hh = height / 2;
    	cos = Math.cos(rot * (Math.PI / 180));
    	sin = Math.sin(rot * (Math.PI / 180));
    	x = hw * cos - hh * sin;
    	y = hw * sin + hh * cos;
    	points.botLeft.x = midX + x;
    	points.botLeft.y = midY + y;
    
    	// Bottom Mid
    	hw = 0;
    	hh = height / 2;
    	cos = Math.cos(rot * (Math.PI / 180));
    	sin = Math.sin(rot * (Math.PI / 180));
    	x = hw * cos - hh * sin;
    	y = hw * sin + hh * cos;
    	points.botMid.x = midX + x;
    	points.botMid.y = midY + y;
    	
    	// Bottom Right
    	hw = width / 2;
    	hh = height / 2;
    	cos = Math.cos(rot * (Math.PI / 180));
    	sin = Math.sin(rot * (Math.PI / 180));
    	x = hw * cos - hh * sin;
    	y = hw * sin + hh * cos;
    	points.botRight.x = midX + x;
    	points.botRight.y = midY + y;
    
    	return points;
    }
    
    /*Detects a pic on the room's page that has nothing in the gmnotes, and claims it for the room.
      Roll20 has some major bugs when creating graphic objects, so instead, require GMs to create them 
        manually, and capture them.
      Pics are selected based on their imgsrc - they need to be explicitly registered below. It would 
        be an easy modification to the code to make it that multiple pre-registered images were 
        candidates for capturing.*/
    function claimUnusedPic(room, type) {
        var pic = null;
        var imgsrc = null;
        
        switch(type) {
            case "doorOpen":
                imgsrc = DOOR_OPEN_PIC;
                break;
            case "doorClosed":
                imgsrc = DOOR_CLOSED_PIC;
                break;
            default:
                log("unknown type in claimUnusedPic(): " + type);
                return null;
        }
        
        //try to find an object eligible for capture:
        try {
            pic = findObjs({
                    type: 'graphic',
                    imgsrc: imgsrc,
                    _pageid: room.get("_pageid"),
                    gmnotes: ''
                })[0];
            
            //register the parent in the pic's gmnotes and otherwise initialize it:
            if(pic) {
                pic.set("gmnotes", "*" + type + "*%3Cbr%3E*p*" + room.id + "*%3Cbr%3E");
                pic.set("isdrawing", true);
                pic.set("layer", room.get("layer"));
            }
        } catch(e) {}
        
        return pic;
    }
    
    //does the practical drawing of a room, with specifices about different sides factored out:
    function drawRoomSideHelper(room, pointA, pointB, wallLength, wallRotation, doorPosition, instructions) {
        var gmNotes = "";
        var doorOpenPic;
        var doorClosedPic;
        
        //find or capture door images:
        switch(instructions[0]) {
            case "doorOpen":
            case "doorClosed":
                
                //open door pic ID should be the second instruction if one exists:
                if(instructions.length >= 3) {
                    doorOpenPic = getObj("graphic", instructions[1]);
                }
                if(!doorOpenPic) {
                    doorOpenPic = claimUnusedPic(room, "doorOpen");
           
                    //if there was no pic to claim, whine about it:
                    if(!doorOpenPic) {
                        sendChat("API", "Feed me an open door pic!");
                    }
                }
                if(doorOpenPic) {
                    gmNotes = gmNotes + doorOpenPic.id;
                }
                gmNotes = gmNotes + ".";
                
                //closed door pic ID should be the third instruction if one exists:
                if(instructions.length >= 2) {
                    doorClosedPic = getObj("graphic", instructions[2]);
                }
                if(!doorClosedPic) {
                    doorClosedPic = claimUnusedPic(room, "doorClosed");
           
                    //if there was no pic to claim, whine about it:
                    if(!doorClosedPic) {
                        sendChat("API", "Feed me a closed door pic!");
                    }
                }
                if(doorClosedPic) {
                    gmNotes = gmNotes + doorClosedPic.id;
                }
                gmNotes = gmNotes + ".";
                
                break;
        }
        
        //position the open door image:
        if(doorOpenPic) {
            doorOpenPic.set("layer", room.get("layer"));
            doorOpenPic.set("rotation", room.get("rotation") + wallRotation + 90);
            doorOpenPic.set("top", doorPosition.y);
            doorOpenPic.set("left", doorPosition.x);
        }
        
        //position the closed door image:
        if(doorClosedPic) {
            doorClosedPic.set("layer", room.get("layer"));
            doorClosedPic.set("rotation", room.get("rotation") + wallRotation + 90);
            doorClosedPic.set("top", doorPosition.y);
            doorClosedPic.set("left", doorPosition.x);
        }
        
        //draw doors and walls:
        switch(instructions[0]) {
            case "doorOpen":
                
                //show open door image:
                if(doorOpenPic) {
                    doorOpenPic.set("height", 26);
                    doorOpenPic.set("width", 70);
                }
                
                //hide the closed door image:
                if(doorClosedPic) {
                    doorClosedPic.set("height", 0);
                    doorClosedPic.set("width", 0);
                }
                
                //draw walls if wall is wide enough to draw around the door and the room isn't on the gm layer:
                if(room.get("layer") != 'gmlayer' && wallLength >= 80) {
                    //create walls except where the door is:
                    var wall = createLosWall(room, pointA, findPointWithOffset(pointA, doorPosition, 35));
                    gmNotes = gmNotes + wall.id + ".";
                    wall = createLosWall(room, findPointWithOffset(pointB, doorPosition, 35), pointB);
                    gmNotes = gmNotes + wall.id;
                } else {
                    gmNotes = gmNotes + ".";
                }
                break;
            case "doorClosed":
                
                //hide open door image:
                if(doorOpenPic) {
                    doorOpenPic.set("height", 0);
                    doorOpenPic.set("width", 0);
                }
                
                //show the closed door image:
                if(doorClosedPic) {
                    doorClosedPic.set("height", 28);
                    doorClosedPic.set("width", 70);
                }
            case "wall":
                //draw wall if the room isn't on the gm layer:
                if(room.get("layer") != 'gmlayer') {
                    var wall = createLosWall(room, pointA, pointB);
                    gmNotes = gmNotes + wall.id;
                }
                break;
        }
        
        return gmNotes;
    }
    
    //draws the side of a room:
    function drawRoomSide(room, roomXY, side, instructions, toggle) {
        
        var oldWalls = "";
        
        //record old walls that need to be deleted:
        try {
            //oldWall ID is always the last instruction; if there is no wall, it is empty:
            oldWalls = oldWalls + instructions[instructions.length-1];
            
            //if the side was an open door, then there were two walls:
            if(instructions[0] == "doorOpen") {
                oldWalls = oldWalls + "." + instructions[instructions.length-2];
            }
        } catch(e) { 
            log(e.name + ": " + e.message);
        }
        
        //toggle doors:
        if(toggle) {
            switch(instructions[0]) {
                case "doorOpen":
                    instructions[0] = "doorClosed";
                    break;
                case "doorClosed":
                    instructions[0] = "doorOpen";
                    break;
                default:
                    log("unexpected type for a toggle: " + instructions[0]);
            }
        }
        
        var gmNotes = "*" + side + "*" + instructions[0] + ".";
        
        //draw new side:
        switch(side) {
            case "l":
                gmNotes = gmNotes + drawRoomSideHelper(room, roomXY.topLeft, roomXY.botLeft, room.get("height"), 0, roomXY.midLeft, instructions);
                break;
            case "r":
                gmNotes = gmNotes + drawRoomSideHelper(room, roomXY.topRight, roomXY.botRight, room.get("height"), 0, roomXY.midRight, instructions);
                break;
            case "t":
                gmNotes = gmNotes + drawRoomSideHelper(room, roomXY.topLeft, roomXY.topRight, room.get("width"), 90, roomXY.topMid, instructions);
                break;
            case "b":
                gmNotes = gmNotes + drawRoomSideHelper(room, roomXY.botLeft, roomXY.botRight, room.get("width"), 90, roomXY.botMid, instructions);
                break;
            default:
                log("unexpected side in drawRoomWall: " + side);
        }
        
        //delete old walls:
        try {
            oldWallList = oldWalls.split('.');
            
            for(var i = 0;i < oldWallList.length;i++) {
                trashObject(getObj("path", oldWallList[i]));
            }
        } catch(e) { 
            log(e.name + ": " + e.message);
        }
        
        return gmNotes + "*%3Cbr%3E";
    }
    
    //determines if one (and only one) room is selected and returns it if so:
    function selectedRoom(selected, who) {
        if(!selected || selected.length < 1) {
            sendWhisper("API", who, "You need to have a room selected.");
            return;
        } else if(selected.length > 1) {
            sendWhisper("API", who, "Only one object can be selected.");
            return;
        }
        
        var room = getObj("graphic", selected[0]._id);
        var gmNotes = room.get("gmnotes");
        
        if(!gmNotes.match(/^\*room\*/)) {
            sendWhisper("API", who, "The selected object must be a room.");
            return;
        }
        
        return room;
    }
    
    //determines if one (and only one) empty image is selected and returns it if so:
    function selectedEmptyImage(selected, who) {
        if(!selected || selected.length < 1) {
            sendWhisper("API", who, "You need to have a picture selected.");
            return;
        } else if(selected.length > 1) {
            sendWhisper("API", who, "Only one object can be selected.");
            return;
        }
        
        var pic = getObj("graphic", selected[0]._id);
        var gmNotes = pic.get("gmnotes");
        
        if(gmNotes) {
            sendWhisper("API", who, "The selected object must be a picture that isn't already used for anything. The one you have selected has gmnotes.");
            return;
        }
        
        return pic;
    }
    
    //turns the selected picture into a room:
    function roomAdd(selected, who) {
        var pic = selectedEmptyImage(selected, who);
        
        if(pic) {
            //initialize room:
            pic.set("layer", "map");
            pic.set("isdrawing", true);
            pic.set("gmnotes", "*room*%3Cbr%3E");
        }
    }
    
    //removes the selected room:
    function roomRemove(selected, who) {
        var room = selectedRoom(selected, who);
        
        if(room) {
            var gmNotes = room.get("gmnotes");
            var sideMetas = gmNotes.match(/\*\S\*([^\*]+)/g);
            var idsToKill = [];
            
            for(var i = 0;i < sideMetas.length;i++) {
                var sideMeta = sideMetas[i].substring(3).split('.');
                for(var i2 = 0;i2 < sideMeta.length;i2++) {
                    idsToKill.push(sideMeta[i2]);
                }
            }
            
            for(var i = 0;i < idsToKill.length;i++) {
                trashObject(getObj("path", idsToKill[i]));
                trashObject(getObj("graphic", idsToKill[i]));
            }
            
            trashObject(room);
        }
    }
    
    //adds the specified side to the selected room:
    function roomSideAdd(command, selected, who) {
        var commands = command.split(' ');
        
        //validate side:
        switch(commands[0]) {
            case "t":
            case "b":
            case "l":
            case "r":
                break;
            default:
                sendWhisper("API", who, "Side must be 't', 'b', 'l', or 'r'.");
                return;
        }
        
        //validate type:
        switch(commands[1]) {
            case "empty":
            case "wall":
            case "doorClosed":
            case "doorOpen":
                break;
            default:
                sendWhisper("API", who, "Type must be 'empty', 'wall', 'doorClosed', or 'doorOpen'.");
                return;
        }
        
        var room = selectedRoom(selected, who);
        
        if(room) {
            //make sure the side doesn't already exist:
            var gmNotes = room.get("gmnotes");
            var sideMetas = gmNotes.match(/\*\S\*([^\*]+)/g);
            var sideMeta;
            
            if(sideMetas) {
                for(var i = 0;i < sideMetas.length;i++) {
                    if (sideMetas[i].substring(1, 2) == commands[0]) {
                        sendWhisper("API", who, "That side is already on that room.");
                        return;
                    } 
                }
            }
            
            //add the side:
            room.set("gmnotes", gmNotes + "*" + commands[0] + "*" + commands[1] + "*%3Cbr%3E");
            drawRoom(room);
        }
    }
    
    //removes the side of a selected room:
    function roomSideRemove(side, selected, who) {
        var room = selectedRoom(selected, who);
        
        if(room) {
            var gmNotes = room.get("gmnotes");
            var sideMetas = gmNotes.match(/\*\S\*([^\*]+)/g);
            var sideMeta;
            var newGmNotes = "*room*%3Cbr%3E";
            
            if(sideMetas) {
                for(var i = 0;i < sideMetas.length;i++) {
                    if (sideMetas[i].substring(1, 2) == side) {
                        sideMeta = sideMetas[i];
                    } else {
                        //write the meta into back into gmnotes:
                        newGmNotes = newGmNotes + sideMetas[i] + "*%3Cbr%3E";
                    }
                }
            }
            
            if(!sideMeta) {
                sendWhisper("API", who, "The side '" + side + "' cannot be found in the selected room.");
                return;
            }
            
            var idsToKill = sideMeta.substring(3).split('.');
            
            for(var i = 0;i < idsToKill.length;i++) {
                trashObject(getObj("path", idsToKill[i]));
                trashObject(getObj("graphic", idsToKill[i]));
            }
            
            room.set("gmnotes", newGmNotes);
        }
    }
    
    //redraws the room:
    function drawRoom(room) {
        var roomXY = getPoints(room.get("width"), room.get("height"), room.get("rotation"), room.get("left"), room.get("top"));
        var sideMeta = room.get("gmnotes").match(/\*\S\*([^\*]+)/g);
        var newGmNotes = "*room*%3Cbr%3E";
        
        //redraw sides of the room:
        if(sideMeta != null) {
            for(var i = 0;i < sideMeta.length;i++) {
                try {
                    var sideMetaInstructions = sideMeta[i].substring(3).split('.');
                    
                    //redraw room side:
                    newGmNotes = newGmNotes + drawRoomSide(room, roomXY, sideMeta[i].substring(1, 2), sideMetaInstructions, false);
                } catch(e) {
                    log(e.name + ": " + e.message);
                }
            }
        }
    
        room.set("gmnotes", newGmNotes);
    }
    
    //toggles a door's state and redraws room:
    //this was inspired by John's (https://app.roll20.net/users/25259) Command Doors (https://gist.github.com/goblinHordes/6894547)
    function toggleDoor(door) {
        var doorMeta = door.get("gmnotes").match(/\*p\*([^\*]+)/g);
        var roomId = doorMeta[0].substring(3);
        var room = getObj("graphic", roomId);
        
        if(!room) {
            sendChat("API", "I can't find a room associated with this door.");
            return;
        }
        
        //find the room side that the door is on:
        var roomGmNotes = room.get("gmnotes");
        var roomMeta = roomGmNotes.match(/\*\S\*([^\*]+)/g);
        var roomSideMeta;
        var newGmNotes = "*room*%3Cbr%3E";
        for(var i = 0;i < roomMeta.length;i++) {
            if(roomMeta[i].indexOf(door.id) >= 0) {
                roomSideMeta = roomMeta[i];
            } else {
                //write the meta into back into gmnotes:
                newGmNotes = newGmNotes + roomMeta[i] + "*%3Cbr%3E";
            }
        }
        
        if(!roomSideMeta) {
            sendChat("API", "I can't find a room side associated with this door.");
            return;
        }
        
        var roomXY = getPoints(room.get("width"), room.get("height"), room.get("rotation"), room.get("left"), room.get("top"));
        var roomSideMetaInstructions = roomSideMeta.substring(3).split('.');
                    
        //redraw room side:
        newGmNotes = newGmNotes + drawRoomSide(room, roomXY, roomSideMeta.substring(1, 2), roomSideMetaInstructions, true);
 
        room.set("gmnotes", newGmNotes);
    }
    
    //whispers to a player:
    function sendWhisper(from, to, message) {
        sendChat(from, "/w " + to.split(" ")[0] + " " + message);  
    }
    
    //expose public functions:
    return {
        sendWhisper: sendWhisper,
        drawRoom: drawRoom,
        toggleDoor: toggleDoor,
        roomAdd: roomAdd,
        roomRemove: roomRemove,
        roomSideAdd: roomSideAdd,
        roomSideRemove: roomSideRemove
    }

})();

//detects any changes to graphics:
on("change:graphic", function(obj) {    
    
    if(obj.get("gmnotes").match(/^\*room\*/)) {
        APIRoomManagement.drawRoom(obj);
    }
    else if(obj.get("gmnotes").match(/^\*door(Open|Closed)\*/)) {
        APIRoomManagement.toggleDoor(obj);
    }
});

//receives API calls from the chat interface:
on("chat:message", function(msg) {
    if(msg.type == "api" && msg.content.match(/^!room/)) {
        if(msg.content.match(/^!roomAdd$/)) {
            APIRoomManagement.roomAdd(msg.selected, msg.who);
        } else if(msg.content.match(/^!roomRemove$/)) {
            APIRoomManagement.roomRemove(msg.selected, msg.who);
        } else if(msg.content.match(/^!roomSideAdd\s?/)) {
            var chatCommand = msg.content.split(' ');
            if(chatCommand.length != 3) {
                APIRoomManagement.sendWhisper("API", msg.who, "Expected syntax is '!roomSideAdd [side] [type]'.");
                return;
            }
            chatCommand = msg.content.replace("!roomSideAdd ", "");
            APIRoomManagement.roomSideAdd(chatCommand, msg.selected, msg.who);
        } else if(msg.content.match(/^!roomSideRemove\s?/)) {
            var chatCommand = msg.content.split(' ');
            if(chatCommand.length != 2) {
                APIRoomManagement.sendWhisper("API", msg.who, "Expected syntax is '!roomSideRemove [side]'.");
                return;
            }
            chatCommand = msg.content.replace("!roomSideRemove ", "");
            APIRoomManagement.roomSideRemove(chatCommand, msg.selected, msg.who);
        } else {
            APIRoomManagement.sendWhisper("API", msg.who, "Unknown API command. The known ones are: 'roomAdd', 'roomRemove', 'roomSideAdd', and 'roomSideRemove'.");
        }
    }
});