var APIRoomManagement = APIRoomManagement || (function() {
    
    /* core - begin */
    
    var inheritPrototype = function(childObject, parentObject) {
        var copyOfParent = Object.create(parentObject.prototype);
        copyOfParent.constructor = childObject;
        childObject.prototype = copyOfParent;
    },
    
    typedObject = function() {
        this.type = new Array();
    },
    
    /* core - end */
    
    
    /* managed tokens - begin */
    
    managedToken = function() {
        typedObject.call(this);
        this.type.push('managedToken');
    },
    
    room = function() {
        managedToken.call(this);
        this.type.push('room');
    },
    
    adhocWall = function() {
        managedToken.call(this);
        this.type.push('adhocWall');
    },
    
    door = function() {
        managedToken.call(this);
        this.type.push('door');
    },
    
    roomDoor = function() {
        door.call(this);
        this.type.push('roomDoor');
    },
    
    adhocDoor = function() {
        door.call(this);
        this.type.push('adhocDoor');
    };
    
    typedObject.prototype = {
        constructor: typedObject,
        getType: function() { return this.type; }
    };
    
    inheritPrototype(managedToken, typedObject);
    
    inheritPrototype(adhocWall, managedToken);
    
    adhocWall.prototype.draw = function() {
        
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
                return new room();
                break;
            case 'adhocWall':
                return new adhocWall();
                break;
            //TODO: more types    
            default:
                log('Unknown tokenType of ' + tokenType + ' in getManagedToken().');
                break;
        }
        
        return null;
    };
    
    /* token operations - end */
    
    
    /* text command handling - begin */
    
    var handleUserInput = function (msg) {
        if(msg.type == "api" && msg.content.match(/^!api-room/) && playerIsGM(msg.playerid)) {
            var token = getManagedToken(msg.selected[0]._id);
            log(token);
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
        room: room,
        adhocWall: adhocWall,
        roomDoor: roomDoor,
        adhocDoor: adhocDoor
    };
    
    /* nuts and bolts - end */
    
})();

//run the script:
on('ready', function() {
    'use strict';
    
    APIRoomManagement.registerEventHandlers();
});
