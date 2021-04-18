**TASK 6.1.0 Copy from Your Last Homework**

**TASK 6.1.1 and 6.1.2 Construct Transformation Matrix for Shadow Mapping**

We did a switch on the different cube faces to set the up and lookTo vector (as in fig. 2).
Then we get the light position in the camera coordinates. 
At first we didn't saw the the icg_math.js file so we did the computation component by component which took quite some time.
Then to get the point we want to look to we add the light position and the lookTo vector.
(Both are in camera coordinates.)
The function lookAt take "up" as a vector so we don't need to add the position to the up vector.
Finally we first multiply by scene_view to be ine the camera coordinates and then multiply by the lookAt matrix which is defined in camera coordinates.

**TASK 6.2.1: Light Depth Fragment Shader**

**TASK 6.2.2: Phong Lighting Shader with Shadows**

**TASK 6.2.3 Blend Options**

To implement the blending, we just decided to use the add functionnality in the equation (which is not really useful since it is set by default, but it looks clearer like this). Therefore, both colors will be added. We used a constant color with a factor of 1 so that both colors are fully taken into account.

Workload:

Zad: 1/3
Loïc: 1/3
Jonas: 1/3
