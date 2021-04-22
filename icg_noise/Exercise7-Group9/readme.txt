** Task 2.1: 1D noise **
We compute the different values as shown in the handout. For the gradients, since we're in 1d we use gradients(hash_func(vec2(c_0,0.))).x. 
The hash_func takes a vec2, so we augment the c_0 and c_1 into vec2's with 0 as the second value. 
And we only take the first value of the gradient that we get (gradients.x).

** Task 3.1: FBM 1D **
To compute the 1D fbm, we need to iterate over the number of octaves and compute the sum. Instead of computing the power of the freq_multiplier and the ampl_multiplier at each iteration using the pow() function, which is computationally expensive, we created 2 variables freqi and ampi to reduce computations by multiplying these variables by freq_multiplier and ampl_multiplier respecttively at each iteration.

** Task 4.1 **

To implement the 2D Perlin noise, we first computed the 4 corners around the point. Then we took the right gradient at each of these corners using the hash function. We then computed the vector from the corners to the point and computed the dot product with the corresponding gradient to obtain the contribution s,t,u and v. Then we computed the weight in the interpolation using the function blending _weight with the difference between our point and the corner along axis x and y respectively. Finally, we used this values and the mix function to compute st and uv and then the end result.

** Task 4.2 **

2D fBm works just like 1D FBM except that we multiplied each component by the frequency of the corresponding octave.

** Task 4.3 **

Turbulence is implemented the same ways as the 2D FBM except that we use the absolute value of the noise.

** Task 5.1 **

For the World Map, we set the color of the water to one if the height is below the water level.
Otherwise we interpolated the color between the grass color and the mountain color.

For the wood, we compute alpha as mentionned in the read me and we use the turbulence function that we coded in the previous step. 
We then mix the light brown and dark brown colors using alpha.

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
