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
        getType: function() { return this.type; }
    };
    
    inheritPrototype(managedToken, typedObject);
    
    managedToken.prototype.getPoints = function() {
        return getPoints(this.token.get("width"), this.token.get("height"), this.token.get("rotation"), this.token.get("left"), this.token.get("top"));
    };
    
    inheritPrototype(adhocWall, managedToken);
    
    adhocWall.prototype.draw = function() {
        var points = this.getPoints();
        
        
        /*var wallXY = getPoints(adhocWall.get("width"), adhocWall.get("height"), adhocWall.get("rotation"), adhocWall.get("left"), adhocWall.get("top"));
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
        
        adhocWall.set("gmnotes", newGmNotes);*/
    };
    
    /* managed tokens - end */
    
    
    /* token operations - begin */
    
    var getTypeFromToken = function(token) {
        var gmNotes = '' + token.get('gmnotes');
        var tokenType = gmNotes.match(/^\*\w+\*/);
        
        if(tokenType) {
            return tokenType[0].substring(1,tokenType[0].length-1);
        }
        
        return null;
    },
    
    getManagedToken = function(tokenId) {
        var token = getObj("graphic", tokenId);
        
        if(!token) {
            return null;
        }
        
        var tokenType = getTypeFromToken(token);
        
        if(!tokenType) {
            return null;
        }
        
        switch(tokenType) {
            case 'room':
                return new room(token);
                break;
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
    };
    
    /* token operations - end */
    
    
    /* text command handling - begin */
    
    var handleUserInput = function (msg) {
        if(msg.type == "api" && msg.content.match(/^!api-room/) && playerIsGM(msg.playerid)) {
            var token = getManagedToken(msg.selected[0]._id);
            log(token);
            token.draw();
        }
    };
    
    /* text command handling - end */
    
    
    /* nuts and bolts - begin */
    
    //register event handlers:
    registerEventHandlers = function() {
        on('chat:message', handleUserInput);
        //on('change:graphic', handleObjectChange);
    }
    
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
