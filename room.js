var APIRoomManagement = APIRoomManagement || (function() {
    
    /* core - begin */
    
    var version = 3.3,
        schemaVersion = 0.41,
        closedDoorAlertPic = 'https://s3.amazonaws.com/files.d20.io/images/8543193/5XhwOpMaBUS_5B444UNC5Q/thumb.png?1427665106',
        openDoorAlertPic = 'https://s3.amazonaws.com/files.d20.io/images/8543205/QBOWp1MHHlJCrPWn9kcVqQ/thumb.png?1427665124',
        padlockAlertPic = 'https://s3.amazonaws.com/files.d20.io/images/8546285/bdyuCfZSGRXr3qrVkcPkAg/thumb.png?1427673372',
        buttonBackgroundColor = '#E92862',
        mainBackgroundColor = '#3D8FE1',
        headerBackgroundColor = '#386EA5',
        
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
                doorPrivsDefault: 1, //0 = gm only, 1 = all players
                uiPreference: 0 //0 = chat, 1 = handout
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
    
    /* core - end */
    
    
    /* managed tokens - begin */
    
    var managedToken = function(token) {
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
        var success = true;
        
        success = success && this.load();
        deleteObjects(this.getProperty('wallIds'));
        this.getProperty('token').remove();
        
        return success;
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
        var success = true;
        
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
                        success = false;
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
        
        return success;
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
            token.set('layer', 'map');
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
        var success = true;
        
        success = success && this.load();
        this.getProperty('sides').forEach(function(side) {
            side.destroy();
        });
        success = success && managedToken.prototype.destroy.call(this);
        
        return success;
    };
    
    room.prototype.addSide = function(command, msg) {
        var success = true;
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
                return false;
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
                return false;
        }
        
        success = success && this.load();
        
        //make sure that the room doesn't already have a side where the new one is being added:
        var found = false;
        this.getProperty('sides').forEach(function(side) {
            if(side.getProperty('sideOfRoom') == commands[0]) {
                found = true;
            }
        });
        if(found) {
            sendWhisper(msg.who, "That side is already on that room.");
            return false;
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
                return false;
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
        
        return success;
    };
    
    room.prototype.removeSide = function(sideOfRoom, msg) {
        var success = true;
        var room = this;
        
        success = success && this.load();
        
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
            return false;
        }
        
        success = success && side.destroy();
        
        this.save();
        
        return success;
    };
    
    inheritPrototype(adhocWall, managedToken);
    
    adhocWall.prototype.load = function() {
        var metaWall = this.getProperty('token').get('gmnotes').match(/\*w\*([^\*]+)/g);
        this.initializeCollectionProperty('wallIds');
        if(metaWall) {
            this.setProperty('wallIds', metaWall[0].substring(3));
        }
        
        return true;
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
            case 'locked':
                this['_' + property] = value;
                break;
            default:
                managedToken.prototype.setProperty.call(this, property, value);
                break;
        }
    };
    
    door.prototype.toggleLock = function() {
        this.load();
        this.setProperty('locked', !this.getProperty('locked'));
        this.save();
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
        
        var metaFeature = this.getProperty('token').get('gmnotes').match(/\*f\*([^\*]+)/g);
        if(metaFeature) {
            metaFeature = metaFeature[0].substring(3).split('.');
            this.setProperty('locked', metaFeature[0] == '1');
        }
        
        return true;
    };
    
    roomDoor.prototype.save = function() {
        var room = this.getProperty('room');
        var roomId;
        if(room) {
            roomId = room.getProperty('token').id;
        }
    
        var newGmNotes = 
            '*roomDoor*%3Cbr%3E'
            + '*p*' 
                + saveBlank(roomId)
                + '*%3Cbr%3E'
            + '*f*'
                + (this.getProperty('locked') ? '1' : '')
                + '*%3Cbr%3E';
        this.getProperty('token').set('gmnotes', newGmNotes);
    };
    
    roomDoor.prototype.attemptToggle = function() {
        this.load();
        var token = this.getProperty('token');
        var room = this.getProperty('room');
        
        if(this.getProperty('locked')) {
            room.draw();
            
            //visual alert:
            setTimeout(
                APIVisualAlert.visualAlert(
                    padlockAlertPic,
                    token.get('left'),
                    token.get('top'),
                    1.0,
                    2),
                5);
        } else {
            //find the roomSide that the door is on:
            var side;
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
                    APIVisualAlert.visualAlert(
                        newSideType == 'doorClosed' ? closedDoorAlertPic : openDoorAlertPic,
                        newActiveDoorToken.get('left'),
                        newActiveDoorToken.get('top'),
                        1.0,
                        0), //don't blink
                    5);
            }
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
        var success = true;
        
        success = success && this.load();
        
        var companionDoor = this.getProperty('companionDoor');
        
        if(companionDoor) {
            success = success && companionDoor.load();
            
            //unlink doors:
            this.setProperty('companionDoor', null);
            companionDoor.setProperty('companionDoor', null);
            
            this.save();
            companionDoor.save();
            
            success = success && companionDoor.destroy();
        }
        
        success = success && door.prototype.destroy.call(this);
        
        return success;
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
        
        var metaFeature = (token.get('gmnotes').match(/\*f\*([^\*]+)/g));
        if(metaFeature) {
            metaFeature = metaFeature[0].substring(3).split('.');
            this.setProperty('locked', metaFeature[0] == '1');
        }
        
        return true;
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
                + '*%3Cbr%3E'
            + '*f*'
                + (this.getProperty('locked') ? '1' : '')
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
        
        if(this.getProperty('locked')) {
            var token = this.getProperty('token');
            
            //put door back into position:
            token.set('width', parseInt(this.getProperty('positionWidth')));
            token.set('height', parseInt(this.getProperty('positionHeight')));
            token.set('rotation', parseInt(this.getProperty('positionRotation')));
            token.set('left', parseInt(this.getProperty('positionLeft')));
            token.set('top', parseInt(this.getProperty('positionTop')));
            token.set('layer', this.getProperty('token').get('layer'));
            
            //visual alert:
            setTimeout(
                APIVisualAlert.visualAlert(
                    padlockAlertPic,
                    token.get('left'),
                    token.get('top'),
                    1.0,
                    2),
                5);
        } else {
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
                    APIVisualAlert.visualAlert(
                        companionDoorDoorType == 'doorClosed' ? closedDoorAlertPic : openDoorAlertPic,
                        companionDoorToken.get('left'),
                        companionDoorToken.get('top'),
                        1.0,
                        0), //don't blink
                    5);
            }
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
        
        return true;
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
        var success = true;
        
        var doorOpen = this.getProperty('doorOpen');
        if(doorOpen) {
            doorOpen.getProperty('token').remove();
        }
        
        var doorClosed = this.getProperty('doorClosed');
        if(doorClosed) {
            doorClosed.getProperty('token').remove();
        }
        
        success = success && roomSide.prototype.destroy.call(this);
        
        return success;
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
                    token.getProperty('token').set('controlledby', 'all');
                }
                
                break;
            case 'adhocDoorClosed':
                var emptyToken = getObj('graphic', msg.selected[0]._id);
                token = new adhocDoor(emptyToken);
                token.setProperty('doorType', 'doorClosed');
                
                if(state.APIRoomManagement.doorPrivsDefault == 1) {
                    token.getProperty('token').set('controlledby', 'all');
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
                    newDoor.set('controlledby', 'all');
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
                return false;
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
        
        return true;
    },
    
    destroyManagedToken = function(msg) {
        var token = getManagedTokenById(msg.selected[0]._id);
        return token.destroy();
    },
    
    addRoomSide = function(command, msg) {
        var room = getManagedTokenById(msg.selected[0]._id);
        return room.addSide(command, msg);
    },
    
    removeRoomSide = function(sideOfRoom, msg) {
        var room = getManagedTokenById(msg.selected[0]._id);
        return room.removeSide(sideOfRoom, msg);
    },
    
    toggleDoorLock = function(msg) {
        var door = getManagedTokenById(msg.selected[0]._id);
        door.toggleLock();
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
                break;
            case 'doorOpen': 
                state.APIRoomManagement.doorOpenPicUrl = imgsrc;
                break;
            default:
                log('Unknown type ' + doorType + ' in setDoorUrl.');
                return false;
        }
        
        return true;
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
                sendWhisper(who, "Unexpected privledge value of '" + priv + "'. The expected values are 'gm' or 'players'.");
                break;
        }
    },
    
    setUiPreference = function(who, setting) {
        switch(setting) {
            case 'chat':
                state.APIRoomManagement.uiPreference = 0;
                sendWhisper(who, 'UI will output to chat window.');
                break;
            case 'handout':
                state.APIRoomManagement.uiPreference = 1;
                sendWhisper(who, 'UI will output to a handout.');
                break;
            default:
                sendWhisper(who, "Unexpected setting of '" + setting + "'. The expected values are 'chat' or 'handout'.");
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
        var parts = imgsrc.match(/(.*\/images\/.*)(thumb|max|med)(.*)$/);
        
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
    
    displayUi = function(who, text) {
        if(state.APIRoomManagement.uiPreference === 0) {
            sendWhisper(who, text);
        } else {
            var handout = findObjs({                              
                _type: 'handout',
                name: 'API-RoomManagement'
            }, {caseInsensitive: true});
        
            if(handout && handout.length > 0) {
                handout = handout[0];
            } else {
                handout = createObj('handout', {
                    name: 'API-RoomManagement',
                    avatar: 'https://s3.amazonaws.com/files.d20.io/images/7360175/t-Y2NgxamazYSIkbaXQjJg/thumb.jpg?1422294416'
                });
            }
            
            /*handout.get('notes', function(notes) {
                log(notes);
            });*/
            
            handout.set('notes', text);
        }
    },
    
    sendWhisper = function(to, message) {
        sendChat('Room API', '/w ' + to.split(' ')[0] + ' ' + message);  
    },
    
    handleUserInput = function(msg) {
        /*
        Because of the way that command links work in Roll20, the 'intuitive UI' layer
        presents links that when clicked on flow into this method (differentiated by
        intuitive UI commands by the fact that there are arguments in the message).
        The links work asynchronously, so there is no direct way to return a result 
        to the user through the intuitive UI layer (which would be architecturally
        appropriate). Therefore, responses will either be one-off messages to the user
        or refresh commands to the intuitive UI layer (when object state is changed and
        the selected objects are still relevant).
        */
        
        if(msg.type == 'api' && msg.content.match(/^!api-room/) && playerIsGM(msg.playerid)) {
            var chatCommand = msg.content.split(' ');
            if(chatCommand.length == 1) {
                //transfer control to intuitive UI layer:
                intuit(msg.selected, msg.who);
            } else {
                var followUpAction = new Array();
                
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
                            if(createManagedToken(msg, 'room')) {
                                followUpAction['message'] = 'Room successfully created.';
                            } else {
                                followUpAction['message'] = 'Room creation attempted, but there were problems.';
                            }
                        }
                        break;
                    case 'roomRemove':
                        if(validateSelections(msg, ['room'])) {
                            if(destroyManagedToken(msg)) {
                                followUpAction['message'] = 'Room successfully removed.';
                            } else {
                                followUpAction['message'] = 'Room remove attempted, but there were problems.';
                            }
                        }
                        break;
                    case 'roomSideAdd':
                        if(chatCommand.length != 4) {
                            help(msg.who, 'roomSideAdd');
                        } else {
                            if(validateSelections(msg, ['room'])) {
                                chatCommand = msg.content.replace('!api-room roomSideAdd ', '');
                                if(addRoomSide(chatCommand, msg)) {
                                    followUpAction['refresh'] = true;
                                } else {
                                    followUpAction['message'] = 'Adding the room side was unsuccessful.';
                                }
                            }
                        }
                        break;
                    case 'roomSideRemove':
                        if(chatCommand.length != 3) {
                            help(msg.who, 'roomSideRemove');
                        } else {
                            if(validateSelections(msg, ['room'])) {
                                chatCommand = msg.content.replace('!api-room roomSideRemove ', '');
                                if(removeRoomSide(chatCommand, msg)) {
                                    followUpAction['refresh'] = true;
                                } else {
                                    followUpAction['message'] = 'Removing the room side was unsuccessful.';
                                }
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
                                        if(setDoorUrl(msg, 'doorOpen')) {
                                            followUpAction['message'] = 'Open door image successfully set.';
                                        } else {
                                            followUpAction['message'] = 'Open door image setting was unsuccessful.';
                                        }
                                        break;
                                    case "closed":
                                        if(setDoorUrl(msg, 'doorClosed')) {
                                           followUpAction['message'] = 'Closed door image successfully set.';
                                        } else {
                                            followUpAction['message'] = 'Closed door image setting was unsuccessful.';
                                        }
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
                            if(createManagedToken(msg, 'adhocWall')) {
                                followUpAction['message'] = 'Adhoc wall successfully created.';
                            } else {
                                followUpAction['message'] = 'Adhoc wall creation attempted, but there were problems.';
                            }
                        }
                        break;
                    case 'adhocWallRemove':
                        if(validateSelections(msg, ['adhocWall'])) {
                            if(destroyManagedToken(msg)) {
                                followUpAction['message'] = 'Adhoc wall successfully removed.';
                            } else {
                                followUpAction['message'] = 'Adhoc wall remove attempted, but there were problems.';
                            }
                        }
                        break;
                    case 'adhocDoorAdd':
                        if(chatCommand.length == 3) {
                            //if there is a parameter, then this is the first door of an adhoc door set:
                            if(validateSelections(msg, ['empty'])) {
                                switch(chatCommand[2]) {
                                    case 'open':
                                        if(createManagedToken(msg, 'adhocDoorOpen')) {
                                            followUpAction['message'] = 'Adhoc door successfully created.';
                                        } else {
                                            followUpAction['message'] = 'Adhoc door creation attempted, but there were problems.';
                                        }
                                        break;
                                    case 'closed':
                                        if(createManagedToken(msg, 'adhocDoorClosed')) {
                                            followUpAction['message'] = 'Adhoc door successfully created.';
                                        } else {
                                            followUpAction['message'] = 'Adhoc door creation attempted, but there were problems.';
                                        }
                                        break;
                                    default:
                                        help(msg.who, 'adhocDoorAdd');
                                        break;
                                }
                            }
                        } else if(chatCommand.length == 2) {
                            //if there is no parameter, then this is appending a second door to an adhoc door set:
                            if(validateSelections(msg, ['empty', 'adhocDoor'])) {
                                if(createManagedToken(msg, 'adhocDoorCompanion')) {
                                    followUpAction['message'] = 'Adhoc door set successfully created.';
                                } else {
                                    followUpAction['message'] = 'Adhoc door set creation attempted, but there were problems.';
                                }
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
                                    //TODO: remove
                                    break;
                                case 'off':
                                    setAdhocDoorMoveMode('off');
                                    //TODO: remove
                                    break;
                                default:
                                    help(msg.who, 'adhocDoorMove');
                                    break;
                            }
                        } else if(chatCommand.length == 2) {
                            //implied toggling of move mode:
                            setAdhocDoorMoveMode('toggle');
                            //TODO: refresh refactor to show state
                        } else {
                            help(msg.who, 'adhocDoorMove');
                        }
                        break;
                    case 'adhocDoorRemove':
                        if(validateSelections(msg, ['adhocDoor'])) {
                            destroyManagedToken(msg);
                            //TODO: confirm
                        }
                        break;
                    case 'doorPrivsDefaultSet':
                        if(chatCommand.length != 3) {
                            help(msg.who, 'doorPrivsDefaultSet');
                            //TODO: refresh with state
                        } else {
                            setDoorPrivsDefault(msg.who, chatCommand[2]);
                        }
                        break;
                    case 'uiPreference':
                        if(chatCommand.length != 3) {
                            help(msg.who, 'uiPreference'); //TODO: implement this - done already?
                        } else {
                            setUiPreference(msg.who, chatCommand[2]);
                            //TODO: refresh with state
                        }
                        break;
                    case "toggleDoorLock":
                        if(validateSelections(msg, ['door'])) {
                            toggleDoorLock(msg);
                            //TODO: refresh (state already implemented)
                        }
                        break;
                    /*case "toggleDoorTrap":
                        //TODO:
                        sendWhisper(msg.who, "not implemented yet");
                        break;*/
                    default:
                        help(msg.who, '');
                        break;
                }
                
                if(followUpAction['message']) {
                    sendWhisper(msg.who, followUpAction['message']);
                }
                
                if(followUpAction['refresh']) {
                    intuit(msg.selected, msg.who);
                }
            }
        }
    },
    
    /* text command handling - end */
    
    
    /* interactive interface - begin */
    
    //character converter, credits to Aaron from https://github.com/shdwjk/Roll20API/blob/master/APIHeartBeat/APIHeartBeat.js
    ch = function(c) {
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
    },
    
    //help builder:
    displayHelp = function(who, header, body, nextSteps) {
        var rightPadding = '0px';
        
        if(state.APIRoomManagement.uiPreference === 1) {
            rightPadding = '14px';
        }
            
        var text =
            '<span style="border: 1px solid black;width: 100%;display:inline-block;background-color:'+mainBackgroundColor+';padding-right:'+rightPadding+';">'
                +'<span style="border: 1px solid black;display:inline-block;width: 100%;font-weight: bold;border-bottom: 1px solid black;background-color:'+headerBackgroundColor+';font-size: 115%;padding-right:'+rightPadding+';">'
                    +'<span style="padding-left:3px;display:inline-block;width: 100%;margin-top:3px;margin-bottom:3px;">'
                        +header
                    +'</span>'
                +'</span>'
                +'<span style="border: 1px solid black;display:inline-block;width: 100%;background-color:'+mainBackgroundColor+';padding-right:'+rightPadding+';">'
                    +body
                    
        if(nextSteps) {
            text = text
                +'<span style="padding-left:10px;display:inline-block;width: 100%;margin-top:3px;margin-bottom:3px;padding-right:'+rightPadding+';">'
                    +'<span style="border-top: 1px solid '+headerBackgroundColor+';display:inline-block;width: 100%;margin-top:10px;border-bottom: 1px solid '+headerBackgroundColor+';">'
                        +'<div style="margin-top:10px;"></div>'
                        +nextSteps
                    +'</span>'
                +'</span>';
        }
        
        text = text
                +'</span>'
            +'</span>';
        
        displayUi(who, text);
    },
    
    //constructs a clickable link to a help topic:
    helpLink = function(topic) {
        if(state.APIRoomManagement.uiPreference === 0) {
            return '[' + topic + '](!api-room help ' + topic + ') ';
        } else {
            return '<span style="border: 1px solid white;display:inline-block;background-color: ' + buttonBackgroundColor + ';padding: 5px 5px;"> <a href="!api-room help ' + topic + '">' + topic + '</a> </span> ';
        }
    },
    
    //constructs clickable links to help topics:
    helpLinks = function(header, topics) {
        var html = '<p><b>' + header + '</b><br/>';
        
        for(var i = 0;i<topics.length;i++) {
            html += helpLink(topics[i]);
        }
        
        return html + '</p>';
    },
    
    //constructs a clickable command:
    commandLink = function(text, command) {
        if(state.APIRoomManagement.uiPreference === 0) {
           return '[' + text + '](!api-room ' + command + ') ';
        } else {
            return '<span style="border: 1px solid white;display:inline-block;background-color: ' + buttonBackgroundColor + ';padding: 5px 5px;"> <a href="!api-room ' + command + '">' + text + '</a> </span> ';
        }
    },
    
    //constructs clickable commands:
    commandLinks = function(header, commands) {
        var html = '<p><b>' + header + '</b><br/>';
        
        for(var i = 0;i<commands.length;i++) {
            html += commandLink(commands[i][0], commands[i][1]);
        }
        
        return html + '</p>';
    },
    
    //general help:
    help = function(who, topic) {
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
                                +'<li><b>closed door</b> - which blocks LoS and has a closed door image</li>'
                                +'<li><b>open door</b> - which blocks LoS except where the door is and has an open door image</li>'
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
                        +'<p>This sets the default for who should be able to toggle doors. Setting it to '+ch("'")+'players'+ch("'")+' makes it that anybody can toggle doors. Setting it to '+ch("'")+'gm'+ch("'")+' makes it that only GMs can toggle them.</p>'
                        +'<p>This can be overridden on individual doors (such as a door that is locked) by double clicking the door and changing the '+ch("'")+'Controlled By'+ch("'")+' settings.</p>'
                        +commandLink('set it to gm','doorPrivsDefaultSet gm')
                        +commandLink('set it to players','doorPrivsDefaultSet players')
                    +'</div>'
                );
                break;
            case "ui preference":
                displayHelp(who, 'Room API - UI Preferences',
                    '<div style="padding-left:10px;margin-bottom:3px;">'
                        +'<p>Sets where user interface (UI) commands should be sent.</p>'
                        +'<p>If this is set to '+ch("'")+'handout'+ch("'")+', it will appear in a handout called '+ch("'")+'API-RoomManagement'+ch("'")+'.</p>'
                        +'<p>Actions in the handout are not functional if the handout is popped out.</p>'
                        +commandLink('set it to chat','uiPreference chat')
                        +commandLink('set it to handout','uiPreference handout')
                    +'</div>'
                );
                break;
            case "adhoc":
            case "adhocs":
            case "adhoc walls and doors":
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
                    
                    helpLinks('Sub-topics',['rooms','adhoc walls and doors','ui preference'])
                );
                break;
        }
    },
    
    //intuitive command interface for handling an empty image:
    intuitEmptyImage = function(selected, who) {
        displayHelp(who, 'Empty Image Actions',
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
                +commandLinks('Help',[['help','help']])
            +'</div>'
        );
    },
    
    //helper function for intuitive commands for a room's side:
    intuitRoomSide = function(sides, sideOfRoom) {
        var sideText;
        sides.forEach(function(side) {
            if(side.getProperty('sideOfRoom') === sideOfRoom) {
                sideText = [['remove','roomSideRemove ' + sideOfRoom]];
            }
        });
        
        if(sideText) {
            return sideText;
        }
        
        return [
                ['add wall','roomSideAdd ' + sideOfRoom + ' wall'],
                ['add open door','roomSideAdd ' + sideOfRoom + ' doorOpen'],
                ['add closed door','roomSideAdd ' + sideOfRoom + ' doorClosed'],
                ['add empty side','roomSideAdd ' + sideOfRoom + ' empty']
            ];
    },
    
    //intuitive command interface for handling a room:
    intuitRoom = function(selected, who, room) {
        room.load();
        var sides = room.getProperty('sides');
        
        var body = 
            '<div style="padding-left:10px;margin-bottom:3px;">'
                +commandLinks('Room',[['remove','roomRemove']])
                +commandLinks('Left Side',intuitRoomSide(sides, 'l'))
                +commandLinks('Top Side',intuitRoomSide(sides, 't'))
                +commandLinks('Right Side',intuitRoomSide(sides, 'r'))
                +commandLinks('Bottom Side',intuitRoomSide(sides, 'b'))
                +commandLinks('Help',[['help','help']])
            +'</div>';
        
        displayHelp(who, 'Room Actions', body);
    },
    
    //helper function for intuiting features of an adhoc or room door:
    intuitDoorFeatures = function(door) {
        return [
                [(door.getProperty('locked') ? 'unlock' : 'lock'),'toggleDoorLock'],
                //['trap','toggleDoorTrap']
            ];
    },
    
    //intuitive command interface for handling a room door:
    intuitRoomDoor = function(selected, who, door) {
        door.load();
        
        var body = 
            '<div style="padding-left:10px;margin-bottom:3px;">'
                +commandLinks('Features',intuitDoorFeatures(door))
                +commandLinks('Help',[['help','help']])
            +'</div>';
        
        displayHelp(who, 'Adhoc Door Actions', body);
    },
    
    //intuitive command interface for handling an adhoc door:
    intuitAdhocDoor = function(selected, who, door) {
        door.load();
        
        var body = 
            '<div style="padding-left:10px;margin-bottom:3px;">'
                +commandLinks('Adhoc Door',[['remove','adhocDoorRemove']])
                +commandLinks('Features',intuitDoorFeatures(door))
                +commandLinks('Move Mode (affects all adhoc doors)',[
                        ['on','adhocDoorMove on'],
                        ['off','adhocDoorMove off']
                    ])
                +commandLinks('Help',[['help','help']])
            +'</div>';
        
        displayHelp(who, 'Adhoc Door Actions', body);
    },
    
    //intuitive command interface for handling an adhoc wall:
    intuitAdhocWall = function(selected, who) {
        var body = 
            '<div style="padding-left:10px;margin-bottom:3px;">'
                +commandLinks('Adhoc Wall',[['remove','adhocWallRemove']])
                +commandLinks('Help',[['help','help']])
            +'</div>';
        
        displayHelp(who, 'Adhoc Wall Actions', body);
    },
    
    //intuitive command interface for handling an adhoc door and an empty image:
    intuitAdhocDoorAndEmpty = function(selected, who) {
        var body = 
            '<div style="padding-left:10px;margin-bottom:3px;">'
                +commandLinks('Adhoc Door',[['complete set','adhocDoorAdd']])
                +commandLinks('Help',[['help','help']])
            +'</div>';
        
        displayHelp(who, 'Adhoc Door Actions', body);
    },
    
    //intuitive command interface that presents wizard-like options based on context:
    intuit = function(selected, who) {
        if(!selected) {
            //nothing is selected, so nothing practical can be accomplished (except maybe settings, which is silly to intuit); assume that help documentation is the best course of action:
            help(who, '');
        } else if(selected.length == 1) {
            var token = getObj('graphic', selected[0]._id);
            if(!token) {
                //there is only intuitive functionality for graphics being selected:
                help(who, '');
            } else {
                var managedToken = getManagedToken(token);
                if(!managedToken) {
                    intuitEmptyImage(selected, who);
                } else if(managedToken.isType('room')) {
                    intuitRoom(selected, who, managedToken);
                } else if(managedToken.isType('roomDoor')) {
                    intuitRoomDoor(selected, who, managedToken);
                } else if(managedToken.isType('adhocDoor')) {
                    intuitAdhocDoor(selected, who, managedToken);
                } else if(managedToken.isType('adhocWall')) {
                    intuitAdhocWall(selected, who);
                } else {
                    sendWhisper(who, 'No actions are known for the selected image.');
                }
            }
        } else if(selected.length == 2) {
            var graphic1 = getObj('graphic', selected[0]._id);
            var graphic2 = getObj('graphic', selected[1]._id);
            
            if(!graphic1 || !graphic2) {
                sendWhisper(who, 'Only images should be selected.');
            } else {
                var managedToken1 = getManagedToken(graphic1);
                var managedToken2 = getManagedToken(graphic2);
                
                if(managedToken1 && managedToken2) {
                    sendWhisper(who, 'No actions are known for cases where neither selected image is empty.');
                } else if(!(managedToken1 || managedToken2)) {
                    sendWhisper(who, 'No actions are known for cases where two empty images are selected.');
                } else if(!((managedToken1 && managedToken1.isType('adhocDoor')) || (managedToken2 && managedToken2.isType('adhocDoor')))) {
                    sendWhisper(who, 'No actions are known for cases where one selected image is empty and the other is not an adhoc door.');
                } else {
                    intuitAdhocDoorAndEmpty(selected, who);
                }
            }
        } else {
            sendWhisper(who, 'Too many objects are selected.');
        }
    },
    
    /* interactive interface - end */
    
    
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
    
    if('undefined' !== typeof(APIVisualAlert) && APIVisualAlert.visualAlert && _.isFunction(APIVisualAlert.visualAlert)) {
        APIRoomManagement.checkInstall();
        APIRoomManagement.registerEventHandlers();
    } else {
        log('--------------------------------------------------------------');
        log('APIRoomManagement requires the VisualAlert script to work.');
        log('VisualAlert GIST: https://github.com/RandallDavis/roll20-visualAlertScript');
        log('--------------------------------------------------------------');
    }
});