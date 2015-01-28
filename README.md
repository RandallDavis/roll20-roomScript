# roll20-roomScript
Script using Roll20's API to automatically control dynamic lighting around a room.

With this, you can import any image and declare it a "room". Rooms can be quickly customized to draw dynamic lighting around them, including doors that can be toggled. A closed door blocks line of sight - an open door lets line of sight through but not through the surrounding walls.

Some of this was inspired by other scripts (credited in the script itself), but I streamlined things for this particular use case.



#Creating a room

Any image can be made into a room that is automatically managed. Setting rooms up requires some simple meta-coding.

To turn an image into a room, write __\*room\*__ in the first line of the gmnotes. As soon as the image becomes a room, it is pushed to the Maps layer and is from then on managed by the API.

A room has four sides: __t__(op), __b__(ottom), __l__(eft), and __r__(ight).

Each side can have one of four types: wall (which blocks LoS), doorClosed (which blocks LoS and has a closed door image), doorOpen (which blocks LoS for the wall except where the door is and has an open door image), and empty (which doesn't block LoS). If a side isn't specified, it defaults to empty.

To create a side, add a line to the room's gmnotes like this: __\*\<side\>\*\<type\>\*__. Make sure that the information is on its own line and that there is an empty line at the bottom of the gmnotes. For example, gmnotes could look like this when first creating sides on a room:
```
*room*
*t*wall*
*b*empty*
*l*doorClosed*
*r*doorOpen*
 
```

Rooms can be moved, rotated, and resized. The API will make sure that everything is drawn properly.

#Feeding the room door images

When you create sides with doors, the API will complain in chat if it doesn't have door images. Each side that is a doorClosed or doorOpen will need images for both open and closed doors. To give the room the door images it needs, just drag an open door image and a closed door image (both need to be predefined pictures that it knows to look for) onto the page and change the room in any way. It will capture the door images and stop complaining.

To open or close a door, just move or rotate the door you want to toggle.

#Cleanup

As the room gets redrawn, it will have old dynamic lighting lines that it doesn't need any more. Roll20's API doesn't allow these lines to be deleted automatically, so they have to be trashed by hand. When lines are no longer needed, they are moved to the upper left of the GM layer. All of these can be selected at once (by dragging over them) and then deleted.

#Changing a side's type

If you have a type of side on a room already and want to change it to something else, you have to be careful to do this in a way that doesn't leave any mess behind (some of which you may not be able to see).

Select the room you want to change and type the following into chat: __!roomRemoveSide \<side\>__.

After the side is deleted, create the new version of the side as normal.

#Deleting a room

Before deleting a room, remove all of its sides (via __!roomRemoveSide \<side\>__) to get rid of all of its objects (including those you can't see). After that, you can just delete the room image.
