** Task 2.1: 1D noise **

** Task 3.1: FBM 1D **

** Task 4.1 **

** Task 4.2 **

** Task 4.3 **

** Task 5.1 **

For the World Map, we set the color to the water one if the height is below the water level.
Otherwise we interpolated the color between the grass color and the mountain color.

** Task 6.1 **

We copied the update_cam_transform from assignement 5 in main_terrain and the phong shading pipeline in terrain.frag with no problem.
Then we set the color to the water one if the height is below the water level.
Otherwise we interpolated the color between the grass color and the mountain color.
We also set the shininess in consequence.

Finally we implemented terrain_build_mesh in terrain.js.
First we mapped X and Y between -0.5 and 0.5.
Then we clamped the height to the water level and set the normal accordingly.
We pushed the resulting vertex in the array.

For every point we then computed the two faces created by the neighbouring vertices and added them in faces.


Zad: 1/3
Loïc: 1/3
Jonas: 1/3