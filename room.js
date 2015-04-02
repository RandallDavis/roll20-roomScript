var APIRoomManagement = APIRoomManagement || (function() {
    
    /* core - begin */
    
    var version = 3.0,
        schemaVersion = 1.0,
        closedDoorPic = 'https://s3.amazonaws.com/files.d20.io/images/8543193/5XhwOpMaBUS_5B444UNC5Q/thumb.png?1427665106',
        openDoorPic = 'https://s3.amazonaws.com/files.d20.io/images/8543205/QBOWp1MHHlJCrPWn9kcVqQ/thumb.png?1427665124',
        padlockPic = 'https://s3.amazonaws.com/files.d20.io/images/8546285/bdyuCfZSGRXr3qrVkcPkAg/thumb.png?1427673372',
        
    checkInstall = function() {
        
        log('-=> Room Management v'+version+' <=-');
        
        if(!_.has(state,'APIRoomManagement') || state.APIRoomManagement.version !== schemaVersion) {
            log('APIRoomManagement: Resetting state. Door images will need to be set.');
            state.APIRoomManagement = {
                version: schemaVersion,
                wallColor: "#00FF00",
                doorOpenPicUrl: "",
                doorClosedPicUrl: "",
                adhocDoorMoveMode: 1,
                doorPrivsDefault: 1 //0 = gm only, 1 = all players
            };
        }
    },
    
    inheritPrototype = function(childObject, parentObject) {
        var copyOfParent = Object.create(parentObject.prototype);
        copyOfParent.constructor = childObject;
        childObject.prototype = copyOfParent;
    },
    
    typedObject = function() {
        this.type = new Array();
    },
    
    /* core - end */
    
    
    /* managed tokens - begin */
    
    managedToken = function(token) {
        typedObject.call(this);
        this.type.push('managedToken');
        this.token = token;
    },
    
    room = function(token) {
        managedToken.call(this, token);
        this.type.push('room');
    },
    
    adhocWall = function(token) {
        managedToken.call(this, token);
        this.type.push('adhocWall');
    },
    
    door = function(token) {
        managedToken.call(this, token);
        this.type.push('door');
    },
    
    roomDoor = function(token) {
        door.call(this, token);
        this.type.push('roomDoor');
    },
    
    adhocDoor = function(token) {
        door.call(this, token);
        this.type.push('adhocDoor');
    };
    
    typedObject.prototype = {
        constructor: typedObject,
        getType: function() { return this.type; },
        isType: function(type) {
            var found = false;
           
            this.type.forEach(function(typeValue) {
                if(type == typeValue) {
                    found = true;
                    return;
                }
            });
           
           return found;
        }
    };
    
    inheritPrototype(managedToken, typedObject);
    
    managedToken.prototype.getPoints = function() {
        return getPoints(this.token.get("width"), this.token.get("height"), this.token.get("rotation"), this.token.get("left"), this.token.get("top"));
    };
    
    managedToken.prototype.shouldDrawWalls = function() {
        return (this.token.get('layer') !== 'gmlayer');
    };
    
    managedToken.prototype.deleteObjects = function(objectIds) {
        objectIds.forEach(function(objectId) {
            var obj = getObj(objectId[0], objectId[1]);
            if(obj) {
                setTimeout(function() {
                    obj.remove();
                }, 5);
            }
        });
    };
    
    inheritPrototype(adhocWall, managedToken);
    
    adhocWall.prototype.load = function() {
        var metaWall = this.token.get("gmnotes").match(/\*w\*([^\*]+)/g);
        this.wallIds = new Array();
        if(metaWall) {
            this.wallIds.push(['path', metaWall[0].substring(3)]);
        }
    };
    
    adhocWall.prototype.save = function() {
        var newGmNotes = 
            "*adhocWall*%3Cbr%3E"
            + "*w*" + this.wallIds[0][1] + "*%3Cbr%3E";
        this.token.set('gmnotes', newGmNotes);
    };
    
    adhocWall.prototype.draw = function() {
        this.load();
        var oldWallIds = this.wallIds;
        
        if(this.shouldDrawWalls()) {
            var points = this.getPoints();
            var wall;
            
            //draw a LoS wall through the longer dimension of the pic:
            if(this.token.get("width") > this.token.get("height")) {
                wall = createLosWall(this.token, points.midLeft, points.midRight);
            } else {
                wall = createLosWall(this.token, points.topMid, points.botMid);
            }
            
            var newWallIds = new Array();
            newWallIds.push(['path', wall.id]);
            
            this.wallIds = newWallIds;
        }
        
        this.save();
        this.deleteObjects(oldWallIds);
    };
    
    adhocWall.prototype.destroy = function() {
        this.load();
        this.deleteObjects(this.wallIds);
        this.token.remove();
    };
    
    /* managed tokens - end */
    
    
    /* token operations - begin */
    
    var getTypeFromToken = function(token) {
        var gmNotes = '' + token.get('gmnotes');
        var tokenType = gmNotes.match(/^\*\w+\*/);
        
        if(tokenType) {
            return tokenType[0].substring(1, tokenType[0].length-1);
        }
        
        return null;
    },
    
    getManagedToken = function(token) {
        if(!token) {
            return null;
        }
        
        var tokenType = getTypeFromToken(token);
        
        if(!tokenType) {
            return null;
        }
        
        switch(tokenType) {
            case 'adhocWall':
                return new adhocWall(token);
                break;
            //TODO: more types    
            default:
                log('Unknown tokenType of ' + tokenType + ' in getManagedToken().');
                break;
        }
        
        return null;
    },
    
    getManagedTokenById = function(tokenId) {
        var token = getObj('graphic', tokenId);
        return getManagedToken(token);
    },
    
    validateSingleSelection = function(msg, selectionType) {
        if(!msg.selected || msg.selected.length < 1) {
            sendWhisper(msg.who, "You need to have an image selected.");
        } else if(msg.selected.length > 1) {
            sendWhisper(msg.who, "You should only have one image selected.");
        } else {
            var token = getManagedTokenById(msg.selected[0]._id);
            
            if(!token && selectionType == 'empty') {
                return true;
            } else {
                return token.isType(selectionType);
            }
        }
        
        return false;
    },
    
    createManagedToken = function(msg, tokenType) {
        var token;
        
        switch(tokenType) {
            case 'adhocWall':
                var emptyToken = getObj('graphic', msg.selected[0]._id);
                token = new adhocWall(emptyToken);
                break;
            //TODO: more types    
            default:
                log('Unknown tokenType of ' + tokenType + ' in createManagedToken().');
                break;
        }
        
        token.draw();
    },
    
    destroyManagedToken = function(msg) {
        var token = getManagedTokenById(msg.selected[0]._id);
        token.destroy();
    },
    
    //creates a dynamic lighting segment from A to B on the parent's page: 
    createLosWall = function(parent, pointA, pointB) {
        var isPositiveSlope = (((pointB.y - pointA.y) == 0) || (((pointB.x - pointA.x) / (pointB.y - pointA.y)) > 0));
        var top = Math.min(pointA.y, pointB.y);
        var left = Math.min(pointA.x, pointB.x);
        var path;
        
        //create a path for a segment from A to B relative to (left,top):
        if(isPositiveSlope) {
            if(pointA.x > pointB.x) {
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
            layer: "walls",
            pageid: parent.get("pageid"),
            top: top,
            left: left,
            stroke: state.APIRoomManagement.wallColor,
            stroke_width: 1,
            _path: path
        });
       
        return wall;
    },
    
    /*
    Courtesy of Konrad J. (https://app.roll20.net/users/77736)
    from https://app.roll20.net/forum/post/716328/helper-function-rotate-a-token-around-one-of-nine-pivot-points#post-716857
    */
    getPoints = function(width, height, rot, midX, midY) {
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
    },
    
    handleTokenChange = function(graphic) {
        var token = getManagedToken(graphic);
        
        if(!token) {
            return;
        }
        
        token.draw();
    },
    
    /* token operations - end */
    
    
    /* text command handling - begin */
    
    sendWhisper = function(to, message) {
        sendChat("Room API", "/w " + to.split(" ")[0] + " " + message);  
    },
    
    handleUserInput = function (msg) {
        if(msg.type == "api" && msg.content.match(/^!api-room/) && playerIsGM(msg.playerid)) {
            var chatCommand = msg.content.split(' ');
            if(chatCommand.length == 1) {
                //intuit(msg);
            } else {
                switch(chatCommand[1]) {
                    /*case "help":
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
                        break;*/
                    case "adhocWallAdd":
                        if(validateSingleSelection(msg, 'empty')) {
                            createManagedToken(msg, 'adhocWall');
                        }
                        break;
                    case "adhocWallRemove":
                        if(validateSingleSelection(msg, 'adhocWall')) {
                            destroyManagedToken(msg);
                        }
                        break;
                    /*case "adhocDoorAdd":
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
                    case "toggleDoorLock":
                        toggleDoorLock(msg.selected, msg.who);
                        break;
                    case "toggleDoorTrap":
                        //TODO:
                        sendWhisper(msg.who, "not implemented yet");
                        break;*/
                    default:
                        help(msg.who, "");
                        break;
                }
            }
        }
    },
    
    /* text command handling - end */
    
    
    /* nuts and bolts - begin */
    
    registerEventHandlers = function() {
        on('chat:message', handleUserInput);
        on('change:graphic', handleTokenChange);
    };
    
    //expose public functions:
    return {
        registerEventHandlers: registerEventHandlers,
        checkInstall: checkInstall
    };
    
    /* nuts and bolts - end */
    
})();

//run the script:
on('ready', function() {
    'use strict';
    
    APIRoomManagement.checkInstall();
    APIRoomManagement.registerEventHandlers();
});
