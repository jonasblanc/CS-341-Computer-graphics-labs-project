# Lab 6 summary

## TASK 6.1.0 Copy from Your Last Homework

For this part, we copied our code from last week and adapted it a bit. 
We translated our view center by cam_target and computed the light and view vectors.

## TASK 6.1.1 and 6.1.2 Construct Transformation Matrix for Shadow Mapping

To construct the cube_camera_projection matrix, we used the method perspective. 
For the arguments, we gave pi/2 for the fovy since we are in the middle of a cube and the fovy represent half of the total angle. 
For the ratio, we used 1 since a cube has the same height and width. 
Finally, we used 0.1 and 100 as values for near and far, which serve as boundaries for the distance at which we compute the shadow ray intersections.

For the cube_camera_view, we first did a switch on the different cube faces to set the up and lookTo vector (as in fig. 2).
Then we get the light position in the camera coordinates. 
At first we didn't see the the icg_math.js file so we did the computation component by component which took quite some time.
Then to get the point we want to look to we add the light position and the lookTo vector (Both are in camera coordinates).
The function lookAt takes "up" as a vector so we don't need to add the position to the up vector.
Finally we first multiply by scene_view to be in the camera coordinates and then multiply by the lookAt matrix which is defined in camera coordinates.

## TASK 6.2.1: Light Depth Fragment Shader

To compute the Euclidean Distance, we use the length function. 

## TASK 6.2.2: Phong Lighting Shader with Shadows

We divided light_color by the squarre of the distance before using it in the specular and diffuse calculation.
We added a global "if" in order to disregard vertices that are not the closest ones to the light source.

## TASK 6.2.3 Blend Options

To implement the blending, we decided to use the add functionnality in the equation (which is not really useful since it is set by default, but it looks clearer like this). Therefore, both colors will be added. We used a constant color with a factor of 1 so that both colors are fully taken into account.