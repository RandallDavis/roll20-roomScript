var APIRoomManagement = APIRoomManagement || (function() {
    
    /* core - begin */
    
    var version = 3.0,
        schemaVersion = 0.3,
        closedDoorAlertPic = 'https://s3.amazonaws.com/files.d20.io/images/8543193/5XhwOpMaBUS_5B444UNC5Q/thumb.png?1427665106',
        openDoorAlertPic = 'https://s3.amazonaws.com/files.d20.io/images/8543205/QBOWp1MHHlJCrPWn9kcVqQ/thumb.png?1427665124',
        padlockAlertPic = 'https://s3.amazonaws.com/files.d20.io/images/8546285/bdyuCfZSGRXr3qrVkcPkAg/thumb.png?1427673372',
        
    checkInstall = function() {
        
        log('-=> Room Management v'+version+' <=-');
        
        if(!_.has(state,'APIRoomManagement') || state.APIRoomManagement.version !== schemaVersion) {
            log('APIRoomManagement: Resetting state. Door images will need to be set.');
            state.APIRoomManagement = {
                version: schemaVersion,
                wallColor: '#00FF00',
                doorOpenPicUrl: '',
                doorClosedPicUrl: '',
                adhocDoorMoveMode: 0,
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
        this._type = new Array();
    },
    
    /* core - end */
    
    
    /* managed tokens - begin */
    
    managedToken = function(token) {
        typedObject.call(this);
        this._type.push('managedToken');
        this._token = token;
    },
    
    room = function(token) {
        managedToken.call(this, token);
        this._type.push('room');
    },
    
    adhocWall = function(token) {
        managedToken.call(this, token);
        this._type.push('adhocWall');
    },
    
    door = function(token) {
        managedToken.call(this, token);
        this._type.push('door');
    },
    
    roomDoor = function(token) {
        door.call(this, token);
        this._type.push('roomDoor');
    },
    
    adhocDoor = function(token) {
        door.call(this, token);
        this._type.push('adhocDoor');
    },
    
    roomSide = function() {
        typedObject.call(this);
        this._type.push('roomSide');
    },
    
    roomSideEmpty = function() {
        roomSide.call(this);
        this._type.push('roomSideEmpty');
    },
    
    roomSideWall = function() {
        roomSide.call(this);
        this._type.push('roomSideWall');
    },
    
    roomSideDoor = function() {
        roomSide.call(this);
        this._type.push('roomSideDoor');
    };
    
    typedObject.prototype = {
        constructor: typedObject,
        isType: function(type) {
            var found = false;
           
            this._type.forEach(function(typeValue) {
                if(type == typeValue) {
                    found = true;
                    return;
                }
            });
           
           return found;
        },
        getProperty: function(property) {
            if(!property) {
                throw new Error('No property specified in getProperty().');
            }
            
            if('undefined' === typeof(this['_' + property])) {
                return null;
            }
            
            return this['_' + property];
        },
        setProperty: function(property, value) {
            if(!property) {
                throw new Error('No property specified in setProperty().');
            }
            
            if(!value) {
                throw new Error("No value specified in setProperty().");
            }
            
            switch(property) {
                default:
                    throw new Error(property + ' is unknown in setProperty().');
                    break;
            }
        },
        initializeCollectionProperty: function(property) {
            if(!property) {
                throw new Error('No property specified in initializeCollectionProperty().');
            }
            
            switch(property) {
                default:
                    throw new Error(property + ' is unknown in initializeCollectionProperty().');
                    break;
            }
        }
    };
    
    inheritPrototype(managedToken, typedObject);
    
    managedToken.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'token':
                this['_' + property] = value;
                break;
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
        var token = this.getProperty('token');
        return getPoints(token.get('width'), token.get('height'), token.get('rotation'), token.get('left'), token.get('top'));
    };
    
    managedToken.prototype.shouldDrawWalls = function() {
        return (this.getProperty('token').get('layer') !== 'gmlayer');
    };
    
    managedToken.prototype.destroy = function() {
        this.load();
        deleteObjects(this.getProperty('wallIds'));
        this.getProperty('token').remove();
    };
    
    inheritPrototype(room, managedToken);
    
    room.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'sides':
                this['_' + property].push(value);
                break;
            default:
                managedToken.prototype.setProperty.call(this, property, value);
                break;
        }
    };
    
    room.prototype.initializeCollectionProperty = function(property) {
        switch(property) {
            case 'sides':
                this['_' + property] = new Array();
                break;
            default:
                managedToken.prototype.initializeCollectionProperty.call(this, property);
                break;
        }
    };
    
    room.prototype.load = function() {
        var room = this;
        
        var metaSides = this.getProperty('token').get('gmnotes').match(/\*\S\*([^\*]+)/g);
        this.initializeCollectionProperty('sides');
        if(metaSides) {
            metaSides.forEach(function(metaSide) {
                var sideOfRoom = metaSide.substring(1, 2);
                var side;
                metaSide = metaSide.substring(3).split('.');
                switch(metaSide[0]) {
                    case 'empty':
                        side = new roomSideEmpty();
                        break;
                    case 'wall':
                        side = new roomSideWall();
                        break;
                    case 'doorOpen':
                    case 'doorClosed':
                        side = new roomSideDoor();
                        
                        var doorOpen = getManagedTokenById(metaSide[1]);
                        var doorClosed = getManagedTokenById(metaSide[2]);
                        side.setProperty('doorOpen', doorOpen);
                        side.setProperty('doorClosed', doorClosed);
                        break;
                    default:
                        log('Unknown sideType of ' + metaSide[0] + ' in room.load().');
                        break;
                }
                
                side.setProperty('sideOfRoom', sideOfRoom);
                side.setProperty('sideType', metaSide[0]);
                
                side.initializeCollectionProperty('wallIds');
                switch(metaSide[0]) {
                    case 'wall':
                        side.setProperty('wallIds', metaSide[metaSide.length - 1]);
                        break;
                    case 'doorOpen':
                    case 'doorClosed':
                        for(var i = 3;i < metaSide.length;i++) {
                            side.setProperty('wallIds', metaSide[i]);
                        }
                        break;
                    default:
                        break;
                }
                
                room.setProperty('sides', side);
            });
        }
    };
    
    room.prototype.save = function() {
        var newGmNotes = 
            '*room*%3Cbr%3E';
        
        var sides = this.getProperty('sides');
        sides.forEach(function(side) {
            newGmNotes = newGmNotes 
                + '*' + side.getProperty('sideOfRoom') + '*'
                + side.getProperty('sideType');
                
            if(side.isType('roomSideWall')) {
                newGmNotes = newGmNotes
                    + '.' + side.getProperty('wallIds')[0][1];
            }
                
            if(side.isType('roomSideDoor')) {
                var doorOpen = side.getProperty('doorOpen');
                if(doorOpen) {
                    newGmNotes = newGmNotes
                    + '.' + doorOpen.getProperty('token').id;
                } else {
                    newGmNotes = newGmNotes + '.';
                }
                
                var doorClosed = side.getProperty('doorClosed');
                if(doorClosed) {
                    newGmNotes = newGmNotes
                    + '.' + doorClosed.getProperty('token').id;
                } else {
                    newGmNotes = newGmNotes + '.';
                }
                
                side.getProperty('wallIds').forEach(function(wallId) {
                    newGmNotes = newGmNotes
                        + '.' + wallId[1];
                });
            }
            
            newGmNotes = newGmNotes
                + '*%3Cbr%3E';
        });
            
        this.getProperty('token').set('gmnotes', newGmNotes);
    };
    
    room.prototype.draw = function() {
        this.load();
        
        //rooms are always drawn on map layer or gm layer:
        var token = this.getProperty('token');
        if(token.get('layer') == 'objects') {
            token.set('layer', 'maps');
        }
        
        var points = this.getPoints();
        
        this.getProperty('sides').forEach(function(side) {
            switch(side.getProperty('sideOfRoom')) {
                case 'l':
                    side.draw(token, points.topLeft, points.botLeft, token.get('height'), 0, points.midLeft);
                    break;
                case 'r':
                    side.draw(token, points.topRight, points.botRight, token.get('height'), 180, points.midRight);
                    break;
                case 't':
                    side.draw(token, points.topLeft, points.topRight, token.get('width'), 90, points.topMid);
                    break;
                case 'b':
                    side.draw(token, points.botLeft, points.botRight, token.get('width'), 270, points.botMid);
                    break;
                default:
                    log('Unknown sideOfRoom in room.draw().');
                    break;
            }
        });
        
        this.save();
    };
    
    room.prototype.destroy = function() {
        this.load();
        this.getProperty('sides').forEach(function(side) {
            side.destroy();
        });
        managedToken.prototype.destroy.call(this);
    };
    
    room.prototype.addSide = function(command, msg) {
        var commands = command.split(' ');
        
        //validate side:
        switch(commands[0]) {
            case 't':
            case 'b':
            case 'l':
            case 'r':
                break;
            default:
                sendWhisper(who, "Side must be 't', 'b', 'l', or 'r'.");
                return;
        }
        
        //validate type:
        switch(commands[1]) {
            case 'empty':
            case 'wall':
            case 'doorClosed':
            case 'doorOpen':
                break;
            default:
                sendWhisper(who, "Type must be 'empty', 'wall', 'doorClosed', or 'doorOpen'.");
                return;
        }
        
        this.load();
        
        //make sure that the room doesn't already have a side where the new one is being added:
        var found = false;
        this.getProperty('sides').forEach(function(side) {
            if(side.getProperty('sideOfRoom') == commands[0]) {
                found = true;
            }
        });
        if(found) {
            sendWhisper(msg.who, "That side is already on that room.");
            return;
        }
        
        //create the side:
        var side;
        switch(commands[1]) {
            case 'empty':
                side = new roomSideEmpty();
                break;
            case 'wall':
                side = new roomSideWall();
                break;
            case 'doorOpen':
            case 'doorClosed':
                side = new roomSideDoor();
                break;
            default:
                log('Unknown sideType in room.addSide().');
                break;
        }
        
        side.setProperty('sideOfRoom', commands[0]);
        side.setProperty('sideType', commands[1]);
        
        side.initializeCollectionProperty('wallIds');
        switch(commands[1]) {
            case 'doorOpen':
                side.setProperty('wallIds', '');
            case 'wall':
            case 'doorClosed':
                side.setProperty('wallIds', '');
                break;
            default:
                break;
        }
        
        this.setProperty('sides', side);
        
        this.save();
        this.draw();
    };
    
    room.prototype.removeSide = function(sideOfRoom, msg) {
        var room = this;
        
        this.load();
        
        var side;
        var sides = this.getProperty('sides');
        
        this.initializeCollectionProperty('sides');
        sides.forEach(function(roomSide) {
            if(roomSide.getProperty('sideOfRoom') == sideOfRoom) {
                side = roomSide;
            } else {
                room.setProperty('sides', roomSide);
            }
        });
        
        if(!side) {
            sendWhisper(msg.who, "The side '" + sideOfRoom + "' cannot be found in the selected room.");
            return;
        }
        
        side.destroy();
        
        this.save();
    };
    
    inheritPrototype(adhocWall, managedToken);
    
    adhocWall.prototype.load = function() {
        var metaWall = this.getProperty('token').get('gmnotes').match(/\*w\*([^\*]+)/g);
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
        this.getProperty('token').set('gmnotes', newGmNotes);
    };
    
    adhocWall.prototype.draw = function() {
        this.load();
        var oldWallIds = this.getProperty('wallIds');
        
        if(this.shouldDrawWalls()) {
            var points = this.getPoints();
            var wall;
            
            //draw a LoS wall through the longer dimension of the pic:
            if(this.getProperty('token').get('width') > this.getProperty('token').get('height')) {
                wall = createLosWall(this.getProperty('token'), points.midLeft, points.midRight);
            } else {
                wall = createLosWall(this.getProperty('token'), points.topMid, points.botMid);
            }
            
            this.initializeCollectionProperty('wallIds');
            this.setProperty('wallIds', wall.id);
        }
        
        this.save();
        deleteObjects(oldWallIds);
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
    
    inheritPrototype(roomDoor, door);
    
    roomDoor.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'room':
                this['_' + property] = value;
                break;
            default:
                door.prototype.setProperty.call(this, property, value);
                break;
        }
    };
    
    roomDoor.prototype.load = function() {
        var metaRoom = this.getProperty('token').get('gmnotes').match(/\*p\*([^\*]+)/g);
        if(metaRoom) {
            metaRoom = metaRoom[0].substring(3);
        }
        var room = getManagedTokenById(metaRoom);
        this.setProperty('room', room);
    };
    
    roomDoor.prototype.attemptToggle = function() {
        this.load();
        var token = this.getProperty('token');
        
        //find the roomSide that the door is on:
        var side;
        var room = this.getProperty('room');
        room.load();
        room.getProperty('sides').forEach(function(roomSide) {
            if(roomSide.isType('roomSideDoor')) {
                var doorOpen = roomSide.getProperty('doorOpen');
                var doorClosed = roomSide.getProperty('doorClosed');
                
                if((doorOpen && doorOpen.getProperty('token').id == token.id)
                        || (doorClosed && doorClosed.getProperty('token').id == token.id)) {
                    side = roomSide;
                }
            }
        });
        
        if(!side) {
            log('No room side could be found containing this door.');
            return;
        }
        
        var newSideType = side.getProperty('sideType') == 'doorClosed' ? 'doorOpen' : 'doorClosed';
        var newActiveDoor = side.getProperty(newSideType);
        side.setProperty('sideType', newSideType);
        
        room.save();
        room.draw();
        
        var newActiveDoorToken;
        if(newActiveDoor) {
            newActiveDoorToken = newActiveDoor.getProperty('token');
        
            //visual alert:
            setTimeout(
                visualAlert(
                    newSideType == 'doorClosed' ? closedDoorAlertPic : openDoorAlertPic,
                    newActiveDoorToken.get('left'),
                    newActiveDoorToken.get('top'),
                    1.0,
                    0), //don't blink
                5);
        }
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
        
        var companionDoor = this.getProperty('companionDoor');
        
        if(companionDoor) {
            companionDoor.load();
            
            //unlink doors:
            this.setProperty('companionDoor', null);
            companionDoor.setProperty('companionDoor', null);
            
            this.save();
            companionDoor.save();
            
            companionDoor.destroy();
        }
        
        door.prototype.destroy.call(this);
    };
    
    adhocDoor.prototype.load = function() {
        var token = this.getProperty('token');
        
        var metaDoor = (token.get('gmnotes').match(/\*d\*([^\*]+)/g));
        this.initializeCollectionProperty('wallIds');
        if(metaDoor) {
            metaDoor = metaDoor[0].substring(3).split('.');
            this.setProperty('doorType', metaDoor[0]);
            var companionDoor = getManagedTokenById(metaDoor[1]);
            this.setProperty('companionDoor', companionDoor);
            this.setProperty('wallIds', metaDoor[2]);
        }
        
        var metaPositioning = (token.get('gmnotes').match(/\*z\*([^\*]+)/g));
        if(metaPositioning) {
            metaPositioning = metaPositioning[0].substring(3).split('.');
            this.setProperty('positionWidth', metaPositioning[0]);
            this.setProperty('positionHeight', metaPositioning[1]);
            this.setProperty('positionRotation', metaPositioning[2]);
            this.setProperty('positionLeft', metaPositioning[3]);
            this.setProperty('positionTop', metaPositioning[4]);
        } else {
            //fudge positioning for backward compatibility:
            this.setProperty('positionWidth', token.get('width'));
            this.setProperty('positionHeight', token.get('height'));
            this.setProperty('positionRotation', token.get('rotation'));
            this.setProperty('positionLeft', token.get('left'));
            this.setProperty('positionTop', token.get('top'));
        }
    };
    
    adhocDoor.prototype.save = function() {
        var token = this.getProperty('token');
        
        var wallIds = this.getProperty('wallIds');
        var wallId;
        if(wallIds && wallIds.length > 0) {
            wallId = wallIds[0][1];
        }
        
        var companionDoor = this.getProperty('companionDoor');
        var companionDoorId;
        if(companionDoor) {
            companionDoorId = companionDoor.getProperty('token').id;
        }
    
        var newGmNotes = 
            '*adhocDoor*%3Cbr%3E'
            + '*d*' 
                + saveBlank(this.getProperty('doorType')) + '.' 
                + saveBlank(companionDoorId) + '.' 
                + saveBlank(wallId)
                + '*%3Cbr%3E'
            + '*z*' 
                + token.get('width') + '.' 
                + token.get('height') + '.' 
                + token.get('rotation') + '.' 
                + token.get('left') + '.' 
                + token.get('top') 
                + '*%3Cbr%3E';
        token.set('gmnotes', newGmNotes);
    };
    
    adhocDoor.prototype.shouldDrawWalls = function() {
        return this.getProperty('doorType') == 'doorClosed' && door.prototype.shouldDrawWalls.call(this);
    };
    
    adhocDoor.prototype.draw = function() {
        this.load();
        var token = this.getProperty('token');
        var oldWallIds = this.getProperty('wallIds');
        
        if(this.shouldDrawWalls()) {
            var points = this.getPoints();
            var wall;
            
            //draw a LoS wall through the longer dimension of the pic:
            if(token.get('width') > token.get('height')) {
                wall = createLosWall(token, points.midLeft, points.midRight);
            } else {
                wall = createLosWall(token, points.topMid, points.botMid);
            }
            
            this.initializeCollectionProperty('wallIds');
            this.setProperty('wallIds', wall.id);
        }
        
        var companionDoor = this.getProperty('companionDoor');
        
        if(companionDoor) {
            companionDoor.hide();
        }
        
        this.save();
        deleteObjects(oldWallIds);
    };
    
    adhocDoor.prototype.hide = function() {
        this.load();
        
        var oldWallIds = this.getProperty('wallIds');
        deleteObjects(oldWallIds);
        this.initializeCollectionProperty('wallIds');
        
        var token = this.getProperty('token');
        token.set('height', 0);
        token.set('width', 0);
        token.set('top', 10);
        token.set('left', 10);
        token.set('layer', 'gmlayer');
        
        this.save();
    };
    
    adhocDoor.prototype.recordPosition = function() {
        this.load();
            
        //update meta position with new placement:
        var token = this.getProperty('token');
        this.setProperty('positionWidth', token.get('width'));
        this.setProperty('positionHeight', token.get('height'));
        this.setProperty('positionRotation', token.get('rotation'));
        this.setProperty('positionLeft', token.get('left'));
        this.setProperty('positionTop', token.get('top'));
        
        this.save();
    };
    
    adhocDoor.prototype.attemptToggle = function() {
        this.load();
        
        var companionDoor = this.getProperty('companionDoor');
        
        if(!companionDoor) {
            log('Attempt to toggle adhoc door that has no companion door. Aborting toggle.');
            this.draw();
        } else {
            companionDoor.load();
            
            var companionDoorToken = companionDoor.getProperty('token');
            var companionDoorDoorType = companionDoor.getProperty('doorType');
            
            companionDoorToken.set('width', parseInt(this.getProperty('positionWidth')));
            companionDoorToken.set('height', parseInt(this.getProperty('positionHeight')));
            companionDoorToken.set('rotation', parseInt(this.getProperty('positionRotation')));
            companionDoorToken.set('left', parseInt(this.getProperty('positionLeft')));
            companionDoorToken.set('top', parseInt(this.getProperty('positionTop')));
            companionDoorToken.set('layer', this.getProperty('token').get('layer'));
            
            companionDoor.save();
            companionDoor.draw();
            
            //visual alert:
            setTimeout(
                visualAlert(
                    companionDoorDoorType == 'doorClosed' ? closedDoorAlertPic : openDoorAlertPic,
                    companionDoorToken.get('left'),
                    companionDoorToken.get('top'),
                    1.0,
                    0), //don't blink
                5);
        }
    };
    
    inheritPrototype(roomSide, typedObject);
    
    roomSide.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'sideOfRoom':
            case 'sideType':
                this['_' + property] = value;
                break;
            case 'wallIds':
                this['_' + property].push(['path', value]);
                break;
            default:
                typedObject.prototype.setProperty.call(this, property, value);
                break;
        }
    };
    
    roomSide.prototype.initializeCollectionProperty = function(property) {
        switch(property) {
            case 'wallIds':
                this['_' + property] = new Array();
                break;
            default:
                typedObject.prototype.initializeCollectionProperty.call(this, property);
                break;
        }
    };
    
    roomSide.prototype.destroy = function() {
        deleteObjects(this.getProperty('wallIds'));
    };
    
    roomSide.prototype.shouldDrawWalls = function(layer) {
        return (layer !== 'gmlayer');
    };
    
    //intentional no-op:
    roomSide.prototype.draw = function(roomToken, pointA, pointB, sideLength, sideRotation, doorPosition) {};
    
    inheritPrototype(roomSideEmpty, roomSide);
    
    inheritPrototype(roomSideWall, roomSide);
    
    roomSideWall.prototype.draw = function(roomToken, pointA, pointB, sideLength, sideRotation, doorPosition) {
        var oldWallIds = this.getProperty('wallIds');
        
        if(this.shouldDrawWalls(roomToken.get('layer'))) {
            var wall = createLosWall(roomToken, pointA, pointB);
            
            this.initializeCollectionProperty('wallIds');
            this.setProperty('wallIds', wall.id);
        }
       
        deleteObjects(oldWallIds);
    };
    
    inheritPrototype(roomSideDoor, roomSide);
    
    roomSideDoor.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'doorOpen':
            case 'doorClosed':
                this['_' + property] = value;
                break;
            default:
                roomSide.prototype.setProperty.call(this, property, value);
                break;
        }
    };
    
    roomSideDoor.prototype.draw = function(roomToken, pointA, pointB, sideLength, sideRotation, doorPosition) {
        var oldWallIds = this.getProperty('wallIds');
        
        //draw walls:
        if(this.shouldDrawWalls(roomToken.get('layer'))) {
            this.initializeCollectionProperty('wallIds');
            
            switch(this.getProperty('sideType')) {
                case 'doorOpen':
                    //draw walls if wall is wide enough to draw around the door:
                    if(sideLength >= 80) {
                        var wall = createLosWall(roomToken, pointA, findPointWithOffset(pointA, doorPosition, 35));
                        this.setProperty('wallIds', wall.id);
                        wall = createLosWall(roomToken, findPointWithOffset(pointB, doorPosition, 35), pointB);
                        this.setProperty('wallIds', wall.id);
                    } else {
                        this.setProperty('wallIds', '');
                        this.setProperty('wallIds', '');
                    }
                    break;
                case 'doorClosed':
                    var wall = createLosWall(roomToken, pointA, pointB);
                    this.setProperty('wallIds', wall.id);
                    break;
                default:
                    break;
            }
        }
        
        deleteObjects(oldWallIds);
        
        //create open door if it doesn't exist:
        var doorOpen = this.getProperty('doorOpen');
        if(!doorOpen) {
            var imgsrc = state.APIRoomManagement.doorOpenPicUrl;
            if(!imgsrc) {
                log('Open door pic not set, so drawing room without open doors.');
            } else {
                var doorOpenToken = createObj('graphic', {
                        imgsrc: imgsrc,
                        layer: 'gmlayer',
                        pageid: roomToken.get('pageid'),
                        top: 10,
                        left: 10,
                        width: 1,
                        height: 1,
                        scale: 0.0000001
                    });
                    
                if(state.APIRoomManagement.doorPrivsDefault == 1) {
                    doorOpenToken.set("controlledby", "all");
                }
                
                doorOpenToken.set('gmnotes', '*roomDoor*%3Cbr%3E*p*' + roomToken.id + '*%3Cbr%3E');
                doorOpen = new roomDoor(doorOpenToken);
                doorOpen.setProperty('doorType', 'doorOpen');
                this.setProperty('doorOpen', doorOpen);
            }
        }
        
        //create closed door if it doesn't exist:
        var doorClosed = this.getProperty('doorClosed');
        if(!doorClosed) {
            var imgsrc = state.APIRoomManagement.doorClosedPicUrl;
            if(!imgsrc) {
                log('Closed door pic not set, so drawing room without closed doors.');
            } else {
                var doorClosedToken = createObj('graphic', {
                        imgsrc: imgsrc,
                        layer: 'gmlayer',
                        pageid: roomToken.get('pageid'),
                        top: 10,
                        left: 10,
                        width: 1,
                        height: 1,
                        scale: 0.0000001
                    });
                    
                if(state.APIRoomManagement.doorPrivsDefault == 1) {
                    doorClosedToken.set("controlledby", "all");
                }
                
                doorClosedToken.set('gmnotes', '*roomDoor*%3Cbr%3E*p*' + roomToken.id + '*%3Cbr%3E');
                doorClosed = new roomDoor(doorClosedToken);
                doorClosed.setProperty('doorType', 'doorClosed');
                this.setProperty('doorClosed', doorClosed);
            }
        }
        
        //wire up companion door relationships in case they don't already exist:
        if(doorOpen && doorClosed) {
            doorOpen.setProperty('companionDoor', doorClosed);
            doorClosed.setProperty('companionDoor', doorOpen);
        }
        
        var activeDoor, inactiveDoor;
        switch(this.getProperty('sideType')) {
            case 'doorOpen':
                activeDoor = doorOpen;
                inactiveDoor = doorClosed;
                break;
            case 'doorClosed':
                activeDoor = doorClosed;
                inactiveDoor = doorOpen;
                break;
            default:
                break;
        }
        
        if(activeDoor) {
            var activeDoorToken = activeDoor.getProperty('token');
            
            if(activeDoorToken.get('controlledby') && roomToken.get('layer') != 'gmlayer') {
                activeDoorToken.set('layer', 'objects');
                toBack(activeDoorToken);
            } else {
                activeDoorToken.set('layer', 'map');
                toFront(activeDoorToken);
            }
            activeDoorToken.set("height", 26);
            activeDoorToken.set("width", 70);
            activeDoorToken.set('rotation', roomToken.get('rotation') + sideRotation + 90); //TODO: this might overflow - take a mod
            activeDoorToken.set('top', doorPosition.y);
            activeDoorToken.set('left', doorPosition.x);
        }
        
        if(inactiveDoor) {
            var inactiveDoorToken = inactiveDoor.getProperty('token');
            inactiveDoorToken.set('height', 0);
            inactiveDoorToken.set('width', 0);
            inactiveDoorToken.set('top', 10);
            inactiveDoorToken.set('left', 10);
            inactiveDoorToken.set('layer', 'gmlayer');
        }
    };
    
    roomSideDoor.prototype.destroy = function() {
        var doorOpen = this.getProperty('doorOpen');
        if(doorOpen) {
            doorOpen.getProperty('token').remove();
        }
        
        var doorClosed = this.getProperty('doorClosed');
        if(doorClosed) {
            doorClosed.getProperty('token').remove();
        }
        
        roomSide.prototype.destroy.call(this);
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
            case 'room':
                return new room(token);
                break;
            case 'doorOpen': //for backwards compatibility
            case 'doorClosed': //for backwards compatibility
            case 'roomDoor':
                return new roomDoor(token);
                break;
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
    
    deleteObjects = function(objectIds) {
        if(objectIds) {
            objectIds.forEach(function(objectId) {
                var obj = getObj(objectId[0], objectId[1]);
                if(obj) {
                    setTimeout(function() {
                        obj.remove();
                    }, 5);
                }
            });
        }
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
            case 'room':
                var emptyToken = getObj('graphic', msg.selected[0]._id);
                token = new room(emptyToken);
                break;
            case 'adhocWall':
                var emptyToken = getObj('graphic', msg.selected[0]._id);
                token = new adhocWall(emptyToken);
                break;
            case 'adhocDoorOpen':
                var emptyToken = getObj('graphic', msg.selected[0]._id);
                token = new adhocDoor(emptyToken);
                token.setProperty('doorType', 'doorOpen');
                
                if(state.APIRoomManagement.doorPrivsDefault == 1) {
                    token.set("controlledby", "all");
                }
                
                break;
            case 'adhocDoorClosed':
                var emptyToken = getObj('graphic', msg.selected[0]._id);
                token = new adhocDoor(emptyToken);
                token.setProperty('doorType', 'doorClosed');
                
                if(state.APIRoomManagement.doorPrivsDefault == 1) {
                    token.set("controlledby", "all");
                }
                
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
                
                if(state.APIRoomManagement.doorPrivsDefault == 1) {
                    newDoor.set("controlledby", "all");
                }
                
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
                token.getProperty('token').set('layer', 'map');
            } else {
                token.getProperty('token').set('controlledby', 'all');
                token.getProperty('token').set('layer', 'objects');
            }
        }
        
        token.draw();
    },
    
    destroyManagedToken = function(msg) {
        var token = getManagedTokenById(msg.selected[0]._id);
        token.destroy();
    },
    
    addRoomSide = function(command, msg) {
        var room = getManagedTokenById(msg.selected[0]._id);
        room.addSide(command, msg);
    },
    
    removeRoomSide = function(sideOfRoom, msg) {
        var room = getManagedTokenById(msg.selected[0]._id);
        room.removeSide(sideOfRoom, msg);
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
                path = '[[\"M\",' + Math.abs(pointA.x - pointB.x) + ',' + Math.abs(pointA.y - pointB.y) + '],[\"L\",0,0]]';
            } else {
                path = '[[\"M\",0,0],[\"L\",' + Math.abs(pointB.x - pointA.x) + ',' + Math.abs(pointB.y - pointA.y) + ']]';
            }
        } else {
            if(pointA.x > pointB.x) {
                path = '[[\"M\",' + Math.abs(pointA.x - pointB.x) + ',0],[\"L\",0,' + Math.abs(pointB.y - pointA.y) + ']]';
            } else {
                path = '[[\"M\",0,' + Math.abs(pointA.y - pointB.y) + '],[\"L\",' + Math.abs(pointB.x - pointA.x) + ',0]]';
            }
        }
        
        //create a segment path on the walls layer to block LoS:
        var wall = createObj('path', {
            layer: 'walls',
            pageid: parent.get('pageid'),
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
    
    //finds a point on the AB segment, that is an 'offset' distance from B:
    findPointWithOffset = function(pointA, pointB, offset) {
        var distABx = pointB.x - pointA.x;
        var distABy = pointB.y - pointA.y;
        var distAB = Math.sqrt(Math.pow(distABx, 2) + Math.pow(distABy, 2));
        var distAZ = distAB - offset;
        var sinA = distABy / distAB;
        var zY = pointA.y + (sinA * distAZ);
        var zX = pointA.x + (distABx * (distAZ / distAB));
        
        return { x : zX,  y : zY };
    },
    
    //sets the door image for capturing to that of the selected image:
    setDoorUrl = function(msg, doorType) {
        var imgsrc = getCleanImgsrc(getObj('graphic', msg.selected[0]._id).get('imgsrc'));
        
        switch(doorType) {
            case 'doorClosed':
                state.APIRoomManagement.doorClosedPicUrl = imgsrc;
                sendWhisper(msg.who, 'Closed door image set.');
                break;
            case 'doorOpen': 
                state.APIRoomManagement.doorOpenPicUrl = imgsrc;
                sendWhisper(msg.who, 'Open door image set.');
                break;
            default:
                log('Unknown type ' + doorType + ' in setDoorUrl.');
                break;
        }
    },
    
    //set default for players being able to control doors:
    setDoorPrivsDefault = function(who, priv) {
        switch(priv) {
            case 'gm':
                state.APIRoomManagement.doorPrivsDefault = 0;
                sendWhisper(who, "Door privs set to 'gm'.");
                break;
            case 'players':
                state.APIRoomManagement.doorPrivsDefault = 1;
                sendWhisper(who, "Door privs set to 'players'.");
                break;
            default:
                sendWhisper(who, "Unexpected privledge value of " + priv + ". The expected values are 'gm' or 'players'.");
                break;
        }
    },
    
    setAdhocDoorMoveMode = function(mode) {
        switch(mode) {
            case 'on':
                state.APIRoomManagement.adhocDoorMoveMode = 1;
                break;
            case 'off':
                state.APIRoomManagement.adhocDoorMoveMode = 0;
                break;
            case 'toggle':
                state.APIRoomManagement.adhocDoorMoveMode = (state.APIRoomManagement.adhocDoorMoveMode + 1) % 2;
                break;
            default:
                log('Unexpected mode of ' + mode + ' in setAdhocDoorMoveMode().');
                break;
        }
    },
    
    //find imgsrc that is legal for object creation:
    getCleanImgsrc = function (imgsrc) {
        var parts = imgsrc.match(/(.*\/images\/.*)(thumb|max)(.*)$/);
        
        if(parts) {
          return parts[1] + 'thumb' + parts[3];
        }
        return null;
    },
    
    handleTokenChange = function(graphic) {
        var token = getManagedToken(graphic);
        
        if(!token) {
            return;
        }
        
        if(token.isType('adhocDoor') && state.APIRoomManagement.adhocDoorMoveMode == 1) {
            token.recordPosition();
        } else if(token.isType('door')) {
            token.attemptToggle();
        } else {
            token.draw();
        }
    },
    
    /* token operations - end */
    
    
    /* text command handling - begin */
    
    sendWhisper = function(to, message) {
        sendChat('Room API', '/w ' + to.split(' ')[0] + ' ' + message);  
    },
    
    handleUserInput = function(msg) {
        if(msg.type == 'api' && msg.content.match(/^!api-room/) && playerIsGM(msg.playerid)) {
            var chatCommand = msg.content.split(' ');
            if(chatCommand.length == 1) {
                //intuit(msg);
            } else {
                switch(chatCommand[1]) {
                    case 'help':
                        if(chatCommand.length <= 2) {
                            help(msg.who, '');
                        } else {
                            var helpText = chatCommand;
                            helpText.shift();
                            helpText.shift();
                            help(msg.who, helpText.join(' '));
                        }
                        break;
                    case 'roomAdd':
                        if(validateSelections(msg, ['empty'])) {
                            createManagedToken(msg, 'room');
                        }
                        break;
                    case 'roomRemove':
                        if(validateSelections(msg, ['room'])) {
                            destroyManagedToken(msg);
                        }
                        break;
                    case 'roomSideAdd':
                        if(chatCommand.length != 4) {
                            help(msg.who, 'roomSideAdd');
                        } else {
                            if(validateSelections(msg, ['room'])) {
                                chatCommand = msg.content.replace('!api-room roomSideAdd ', '');
                                addRoomSide(chatCommand, msg);
                            }
                        }
                        break;
                    case 'roomSideRemove':
                        if(chatCommand.length != 3) {
                            help(msg.who, 'roomSideRemove');
                        } else {
                            if(validateSelections(msg, ['room'])) {
                                chatCommand = msg.content.replace('!api-room roomSideRemove ', '');
                                removeRoomSide(chatCommand, msg);
                            }
                        }
                        break;
                    case 'roomDoorImageSet':
                        if(chatCommand.length != 3) {
                            help(msg.who, 'roomDoorImageSet');
                        } else {
                            //TODO: this could be made to allow empty or a door, which would be convenient for state refreshes. Change validateSections, rather than calling it multiple times which would produce multiple whispers:
                            if(validateSelections(msg, ['empty'])) {
                                switch(chatCommand[2]) {
                                    case "open":
                                        setDoorUrl(msg, 'doorOpen');
                                        break;
                                    case "closed":
                                        setDoorUrl(msg, 'doorClosed');
                                        break;
                                    default:
                                        help(msg.who, 'roomDoorImageSet');
                                        break;
                                }
                            }
                        }
                        break;
                    case 'adhocWallAdd':
                        if(validateSelections(msg, ['empty'])) {
                            createManagedToken(msg, 'adhocWall');
                        }
                        break;
                    case 'adhocWallRemove':
                        if(validateSelections(msg, ['adhocWall'])) {
                            destroyManagedToken(msg);
                        }
                        break;
                    case 'adhocDoorAdd':
                        if(chatCommand.length == 3) {
                            //if there is a parameter, then this is the first door of an adhoc door set:
                            if(validateSelections(msg, ['empty'])) {
                                switch(chatCommand[2]) {
                                    case 'open':
                                        createManagedToken(msg, 'adhocDoorOpen');
                                        break;
                                    case 'closed':
                                        createManagedToken(msg, 'adhocDoorClosed');
                                        break;
                                    default:
                                        help(msg.who, 'adhocDoorAdd');
                                        break;
                                }
                            }
                        } else if(chatCommand.length == 2) {
                            //if there is no parameter, then this is appending a second door to an adhoc door set:
                            if(validateSelections(msg, ['empty', 'adhocDoor'])) {
                                createManagedToken(msg, 'adhocDoorCompanion');
                            }
                        } else {
                            help(msg.who, 'adhocDoorAdd');
                        }
                        break;
                    case 'adhocDoorMove':
                        if(chatCommand.length == 3) {
                            //if there is a parameter, then this should explicitly specify a move mode:
                            switch(chatCommand[2]) {
                                case 'on':
                                    setAdhocDoorMoveMode('on');
                                    break;
                                case 'off':
                                    setAdhocDoorMoveMode('off');
                                    break;
                                default:
                                    help(msg.who, 'adhocDoorMove');
                            }
                        } else if(chatCommand.length == 2) {
                            //implied toggling of move mode:
                            setAdhocDoorMoveMode('toggle');
                        } else {
                            help(msg.who, 'adhocDoorMove');
                        }
                        break;
                    case 'adhocDoorRemove':
                        if(validateSelections(msg, ['adhocDoor'])) {
                            destroyManagedToken(msg);
                        }
                        break;
                    case 'doorPrivsDefaultSet':
                        if(chatCommand.length != 3) {
                            help(msg.who, 'doorPrivsDefaultSet');
                        } else {
                            setDoorPrivsDefault(msg.who, chatCommand[2]);
                        }
                        break;
                    /*case "toggleDoorLock":
                        toggleDoorLock(msg.selected, msg.who);
                        break;
                    case "toggleDoorTrap":
                        //TODO:
                        sendWhisper(msg.who, "not implemented yet");
                        break;*/
                    default:
                        help(msg.who, '');
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

on('ready', function() {
    'use strict';
    
    if('undefined' !== typeof(APIVisualAlert) && APIVisualAlert.visualAlert && _.isFunction(visualAlert)) {
        APIRoomManagement.checkInstall();
        APIRoomManagement.registerEventHandlers();
    } else {
        log('--------------------------------------------------------------');
        log('APIRoomManagement requires the VisualAlert script to work.');
        log('VisualAlert GIST: https://github.com/RandallDavis/roll20-visualAlertScript');
        log('--------------------------------------------------------------');
    }
});