** Task 2.1: 1D noise **
We compute the different valeus as shown in the handout. For the gradients, since we're in 1d we use gradients(hash_func(vec2(c_0,0.))).x. The hash_func takes a vec2, so we augment the c_0 and c_1 into vec2's with 0 as the second value.  And we only take the first value of the gradient that we get (gradients.x)

** Task 3.1: FBM 1D **

** Task 4.1 **

** Task 4.2 **

** Task 4.3 **

** Task 5.1 **

For the World Map, we set the color to the water one if the height is below the water level.
Otherwise we interpolated the color between the grass color and the mountain color.

For the wood, we compute alpha as mentionned in the read me and we use the turbulence function that we coded in the previous step. We then mix the light brown and dark brown colors using alpha.

For the marble, we compute q and alpha as mentionned in the handout using the perlin_fbm function. We then mix the with and dark brown colors using alpha. 
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
