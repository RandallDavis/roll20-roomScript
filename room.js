var APIRoomManagement = APIRoomManagement || (function() {
    
    /* core - begin */
    
    var version = 3.0,
        schemaVersion = 0.3,
        
        //TODO: rename these to 'alert pics':
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
        isType: function(type) {
            var found = false;
           
            this.type.forEach(function(typeValue) {
                if(type == typeValue) {
                    found = true;
                    return;
                }
            });
           
           return found;
        },
        getProperty: function(property) {
            if(!property) {
                throw new Error("No property specified in getProperty().");
            }
            
            if('undefined' === typeof(this['_' + property])) {
                return null;
            }
            
            return this['_' + property];
        },
        setProperty: function(property, value) {
            if(!property) {
                throw new Error("No property specified in setProperty().");
            }
            
            if(!value) {
                throw new Error("No value specified in setProperty().");
            }
            
            switch(property) {
                default:
                    throw new Error(property + " is unknown in setProperty().");
                    break;
            }
        },
        initializeCollectionProperty: function(property) {
            if(!property) {
                throw new Error("No property specified in initializeCollectionProperty().");
            }
            
            switch(property) {
                default:
                    throw new Error(property + " is unknown in initializeCollectionProperty().");
                    break;
            }
        }
    };
    
    inheritPrototype(managedToken, typedObject);
    
    managedToken.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'wallIds':
                this['_' + property].push(['path', value]);
                break;
            default:
                typedObject.prototype.setProperty.call(this, property, value);
                break;
        }
    };
    
    managedToken.prototype.initializeCollectionProperty = function(property) {
        switch(property) {
            case 'wallIds':
                    this['_' + property] = new Array();
                break;
            default:
                typedObject.prototype.initializeCollectionProperty.call(this, property);
                break;
        }
    };
    
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
    
    managedToken.prototype.destroy = function() {
        this.load();
        this.deleteObjects(this.getProperty('wallIds'));
        this.token.remove();
    };
    
    inheritPrototype(adhocWall, managedToken);
    
    adhocWall.prototype.load = function() {
        var metaWall = this.token.get('gmnotes').match(/\*w\*([^\*]+)/g);
        this.initializeCollectionProperty('wallIds');
        if(metaWall) {
            this.setProperty('wallIds', metaWall[0].substring(3));
        }
    };
    
    adhocWall.prototype.save = function() {
        var wallIds = this.getProperty('wallIds');
        var wallId;
        
        if(wallIds && wallIds.length > 0) {
            wallId = wallIds[0][1];
        }
        
        var newGmNotes = 
            '*adhocWall*%3Cbr%3E'
            + '*w*'
                + saveBlank(wallId)
                + '*%3Cbr%3E';
        this.token.set('gmnotes', newGmNotes);
    };
    
    adhocWall.prototype.draw = function() {
        this.load();
        var oldWallIds = this.getProperty('wallIds');
        
        if(this.shouldDrawWalls()) {
            var points = this.getPoints();
            var wall;
            
            //draw a LoS wall through the longer dimension of the pic:
            if(this.token.get('width') > this.token.get('height')) {
                wall = createLosWall(this.token, points.midLeft, points.midRight);
            } else {
                wall = createLosWall(this.token, points.topMid, points.botMid);
            }
            
            this.initializeCollectionProperty('wallIds');
            this.setProperty('wallIds', wall.id);
        }
        
        this.save();
        this.deleteObjects(oldWallIds);
    };
    
    inheritPrototype(door, managedToken);
    
    door.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'doorType':
            case 'companionDoor':
                this['_' + property] = value;
                break;
            default:
                managedToken.prototype.setProperty.call(this, property, value);
                break;
        }
    };
    
    door.prototype.hide = function() {
        this.load();
        
        var oldWallIds = this.getProperty('wallIds');
        this.deleteObjects(oldWallIds);
        this.initializeCollectionProperty('wallIds');
        
        this.token.set("height", 0);
        this.token.set("width", 0);
        this.token.set("top", 10);
        this.token.set("left", 10);
        this.token.set("layer", "gmlayer");
        
        this.save();
    };
    
    inheritPrototype(adhocDoor, door);
    
    adhocDoor.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'positionWidth':
            case 'positionHeight':
            case 'positionRotation':
            case 'positionLeft':
            case 'positionTop':
                this['_' + property] = value;
                break;
            default:
                door.prototype.setProperty.call(this, property, value);
                break;
        }
    };
    
    adhocDoor.prototype.destroy = function() {
        this.load();
        if(this.getProperty('companionDoor')) {
            this.getProperty('companionDoor').destroy();
        }
        
        door.prototype.destroy.call(this);
    };
    
    adhocDoor.prototype.load = function() {
        var metaDoor = (this.token.get('gmnotes').match(/\*d\*([^\*]+)/g));
        this.initializeCollectionProperty('wallIds');
        if(metaDoor) {
            metaDoor = metaDoor[0].substring(3).split('.');
            this.setProperty('doorType', metaDoor[0]);
            var companionDoor = getManagedTokenById(metaDoor[1]);
            this.setProperty('companionDoor', companionDoor);
            this.setProperty('wallIds', metaDoor[2]);
        }
        
        var metaPositioning = (this.token.get("gmnotes").match(/\*z\*([^\*]+)/g));
        if(metaPositioning) {
            this.setProperty('positionWidth', metaPositioning[0]);
            this.setProperty('positionHeight', metaPositioning[1]);
            this.setProperty('positionRotation', metaPositioning[2]);
            this.setProperty('positionLeft', metaPositioning[3]);
            this.setProperty('positionTop', metaPositioning[4]);
        }
    };
    
    adhocDoor.prototype.save = function() {
        var wallIds = this.getProperty('wallIds');
        var wallId;
        if(wallIds && wallIds.length > 0) {
            wallId = wallIds[0][1];
        }
        
        var companionDoor = this.getProperty('companionDoor');
        var companionDoorId;
        if(companionDoor) {
            companionDoorId = companionDoor.token.id;
        }
    
        var newGmNotes = 
            '*adhocDoor*%3Cbr%3E'
            + '*d*' 
                + saveBlank(this.getProperty('doorType')) + '.' 
                + saveBlank(companionDoorId) + '.' 
                + saveBlank(wallId)
                + "*%3Cbr%3E"
            + '*z*' 
                + this.token.get('width') + '.' 
                + this.token.get('height') + '.' 
                + this.token.get('rotation') + '.' 
                + this.token.get('left') + '.' 
                + this.token.get('top') 
                + "*%3Cbr%3E";
        this.token.set('gmnotes', newGmNotes);
    };
    
    adhocDoor.prototype.shouldDrawWalls = function() {
        return this.getProperty('doorType') == 'doorClosed' && door.prototype.shouldDrawWalls.call(this);
    };
    
    adhocDoor.prototype.draw = function() {
        this.load();
        var oldWallIds = this.getProperty('wallIds');
        
        if(this.shouldDrawWalls()) {
            var points = this.getPoints();
            var wall;
            
            //draw a LoS wall through the longer dimension of the pic:
            if(this.token.get('width') > this.token.get('height')) {
                wall = createLosWall(this.token, points.midLeft, points.midRight);
            } else {
                wall = createLosWall(this.token, points.topMid, points.botMid);
            }
            
            this.initializeCollectionProperty('wallIds');
            this.setProperty('wallIds', wall.id);
        }
        
        var companionDoor = this.getProperty('companionDoor');
        
        if(companionDoor) {
            companionDoor.hide();
        }
        
        this.save();
        this.deleteObjects(oldWallIds);
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
            case 'adhocDoor':
                return new adhocDoor(token);
                break;
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
    
    saveBlank = function(value) {
        return ('undefined' === value || !value) ? '' : value;
    },
    
    //validates that there is exactly one of each selection type:
    validateSelections = function(msg, selectionTypes) {
        if(!msg.selected || msg.selected.length !== selectionTypes.length) {
            sendWhisper(msg.who, 'You need to have ' + selectionTypes.length  + ' image(s) selected.');
        } else {
            selectionTypes.forEach(function(selectionType) {
                var found = false;
                
                msg.selected.forEach(function(selection) {
                    var token = getManagedTokenById(selection._id);
                    
                    if(!token) {
                        if(selectionType == 'empty') {
                            found = true;
                        }
                    } else if(token.isType(selectionType)) {
                        found = true;
                    }
                });
                
                if(!found) {
                    return false;
                }
            });
            
            return true;
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
            case 'adhocDoorOpen':
                var emptyToken = getObj('graphic', msg.selected[0]._id);
                token = new adhocDoor(emptyToken);
                token.setProperty('doorType', 'doorOpen');
                break;
            case 'adhocDoorClosed':
                var emptyToken = getObj('graphic', msg.selected[0]._id);
                token = new adhocDoor(emptyToken);
                token.setProperty('doorType', 'doorClosed');
                break;
            case 'adhocDoorCompanion':
                //sort out which image is which:
                var newDoor, oldDoor;
                msg.selected.forEach(function(selection) {
                    var token = getManagedTokenById(selection._id);
                    
                    if(!token) {
                        newDoor = getObj('graphic', selection._id);
                    } else {
                        oldDoor = token;
                    }
                });
                
                oldDoor.load();
                
                newDoor = new adhocDoor(newDoor);
                var newDoorType = (oldDoor.getProperty('doorType') == 'doorClosed' ? 'doorOpen' : 'doorClosed');
                newDoor.setProperty('doorType', newDoorType);
                
                oldDoor.setProperty('companionDoor', newDoor);
                newDoor.setProperty('companionDoor', oldDoor);
                
                //save token so that companionDoor properties aren't lost on drawing:
                newDoor.save();
                
                //save token so that companionDoor properties aren't lost on drawing:
                oldDoor.setProperty('companionDoor', newDoor);
                oldDoor.save();
                
                token = oldDoor;
                
                break;
            default:
                log('Unknown tokenType of ' + tokenType + ' in createManagedToken().');
                break;
        }
        
        if(token.isType('door')) {
            if(state.APIRoomManagement.doorPrivsDefault === 0) {
                adhocDoor.set("layer", "map");
            } else {
                adhocDoor.set("controlledby", "all");
                adhocDoor.set("layer", "objects");
            }
        }
        
        token.draw();
    },
    
    destroyManagedToken = function(msg) {
        var token = getManagedTokenById(msg.selected[0]._id);
        token.destroy();
    },
    
    //creates a dynamic lighting segment from A to B on the parent's page: 
    createLosWall = function(parent, pointA, pointB) {
        var isPositiveSlope = (((pointB.y - pointA.y) === 0) || (((pointB.x - pointA.x) / (pointB.y - pointA.y)) >= 0));
        var top = Math.min(pointA.y, pointB.y);
        var left = Math.min(pointA.x, pointB.x);
        var path;
        
        //create a path for a segment from A to B relative to (left,top):
        if(isPositiveSlope) {
            if(pointA.x > pointB.x) {
                path = "[[\"M\"," + Math.abs(pointA.x - pointB.x) + "," + Math.abs(pointA.y - pointB.y) + "],[\"L\",0,0]]";
            } else {
                path = "[[\"M\",0,0],[\"L\"," + Math.abs(pointB.x - pointA.x) + "," + Math.abs(pointB.y - pointA.y) + "]]";
            }
        } else {
            if(pointA.x > pointB.x) {
                path = "[[\"M\"," + Math.abs(pointA.x - pointB.x) + ",0],[\"L\",0," + Math.abs(pointB.y - pointA.y) + "]]";
            } else {
                path = "[[\"M\",0," + Math.abs(pointA.y - pointB.y) + "],[\"L\"," + Math.abs(pointB.x - pointA.x) + ",0]]";
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
    
    handleUserInput = function(msg) {
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
                        if(validateSelections(msg, ['empty'])) {
                            createManagedToken(msg, 'adhocWall');
                        }
                        break;
                    case "adhocWallRemove":
                        if(validateSelections(msg, ['adhocWall'])) {
                            destroyManagedToken(msg);
                        }
                        break;
                    case "adhocDoorAdd":
                        if(chatCommand.length == 3) {
                            //if there is a parameter, then this is the first door of an adhoc door set:
                            if(validateSelections(msg, ['empty'])) {
                                switch(chatCommand[2]) {
                                    case "open":
                                        createManagedToken(msg, 'adhocDoorOpen');
                                        break;
                                    case "closed":
                                        createManagedToken(msg, 'adhocDoorClosed');
                                        break;
                                    default:
                                        help(msg.who, "adhocDoorAdd");
                                        break;
                                }
                            }
                        } else if(chatCommand.length == 2) {
                            //if there is no parameter, then this is appending a second door to an adhoc door set:
                            if(validateSelections(msg, ['empty', 'adhocDoor'])) {
                                createManagedToken(msg, 'adhocDoorCompanion');
                            }
                        } else {
                            help(msg.who, "adhocDoorAdd");
                        }
                        break;
                    /*case "adhocDoorMove":
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
