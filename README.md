# roll20-roomScript
Script using Roll20's API to automatically control dynamic lighting around a room.

With this, you can import any image and declare it a "room". Rooms can be quickly customized to draw dynamic lighting around them, including doors that can be toggled. A closed door blocks line of sight - an open door lets line of sight through but not through the surrounding walls.

Some of this was inspired by other scripts (credited in the script itself), but I streamlined things for this particular use case.


<a href="http://www.youtube.com/watch?feature=player_embedded&v=0YGJpxeqp7s" target="_blank"><img src="http://img.youtube.com/vi/0YGJpxeqp7s/0.jpg" 
alt="Tutorial" width="240" height="180" border="10" /></a>


#Creating a room

Any image can be made into a room that is automatically managed.

To turn an image into a room, select an image, and type __!roomAdd__. As soon as the image becomes a room, it is pushed to the Maps layer as a convenience and is from then on managed by the API. The room can be moved back to other layers without doing any harm, if that's more to your liking.

Rooms can be moved, rotated, and resized. The API will make sure that everything is drawn properly.

#Creating a side

A room has four sides: __t__(op), __b__(ottom), __l__(eft), and __r__(ight).

Each side can have one of four types: __wall__ (which blocks LoS), __doorClosed__ (which blocks LoS and has a closed door image), __doorOpen__ (which blocks LoS for the wall except where the door is and has an open door image), and __empty__ (which doesn't block LoS). If a side isn't specified, it defaults to empty.

To create a side, select the room and type __!roomSideAdd \<side\> \<type\>__.

Doors are easy to toggle! Just move or rotate a door image, and it will go back where it belongs. If it's a doorOpen, it'll become a doorClosed, and vice-versa.

#Feeding the room door images

When you create sides with doors, the API will complain in chat if it doesn't have door images. Each side that is a doorClosed or doorOpen will need images for both open and closed doors. To give the room the door images it needs, just drag an open door image and a closed door image (both need to be predefined pictures that it knows to look for) onto the page and change the room in any way. It will capture the door images and stop complaining.

#Cleanup

As the room gets redrawn, it will have old dynamic lighting lines that it doesn't need any more. Roll20's API doesn't allow these lines to be deleted automatically, so they have to be trashed by hand. When lines are no longer needed, they are moved to the upper left of the GM layer. All of these can be selected at once (by dragging over them) and then deleted.

#Removing a side

To remove a side, select the room and type __!roomRemoveSide \<side\>__.

If you want to change a side to a different type, remove the side and add a new one afterward.

#Deleting a room

If you want to delete a room, select it and type __!roomRemove__.
