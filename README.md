# roll20-roomScript
Script using Roll20's API to automatically control dynamic lighting around a room.

With this, you can import any image and declare it a "room". Rooms can be quickly customized to draw dynamic lighting around them, including doors that can be toggled. A closed door blocks line of sight - an open door lets line of sight through but not through the surrounding walls.

Some of this was inspired by other scripts (credited in the script itself), but I streamlined things for this particular use case.


<a href="http://www.youtube.com/watch?feature=player_embedded&v=PtkuI6PP6fo" target="_blank"><img src="http://img.youtube.com/vi/PtkuI6PP6fo/0.jpg" 
alt="Tutorial" width="100%" height="100%" border="10" /></a>


#Creating a room

Any image can be made into a room that is automatically managed.

To turn an image into a room, select an image, and type __!api-room roomAdd__. As soon as the image becomes a room, it is pushed to the Maps layer as a convenience and is from then on managed by the API. The room can be moved back to other layers without doing any harm, if that's more to your liking.

Rooms can be moved, rotated, and resized. The API will make sure that everything is drawn properly.

#Creating a side

A room has four sides: __t__(op), __b__(ottom), __l__(eft), and __r__(ight).

Each side can have one of four types: __wall__ (which blocks LoS), __doorClosed__ (which blocks LoS and has a closed door image), __doorOpen__ (which blocks LoS for the wall except where the door is and has an open door image), and __empty__ (which doesn't block LoS). If a side isn't specified, it defaults to empty.

To create a side, select the room and type __!api-room roomSideAdd \<side\> \<type\>__.

Doors are easy to toggle! Just move or rotate a door image, and it will go back where it belongs. If it's a doorOpen, it'll become a doorClosed, and vice-versa.

#Setting up room door images

In order to set the door images that will be created, put an image that you like on the page, select it, and type __!api-room roomDoorImageSet \<type\>__. The valid types are *open* and *closed*. From that point on, doors will be created like those images.

#Removing a side

To remove a side, select the room and type __!api-room roomRemoveSide \<side\>__.

If you want to change a side to a different type, remove the side and add a new one afterward.

#Removing a room

If you want to remove a room, select it and type __!api-room roomRemove__.

#Creating an adhoc wall

An adhoc wall is a stand-alone wall that's not attached to a room. Adhoc walls block LoS. To create an adhoc wall, select an image that will become the wall and type __!api-room adhocWallAdd__.

Adhoc walls and adhoc doors are used for complex situations where a wall shouldn't simply attach to a room's side, or a single centered door isn't enough. To use adhoc walls and adhoc doors on room sides, leave the room side empty, and place adhoc items where necessary.

#Creating an adhoc door

An adhoc door is a set of door images that can be placed anywhere, independent of a room. This allows you to use alternate door images than normally used with rooms, size doors as you see fit, and place them anywhere. They toggle the same as room doors do, and block LoS when the door is closed.

Adhoc doors are created in two stages. First, select one of the door images and type __!api-room adhocDoorAdd \<type\>__. Allowed types are *open* and *closed*. Second, select both of the door images and type __!api-room adhocDoorAdd__; this will pair the second door up with the first and finish everything.

Interacting with adhoc doors will toggle them from opened to closed, and vice versa.

Adhoc walls and adhoc doors are used for complex situations where a wall shouldn't simply attach to a room's side, or a single centered door isn't enough. To use adhoc walls and adhoc doors on room sides, leave the room side empty, and place adhoc items where necessary.

#Adhoc door move mode

Because interaction with an adhoc door toggles it, doors cannot be repositioned, stretched, or rotated without triggering a toggle. In order to disable this temporarily, type __!api-room adhocDoorMove__ or __!api-room adhocDoorMove \<on|off\>__. Using *on* or *off* sets the move mode; if nothing is specified, the move mode toggles.

#Removing an adhoc wall

In order to remove an adhoc wall, select the wall and type __!api-room adhocWallRemove__.

#Removing an adhoc door

In order to remove an adhoc door, select the door and type __!api-room adhocDoorRemove__.

#Extensive help system

There are several help topics and specific help descriptions for each command. __!api-room help__ gets you started.
