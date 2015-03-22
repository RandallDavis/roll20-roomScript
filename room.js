// Github:    https://github.com/RandallDavis/roll20-roomScript
// By:        Rand Davis
// Contact:   https://app.roll20.net/users/163846/rand

var APIRoomManagement = APIRoomManagement || (function() {
    
    var version = 1.3,
        schemaVersion = 0.3;
        
    function checkInstall() {
        if( ! _.has(state,'APIRoomManagement') || state.APIRoomManagement.version !== schemaVersion) {
            log('APIRoomManagement: Resetting state. Door images will need to be set.');
            state.APIRoomManagement = {
                version: schemaVersion,
                wallColor: "#00FF00",
                doorOpenPicUrl: "",
                doorClosedPicUrl: "",
                adhocDoorMoveMode: 1,
                doorPrivsDefault: 0, //0 = gm only, 1 = all players
            };
        }
    }
    
    //create object:
    function fixedCreateObj()
    {
        var obj = createObj.apply(this, arguments);
        return obj;
    }
    
    //find imgsrc that is legal for object creation
    var getCleanImgsrc = function (imgsrc) {
        var parts = imgsrc.match(/(.*\/images\/.*)(thumb|max)(.*)$/);
        
        if(parts) {
          return parts[1] + 'thumb' + parts[3];
        }
        return;
    };

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
        var wall = fixedCreateObj("path", {
            name: "wall_" + String(n),
            layer: "walls",
            pageid: parent.get("pageid"),
            top: top,
            left: left,
            stroke: state.APIRoomManagement.wallColor,
            stroke_width: 1,
            _path: path
        });
       
        return wall;
    }
    
    //Deletes objects. In case deletion failes, shrinks images (but sadly not paths) and moves everything over to the top left corner of the page where they can be manually deleted:
    function trashObject(obj) {
        if(obj != null) {
            setTimeout(function() {
                obj.set("rotation", 90);
                obj.set("top", 10);
                obj.set("left", 10);
                obj.set("scale", 0.0000001);
                obj.set("width", 1);
                obj.set("height", 1);
                obj.set("layer", "gmlayer");
                obj.remove();
            }, 5);
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
    
    /*Creates a pic and claims it for the room.
      Pics are created based on the imgsrc in the state object. It would be an easy modification 
        to the code to make it that multiple pre-registered images were candidates for capturing.*/
    function createAndClaimPic(room, type) {
        var pic = null;
        var imgsrc = null;
        
        switch(type) {
            case "doorOpen":
                imgsrc = state.APIRoomManagement.doorOpenPicUrl;
                break;
            case "doorClosed":
                imgsrc = state.APIRoomManagement.doorClosedPicUrl;
                break;
            default:
                log("unknown type in createAndClaimPic(): " + type);
                return null;
        }
        
        if(imgsrc.length == 0) {
            sendChat("API", "Door image needs to be set up for " + type);
            return null;
        }
        
        //try to create an object eligible for capture:
        try {
            
            //create the door pic in the trash pile (in case timeout occurs):
            setTimeout(function() {
                fixedCreateObj('graphic', {
                    imgsrc: imgsrc,
                    layer: "gmlayer",
                    pageid: room.get("pageid"),
                    top: 10,
                    left: 10,
                    width: 1,
                    height: 1,
                    scale: 0.0000001
                });
            }, 5);
            
            //sleep so that the creation attempt has a chance to complete:
            log("Sleeping briefly to wait for image creation.");
            sleep(2000);
            
            //find the newly created pic:
            pic = findObjs({
                    type: 'graphic',
                    imgsrc: imgsrc,
                    _pageid: room.get("_pageid"),
                    layer: "gmlayer",
                    gmnotes: ''
                })[0];
                
            //register the parent in the pic's gmnotes and otherwise initialize it:
            if(pic) {
                pic.set("gmnotes", "*" + type + "*%3Cbr%3E*p*" + room.id + "*%3Cbr%3E");
                pic.set("isdrawing", true);
                pic.set("layer", room.get("layer"));
                if(state.APIRoomManagement.doorPrivsDefault == 1) {
                    pic.set("controlledby", "all");
                }
                toFront(pic);
            } else {
                log("Unable to claim newly created picture.");
            }
        } catch(e) {
            log("Error: " + e);
        }
        
        return pic;
    }
    
    //sleep function:
    function sleep(milliseconds) {
        var start = new Date().getTime();
        for(var i = 0; i < 1e7; i++) {
            if((new Date().getTime() - start) > milliseconds) {
              break;
            }
        }
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
                    doorOpenPic = createAndClaimPic(room, "doorOpen");
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
                    doorClosedPic = createAndClaimPic(room, "doorClosed");
                }
                if(doorClosedPic) {
                    gmNotes = gmNotes + doorClosedPic.id;
                }
                gmNotes = gmNotes + ".";
                
                break;
        }
        
        //position the open door image:
        if(doorOpenPic) {
            if(doorOpenPic.get("controlledby").match(/^all/) && room.get("layer") != "gmlayer") {
                doorOpenPic.set("layer", "objects");
            } else {
                doorOpenPic.set("layer", room.get("layer"));
            }
            doorOpenPic.set("rotation", room.get("rotation") + wallRotation + 90);
            doorOpenPic.set("top", doorPosition.y);
            doorOpenPic.set("left", doorPosition.x);
        }
        
        //position the closed door image:
        if(doorClosedPic) {
            if(doorClosedPic.get("controlledby").match(/^all/) && room.get("layer") != "gmlayer") {
                doorClosedPic.set("layer", "objects");
            } else {
                doorClosedPic.set("layer", room.get("layer"));
            }
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
    
    //determines if one (and only one) graphic is selected and returns it if so:
    function selectedGraphic(selected, who) {
        if(!selected || selected.length < 1) {
            sendWhisper(who, "You need to have an image selected.");
            return;
        } else if(selected.length > 1) {
            sendWhisper(who, "Only one image can be selected.");
            return;
        }
        
        var graphic = getObj("graphic", selected[0]._id);
        
        if(!graphic) {
            sendWhisper(who, "The selected object must be an image.");
            return;
        }
        
        return graphic;
    }
    
    //determines if one (and only one) room is selected and returns it if so:
    function selectedRoom(selected, who) {
        var room = selectedGraphic(selected, who);
        
        if(!room) {
            return;
        }
        
        var gmNotes = room.get("gmnotes");
        
        if(!gmNotes.match(/^\*room\*/)) {
            sendWhisper(who, "The selected object must be a room.");
            return;
        }
        
        return room;
    }
    
    //determines if one (and only one) adhoc wall is selected and returns it if so:
    function selectedAdhocWall(selected, who) {
        var adhocWall = selectedGraphic(selected, who);
        
        if(!adhocWall) {
            return;
        }
        
        var gmNotes = adhocWall.get("gmnotes");
        
        if(!gmNotes.match(/^\*adhocWall\*/)) {
            sendWhisper(who, "The selected object must be an adhoc wall.");
            return;
        }
        
        return adhocWall;
    }
    
    //determines if one (and only one) adhoc door is selected and returns it if so:
    function selectedAdhocDoor(selected, who) {
        var adhocDoor = selectedGraphic(selected, who);
        
        if(!adhocDoor) {
            return;
        }
        
        var gmNotes = adhocDoor.get("gmnotes");
        
        if(!gmNotes.match(/^\*adhocDoor\*/)) {
            sendWhisper(who, "The selected object must be an adhoc door.");
            return;
        }
        
        return adhocDoor;
    }
    
    //determines if one (and only one) empty image is selected and returns it if so:
    function selectedEmptyImage(selected, who) {
        var pic = selectedGraphic(selected, who);
        
        if(!pic) {
            return;
        }
        
        var gmNotes = pic.get("gmnotes");
        
        if(gmNotes) {
            sendWhisper(who, "The selected object must be a picture that isn't already used for anything. The one you have selected has gmnotes.");
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
            
            if(sideMetas) {
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
                sendWhisper(who, "Side must be 't', 'b', 'l', or 'r'.");
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
                sendWhisper(who, "Type must be 'empty', 'wall', 'doorClosed', or 'doorOpen'.");
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
                sendWhisper(who, "The side '" + side + "' cannot be found in the selected room.");
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
    
    //sets the door image for capturing to that of the selected image:
    function setDoorUrl(selected, who, doorType) {
        var doorPic = selectedGraphic(selected, who);
        
        if(!doorPic) {
            return;
        }
        
        var imgsrc = getCleanImgsrc(doorPic.get("imgsrc"));
        
        switch(doorType) {
            case "doorClosed":
                state.APIRoomManagement.doorClosedPicUrl = imgsrc;
                break;
            case "doorOpen": 
                state.APIRoomManagement.doorOpenPicUrl = imgsrc;
                break;
            default:
                log("Unknown type " + doorType + " in setDoorUrl.");
        }
    }
    
    //draws an adhoc wall:
    function drawAdhocWall(adhocWall) {
        var wallXY = getPoints(adhocWall.get("width"), adhocWall.get("height"), adhocWall.get("rotation"), adhocWall.get("left"), adhocWall.get("top"));
        var meta = adhocWall.get("gmnotes").match(/\*w\*([^\*]+)/g);
        var newGmNotes = "*adhocWall*%3Cbr%3E";
        
        //draw LoS wall if the adhoc wall isn't on the gm layer:
        if(adhocWall.get("layer") != 'gmlayer') {
            var wall;
            
            //draw a LoS wall through the longer dimension of the pic:
            if(adhocWall.get("width") > adhocWall.get("height")) {
                wall = createLosWall(adhocWall, wallXY.midLeft, wallXY.midRight);
            } else {
                wall = createLosWall(adhocWall, wallXY.topMid, wallXY.botMid);
            }
            
            newGmNotes = newGmNotes + "*w*" + wall.id + "*%3Cbr%3E";
        }
        
        //delete old walls:
        try {
            for(var i = 0;i < meta.length;i++) {
                trashObject(getObj("path", meta[i].substring(3)));
            }
        } catch(e) {}
        
        adhocWall.set("gmnotes", newGmNotes);
    }
    
    //draws an adhoc door:
    function drawAdhocDoor(adhocDoor) {
        var doorXY = getPoints(adhocDoor.get("width"), adhocDoor.get("height"), adhocDoor.get("rotation"), adhocDoor.get("left"), adhocDoor.get("top"));
        var meta = (adhocDoor.get("gmnotes").match(/\*d\*([^\*]+)/g))[0].substring(3).split('.');
        var newGmNotes = "*adhocDoor*%3Cbr%3E";
        
        //draw LoS wall if the adhoc wall isn't on the gm layer and it's a closed door:
        if(adhocDoor.get("layer") != 'gmlayer' && meta[0] == "doorClosed") {
            var wall;
            
            //draw a LoS wall through the longer dimension of the pic:
            if(adhocDoor.get("width") > adhocDoor.get("height")) {
                wall = createLosWall(adhocDoor, doorXY.midLeft, doorXY.midRight);
            } else {
                wall = createLosWall(adhocDoor, doorXY.topMid, doorXY.botMid);
            }
            
            newGmNotes = newGmNotes + "*d*" + meta[0] + "." + meta[1] + "." + wall.id + "*%3Cbr%3E";
        } else {
            newGmNotes = newGmNotes + "*d*" + meta[0] + "." + meta[1] + ".*%3Cbr%3E";
        }
        
        //delete old walls:
        try {
            trashObject(getObj("path", meta[2]));
        } catch(e) {}
        
        //set the gmnotes:
        adhocDoor.set("gmnotes", newGmNotes);
        
        //position the companion door if there is one:
        var otherDoor = getObj("graphic", meta[1]);
        if(otherDoor) {
            otherDoor.set("height", adhocDoor.get("height") / 10000);
            otherDoor.set("width", adhocDoor.get("width") / 10000);
            otherDoor.set("top", adhocDoor.get("top"));
            otherDoor.set("left", adhocDoor.get("left"));
            otherDoor.set("rotation", adhocDoor.get("rotation"));
            otherDoor.set("scale", adhocDoor.get("scale"));
            otherDoor.set("layer", adhocDoor.get("layer"));
        }
    }
    
    //toggles and draws an adhoc door:
    function toggleAdhocDoor(adhocDoor) {
        var meta = (adhocDoor.get("gmnotes").match(/\*d\*([^\*]+)/g))[0].substring(3).split('.');
        
        //verify that the door is part of a set:
        if(meta[1].length == 0) {
            log("Attempt to toggle adhoc door that has no companion door. Aborting toggle.");
            drawAdhocDoor(adhocDoor);
            return;
        }
        
        //delete LoS wall if there is one:
        trashObject(getObj("path", meta[2]));
        
        //show the companion door and hide this one:
        var otherDoor = getObj("graphic", meta[1]);
        otherDoor.set("height", otherDoor.get("height") * 10000);
        otherDoor.set("width", otherDoor.get("width") * 10000);
        adhocDoor.set("height", otherDoor.get("height") / 10000);
        adhocDoor.set("width", otherDoor.get("width") / 10000);
        
        //draw the other door:
        drawAdhocDoor(otherDoor);
    }
    
    //turns an image into an adhoc wall:
    function adhocWallAdd(selected, who) {
        var adhocWall = selectedEmptyImage(selected, who);
        
        if(adhocWall) {
            //initialize adhoc wall:
            adhocWall.set("layer", "map");
            adhocWall.set("gmnotes", "*adhocWall*%3Cbr%3E");
            drawAdhocWall(adhocWall);
        }
    }
    
    //removes an adhoc wall:
    function adhocWallRemove(selected, who) {
        var adhocWall = selectedAdhocWall(selected, who);
        
        if(adhocWall) {
            var gmNotes = adhocWall.get("gmnotes");
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
            
            trashObject(adhocWall);
        }
    }
    
    //removes an adhoc door set:
    function adhocDoorRemove(selected, who) {
        var adhocDoor = selectedAdhocDoor(selected, who);
        
        if(adhocDoor) {
            var gmNotes = adhocDoor.get("gmnotes");
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
            
            trashObject(adhocDoor);
        }
    }
    
    //create the first door in an adhoc door set:
    function addhocDoorAdd(selected, who, type) {
        var adhocDoor = selectedEmptyImage(selected, who);
        
        if(adhocDoor) {
            //initialize adhoc door:
            adhocDoor.set("gmnotes", "*adhocDoor*%3Cbr%3E*d*" + type + "..*%3Cbr%3E");
            drawAdhocDoor(adhocDoor);
        }
    }
    
    //add the second door to an existing adhoc door to complete a set:
    function addhocDoorPairAdd(selected, who) {
        //verify that the expected objects are selected:
        if(!selected || selected.length < 2) {
            sendWhisper(who, "You need to have an adhoc door and a second image selected.");
            return;
        } else if(selected.length > 2) {
            sendWhisper(who, "Only two image can be selected.");
            return;
        }
        
        var image1 = getObj("graphic", selected[0]._id);
        var image2 = getObj("graphic", selected[1]._id);
        var adhocDoor;
        var newDoor;
        
        if(image1.get("gmnotes").match(/^\*adhocDoor\*/)) {
            adhocDoor = image1;
            newDoor = image2;
        } else if(image2.get("gmnotes").match(/^\*adhocDoor\*/)) {
            adhocDoor = image2;
            newDoor = image1;
        } else {
            sendWhisper(who, "One of the selected images needs to be an adhoc door.");
            return;
        }
        
        if(newDoor.get("gmnotes").length > 0) {
            sendWhisper(who, "The new adhoc door must be unused. This one has information in its gmnotes.");
            return;
        }
        
        var meta = (adhocDoor.get("gmnotes").match(/\*d\*([^\*]+)/g))[0].substring(3).split('.');
        adhocDoor.set("gmnotes", "*adhocDoor*%3Cbr%3E*d*" + meta[0] + "." + newDoor.id + "." + meta[2] + "*%3Cbr%3E");
        
        //determine new door type:
        var newDoorType;
        switch(meta[0]) {
            case "doorOpen":
                newDoorType = "doorClosed";
                break;
            case "doorClosed":
                newDoorType = "doorOpen";
                break;
            default:
                log("Unexpected type of " + meta[0] + " found on the original adhoc door in addhocDoorPairAdd().");
                return;
        }
        
        if(state.APIRoomManagement.doorPrivsDefault == 0) {
            adhocDoor.set("layer", "map");
        } else {
            adhocDoor.set("controlledby", "all");
            adhocDoor.set("layer", "objects");
        }
        
        //set up and hide the new door:
        newDoor.set("gmnotes", "*adhocDoor*%3Cbr%3E*d*" + newDoorType + "." + adhocDoor.id + ".*%3Cbr%3E");
        newDoor.set("height", adhocDoor.get("height") / 10000);
        newDoor.set("width", adhocDoor.get("width") / 10000);
        newDoor.set("top", adhocDoor.get("top"));
        newDoor.set("left", adhocDoor.get("left"));
        newDoor.set("rotation", adhocDoor.get("rotation"));
        newDoor.set("scale", adhocDoor.get("scale"));
        newDoor.set("layer", adhocDoor.get("layer"));
        newDoor.set("controlledby", adhocDoor.get("controlledby"));
    }
    
    //set adhoc door move mode:
    function setAdhocDoorMoveMode(mode) {
        switch(mode) {
            case "on":
                state.APIRoomManagement.adhocDoorMoveMode = 1;
                break;
            case "off":
                state.APIRoomManagement.adhocDoorMoveMode = 0;
                break;
            case "toggle":
                state.APIRoomManagement.adhocDoorMoveMode = (state.APIRoomManagement.adhocDoorMoveMode + 1) % 2;
                break;
            default:
                log("Unexpected mode of " + mode + " in setAdhocDoorMoveMode().");
        }
    }
    
    //set default for players being able to control doors:
    function setDoorPrivsDefault(who, priv) {
        switch(priv) {
            case "gm":
                state.APIRoomManagement.doorPrivsDefault = 0;
                break;
            case "players":
                state.APIRoomManagement.doorPrivsDefault = 1;
                break;
            default:
                sendWhisper(who, "Unexpected privledge value of " + priv + ". The expected values are 'gm' or 'players'.");
        }
    }
    
    //whispers to a player:
    function sendWhisper(to, message) {
        sendChat("Room API", "/w " + to.split(" ")[0] + " " + message);  
    }
    
    //character converter, credits to Aaron from https://github.com/shdwjk/Roll20API/blob/master/APIHeartBeat/APIHeartBeat.js
    function ch(c) {
        var entities = {
            '<' : 'lt',
            '>' : 'gt',
            "'" : '#39',
            '@' : '#64',
            '{' : '#123',
            '|' : '#124',
            '}' : '#125',
            '[' : '#91',
            ']' : '#93',
            '"' : 'quot',
            '-' : 'mdash',
            ' ' : 'nbsp'
        };

        if(_.has(entities,c) ){
            return ('&'+entities[c]+';');
        }
        return '';
    }
    
    //help builder:
    function displayHelp(who, header, body, nextSteps) {
        var text =
            '<div style="border: 1px solid black;background-color: #B266FF;">'
                +'<div style="border: 1px solid black;font-weight: bold;border-bottom: 1px solid black;background-color: #6666FF;font-size: 115%;">'
                	+'<div style="padding-left:3px;margin-top:3px;margin-bottom:3px;">'
                        +header
                    +'</div>'
            	+'</div>'
                +'<div style="border: 1px solid black;background-color: #B266FF;padding: 3px 3px;">'
                	+body;
                    
        if(nextSteps) {
            text = text
                +'<div style="padding-left:10px;margin-top:3px;margin-bottom:3px;">'
                    +'<div style="border-top: 1px solid #6666FF;margin-top:10px;border-bottom: 1px solid #6666FF;">'
                        +'<div style="margin-top:10px;"></div>'
                        +nextSteps
                    +'</div>'
                +'</div>';
        }
        
        text = text
                +'</div>'
            +'</div>';
        
        sendWhisper(who, text);
    }
    
    //constructs a clickable link to a help topic:
    function helpLink(topic) {
        return '[' + topic + '](!api-room help ' + topic + ') ';
    }
    
    //constructs clickable links to help topics:
    function helpLinks(header, topics) {
        var html = '<p><b>' + header + '</b><br/>';
        
        for(var i = 0;i<topics.length;i++) {
            html += helpLink(topics[i]);
        }
        
        return html + '</p>';
    }
    
    //constructs a clickable command:
    function commandLink(text, command) {
        return '[' + text + '](!api-room ' + command + ') ';
    }
    
    //constructs clickable commands:
    function commandLinks(header, commands) {
        var html = '<p><b>' + header + '</b><br/>';
        
        for(var i = 0;i<commands.length;i++) {
            html += commandLink(commands[i][0], commands[i][1]);
        }
        
        return html + '</p>';
    }
    
    //general help:
    function help(who, topic) {
        switch(topic) {
            case "room":
            case "rooms":
                displayHelp(who, 'Room API - Rooms',
                    '<div style="padding-left:10px;margin-bottom:3px;">'
                        +'<p>Rooms are images that are managed by the API.</p>'
                        +'<p>A room has four '+ch("'")+'sides'+ch("'")+': top, bottom, left, and right.</p>'
                        +'<p>Each side can be of the following types:'
                            +'<ul>'
                                +'<li><b>wall</b> - which blocks LoS</li>'
                                +'<li><b>empty</b> - which doesn'+ch("'")+'t block LoS</li>'
                                +'<li><b>doorClosed</b> - which blocks LoS and has a closed door image</li>'
                                +'<li><b>doorOpen</b> - which blocks LoS except where the door is and has an open door image</li>'
                            +'</ul>'
                        +'</p>'
                        +'<p>Rooms can be moved, rotated, and resized. The API will make sure that everything is drawn properly.</p>'
                        +'<p>Doors can be toggled from open to closed (and vice-versa) by interacting with them.</p>'
                        +'<p>To create a room, select an empty image and run <b>!api-room</b>.'
                        +'<p>As soon as the image becomes a room, it is pushed to the Maps layer as a convenience and is from then on managed by the API. The room can be moved back to other layers without doing any harm, if that'+ch("'")+'s more to your liking.</p>'
                        +'<p>Doors on rooms are drawn to whatever door images are set up. To set a door image, select an empty image with the image you want for your door and run <b>!api-room</b>. This needs to be set up for both open and closed doors.</p>'
                   +'</div>',
                     
                    helpLinks('Sub-topics',['door privledges'])
                );
                break;
            case "door privledges":
                displayHelp(who, 'Room API - Door Privledges',
                    '<div style="padding-left:10px;margin-bottom:3px;">'
                        +'<p>This sets the default for who should be able to toggle doors. Setting it to '+ch("'")+'players'+ch("'")+' makes it that any body can toggle doors. Setting it to '+ch("'")+'GM'+ch("'")+' makes it that only GMs can toggle them.</p>'
                        +'<p>This can be overridden on individual doors (such as a door that is locked) by double clicking the door and changing the '+ch("'")+'Controlled By'+ch("'")+' settings.</p>'
                        +commandLink('set it to gm','doorPrivsDefaultSet gm')
                        +commandLink('set it to players','doorPrivsDefaultSet players')
                    +'</div>'
                );
                break;
            case "adhoc":
            case "adhocs":
                displayHelp(who, 'Room API - Adhoc',
                    '<div style="padding-left:10px;margin-bottom:3px;">'
                        +'<p>Adhoc walls and doors are individually placed objects that are not tied to a room.</p>'
                        +'<p>Adhoc walls and adhoc doors are used for complex situations where a wall shouldn'+ch("'")+'t simply attach to a room'+ch("'")+'s side, a single centered door isn'+ch("'")+'t enough, or alternate door images or door shapes are needed. To use adhoc walls and adhoc doors on room sides, leave the room side empty, and place adhoc items where necessary.</p>'
                    +'</div>',
                    
                    helpLinks('Sub-topics',['adhoc walls','adhoc doors'])
                );
                break;
            case "adhoc walls":
                displayHelp(who, 'Room API - Adhoc Walls',
                    '<div style="padding-left:10px;margin-bottom:3px;">'
                        +'<p>To add an adhoc wall, select an empty image and run <b>!api-room</b>.</p>'
                        +'<p>As soon as the image becomes an adhoc wall, it is pushed to the Maps layer as a convenience and is from then on managed by the API. It can be moved back to other layers without doing any harm, if that'+ch("'")+'s more to your liking.</p>'
                        +'<p>A LoS wall will be drawn through the length of the wall.</p>'
                    +'</div>'
                );
                break;
            case "adhoc doors":
                displayHelp(who, 'Room API - Adhoc Doors',
                    '<div style="padding-left:10px;margin-bottom:3px;">'
                        +'<p>Adhoc doors are created in two steps. First, select an empty image and run <b>!api-room</b>. Second, select the first image along with another empty image and run <b>!api-room</b>.</p>'
                        +'<p>A LoS wall will be drawn through the door when it is closed.</p>'
                        +'<p>Adhoc doors can be toggled from open to closed (and vice-versa) by interacting with them.</p>'
                        +'<p>When <b>'+ch("'")+'Move Mode'+ch("'")+'</b> is on, interacting with adhoc doors does not toggle them. This is used to reposition, rotate, and resize them.</p>'
                        +commandLink('turn move mode on','adhocDoorMove on')
                        +commandLink('turn move mode off','adhocDoorMove off')    
                    +'</div>',
                     
                    helpLinks('Sub-topics',['door privledges'])
                );
                break;
            default:
                displayHelp(who, 'Room API v'+version,
                    '<div style="padding-left:10px;margin-bottom:3px;">'
                    	+'<p>This is an API for managing rooms, so that you can piece maps together out of various rooms without having to worry about dynamic lighting or doors - the goal of the API is that those things are handled for you in a natural and powerful way.</p>'
                        +'<p>The Room API is used with an intuitive interface. Just type <b>!api-room</b>, and action buttons will appear in the chat window. If nothing is selected, this help document will appear. Things get even easier if you set up a macro for the <b>!api-room</b> command.</p>'
                    +'</div>',
                    
                    helpLinks('Sub-topics',['rooms','adhoc'])
                );
        }
    }
    
    //intuitive command interface for handling an empty image:
    function intuitEmptyImage(msg) {
        displayHelp(msg.who, 'Empty Image Actions',
            '<div style="padding-left:10px;margin-bottom:3px;">'
                +commandLinks('Actions',[
                        ['create room','roomAdd'],
                        ['create adhoc wall','adhocWallAdd'],
                        ['create adhoc closed door','adhocDoorAdd closed'],
                        ['create adhoc open door','adhocDoorAdd open']
                    ])
                +commandLinks('Settings',[
                        ['set open door default image','roomDoorImageSet open'],
                        ['set closed door default image','roomDoorImageSet closed']
                    ])
            +'</div>'
        );
    }
    
    //helper function for intuitive commands for a room's side:
    function intuitRoomSide(sideMetas, side) {
        if(sideMetas) {
            for(var i = 0;i < sideMetas.length;i++) {
                if (sideMetas[i].substring(1, 2) == side) {
                    return [['remove','roomSideRemove ' + side]];
                }
            }
        }
        
        return [
                ['add wall','roomSideAdd ' + side + ' wall'],
                ['add open door','roomSideAdd ' + side + ' doorOpen'],
                ['add closed door','roomSideAdd ' + side + ' doorClosed'],
                ['add empty side','roomSideAdd ' + side + ' empty']
            ];
    }
    
    //intuitive command interface for handling a room:
    function intuitRoom(msg, room) {
        var sideMetas = room.get("gmnotes").match(/\*\S\*([^\*]+)/g);
        
        var body = 
            '<div style="padding-left:10px;margin-bottom:3px;">'
                +commandLinks('Room',[['remove','roomRemove']])
                +commandLinks('Left Side',intuitRoomSide(sideMetas, 'l'))
                +commandLinks('Top Side',intuitRoomSide(sideMetas, 't'))
                +commandLinks('Right Side',intuitRoomSide(sideMetas, 'r'))
                +commandLinks('Bottom Side',intuitRoomSide(sideMetas, 'b'))
            +'</div>';
        
        displayHelp(msg.who, 'Room Actions', body);
    }
    
    //intuitive command interface for handling an adhoc door:
    function intuitAdhocDoor(msg) {
        var body = 
            '<div style="padding-left:10px;margin-bottom:3px;">'
                +commandLinks('Adhoc Door',[['remove','adhocDoorRemove']])
                +commandLinks('Move Mode (affects all adhoc doors)',[
                        ['on','adhocDoorMove on'],
                        ['off','adhocDoorMove off']
                    ])
            +'</div>';
        
        displayHelp(msg.who, 'Adhoc Door Actions', body);
    }
    
    //intuitive command interface for handling an adhoc wall:
    function intuitAdhocWall(msg) {
        var body = 
            '<div style="padding-left:10px;margin-bottom:3px;">'
                +commandLinks('Adhoc Wall',[['remove','adhocWallRemove']])
            +'</div>';
        
        displayHelp(msg.who, 'Adhoc Wall Actions', body);
    }
    
    //intuitive command interface for handling an adhoc door and an empty image:
    function intuitAdhocDoorAndEmpty(msg) {
        var body = 
            '<div style="padding-left:10px;margin-bottom:3px;">'
                +commandLinks('Adhoc Door',[['complete set','adhocDoorAdd']])
            +'</div>';
        
        displayHelp(msg.who, 'Adhoc Door Actions', body);
    }
    
    //intuitive command interface that presents wizard-like options based on context:
    function intuit(msg) {
        if(!msg.selected) {
            //nothing is selected, so nothing practical can be accomplished (except maybe settings, which is silly to intuit); assume that help documentation is the best course of action:
            help(msg.who, "");
        } else if(msg.selected.length == 1) {
            var graphic = getObj("graphic", msg.selected[0]._id);
            if(!graphic) {
                //there is only intuitive functionality for graphics being selected:
                help(msg.who, "");
            } else {
                var gmNotes = graphic.get("gmnotes");
                if(!gmNotes) {
                    intuitEmptyImage(msg);
                } else if(gmNotes.match(/^\*room\*/)) {
                    intuitRoom(msg, graphic);
                } else if(gmNotes.match(/^\*adhocDoor\*/)) {
                    intuitAdhocDoor(msg);
                } else if(gmNotes.match(/^\*adhocWall\*/)) {
                    intuitAdhocWall(msg);
                } else {
                    sendWhisper(msg.who, "No actions are known for the selected image.");
                }
            }
        } else if(msg.selected.length == 2) {
            var graphic1 = getObj("graphic", msg.selected[0]._id);
            var graphic2 = getObj("graphic", msg.selected[1]._id);
            
            if(!graphic1 || !graphic2) {
                sendWhisper(msg.who, "Only images should be selected.");
            } else {
                var gmNotes1 = graphic1.get("gmnotes");
                var gmNotes2 = graphic2.get("gmnotes");
                
                if(gmNotes1 && gmNotes2) {
                    sendWhisper(msg.who, "No actions are known for cases where neither selected image is empty.");
                } else if(!(gmNotes1 || gmNotes2)) {
                    sendWhisper(msg.who, "No actions are known for cases where two empty images are selected.");
                } else if(!((gmNotes1 + gmNotes2).match(/^\*adhocDoor\*/))) {
                    sendWhisper(msg.who, "No actions are known for cases where one selected image is empty and the other is not an adhoc door.");
                } else {
                    intuitAdhocDoorAndEmpty(msg);
                }
            }
        } else {
            sendWhisper(msg.who, "Too many objects are selected.");
        }
    }
    
    //handle any changes to objects:
    function handleObjectChange(obj) {
        if(obj.get("gmnotes").match(/^\*room\*/)) {
            drawRoom(obj);
        } else if(obj.get("gmnotes").match(/^\*door(Open|Closed)\*/)) {
            toggleDoor(obj);
        } else if(obj.get("gmnotes").match(/^\*adhocWall\*/)) {
            drawAdhocWall(obj);
        } else if(obj.get("gmnotes").match(/^\*adhocDoor\*/)) {
            if(state.APIRoomManagement.adhocDoorMoveMode == 1) {
                drawAdhocDoor(obj);
            } else {
                toggleAdhocDoor(obj);
            }
        }
    }
    
    //handle user-input commands:
    function handleUserInput(msg) {
        if(msg.type == "api" && msg.content.match(/^!api-room/) && playerIsGM(msg.playerid)) {
            var chatCommand = msg.content.split(' ');
            if(chatCommand.length == 1) {
                intuit(msg);
            } else {
                switch(chatCommand[1]) {
                    case "help":
                        if(chatCommand.length <= 2) {
                            help(msg.who, "");
                        } else {
                            var helpText = chatCommand;
                            helpText.shift();
                            helpText.shift();
                            help(msg.who, helpText.join(" "));
                        }
                        break;
                    case "roomAdd":
                        roomAdd(msg.selected, msg.who);
                        break;
                    case "roomRemove":
                        roomRemove(msg.selected, msg.who);
                        break;
                    case "roomSideAdd":
                        if(chatCommand.length != 4) {
                            help(msg.who, "roomSideAdd");
                        } else {
                            chatCommand = msg.content.replace("!api-room roomSideAdd ", "");
                            roomSideAdd(chatCommand, msg.selected, msg.who);
                        }
                        break;
                    case "roomSideRemove":
                        if(chatCommand.length != 3) {
                            help(msg.who, "roomSideRemove");
                        } else {
                            chatCommand = msg.content.replace("!api-room roomSideRemove ", "");
                            roomSideRemove(chatCommand, msg.selected, msg.who);
                        }
                        break;
                    case "roomDoorImageSet":
                        if(chatCommand.length != 3) {
                            help(msg.who, "roomDoorImageSet");
                        } else {
                            switch(chatCommand[2]) {
                                case "open":
                                    setDoorUrl(msg.selected, msg.who, "doorOpen");
                                    break;
                                case "closed":
                                    setDoorUrl(msg.selected, msg.who, "doorClosed");
                                    break;
                                default:
                                    help(msg.who, "roomDoorImageSet");
                            }
                        }
                        break;
                    case "adhocWallAdd":
                        adhocWallAdd(msg.selected, msg.who);
                        break;
                    case "adhocWallRemove":
                        adhocWallRemove(msg.selected, msg.who);
                        break;
                    case "adhocDoorAdd":
                        if(chatCommand.length == 3) {
                            //if there is a parameter, then this is the first door of an adhoc door set:
                            switch(chatCommand[2]) {
                                case "open":
                                    addhocDoorAdd(msg.selected, msg.who, "doorOpen");
                                    break;
                                case "closed":
                                    addhocDoorAdd(msg.selected, msg.who, "doorClosed");
                                    break;
                                default:
                                    help(msg.who, "adhocDoorAdd");
                            }
                        } else if(chatCommand.length == 2) {
                            //if there is no parameter, then this is appending a second door to an adhoc door set:
                            addhocDoorPairAdd(msg.selected, msg.who);
                        } else {
                            help(msg.who, "adhocDoorAdd");
                        }
                        break;
                    case "adhocDoorMove":
                        if(chatCommand.length == 3) {
                            //if there is a parameter, then this should explicitly specify a move mode:
                            switch(chatCommand[2]) {
                                case "on":
                                    setAdhocDoorMoveMode("on");
                                    break;
                                case "off":
                                    setAdhocDoorMoveMode("off");
                                    break;
                                default:
                                    help(msg.who, "adhocDoorMove");
                            }
                        } else if(chatCommand.length == 2) {
                            //implied toggling of move mode:
                            setAdhocDoorMoveMode("toggle");
                        } else {
                            help(msg.who, "adhocDoorMove");
                        }
                        break;
                    case "adhocDoorRemove":
                        adhocDoorRemove(msg.selected, msg.who);
                        break;
                    case "doorPrivsDefaultSet":
                        if(chatCommand.length != 3) {
                            help(msg.who, "doorPrivsDefaultSet");
                        } else {
                            setDoorPrivsDefault(msg.who, chatCommand[2]);
                        }
                        break;
                    default:
                        help(msg.who, "");
                }
            }
        }
    }
    
    //register event handlers:
    registerEventHandlers = function() {
        on('chat:message', handleUserInput);
        on('change:graphic', handleObjectChange);
    };
    
    //expose public functions:
    return {
        checkInstall: checkInstall,
        registerEventHandlers: registerEventHandlers
    }

})();

//run the script:
on('ready', function() {
    APIRoomManagement.checkInstall();
    APIRoomManagement.registerEventHandlers();
});