# Lab 5 summary

## Task 5.1.0: Copy from Previous Homework

Since we are expert in "copy and paste" this part was trivial for us.

## Task 5.1.1: Compute Billboard’s “model-to-world” matrix

In this part we want to scale and rotate the billboard normal toward the camera.
Since the normal is initially along the z-axis we compute: 
- the angle between the Z-axis and vector toward the camera
- the axis of the rotation
Then we create a rotation matrix with the angle and the axis.
Finally we multiple a identity matrix by the rotation and then the scaling matrix.

No problem on that part.

## Task 5.1.2: Billboard Shader

In this part we need to decrease the opacity of the billboard exponentially outside the sun.
We use a negative exponential in that regard. 
We added the size of the sun to be able to decrease the intensity from the border of the sun and not from its center.
We had to hardcode it since there no way of obtaining it.
We added a factor to be able to modify the speed of the decreasing opacity.

## Task 5.1.3: Blending the Color of Billboard and Background

We enabled the blending.
We set the color and alpha of the destination and source.
Finnally we choosed the "add" equations for both RGB and alpha.

## Task 5.2: Implement Phong Lighting

In planet.js, we simply computed mat_mvp and mat_model_view using matrix multiplication between the different matrices (projection, view, model) like last week.

In phong.vert.glsl, we simply computed the different useful vectors. 
First, we compute the direction (camera to vertex in view coordinates) by multiplying the position by the model_view matrix. 
Since the camera is at origin, we don’t need to substract it and thus directly have the right vector. 
We then compute the direction to light by taking the light position minus the vector we computed before. 
We finally compute the normal in camera coordinates using the mat_normals matrix and the position by multiplying it the mvp matrix to have it in the right coordinates.

In phong.frag.glsl, we use the vectors computed before to implement the phong lightning model. 
We first extract M_[a,d,s] from the texture. We then compute l, r and v as we did in the previous week and take care to normalize them. 
Then, we compute the ambiant term. If nl is bigger than 0 (light in front of the object), we add the diffuse term and if rv is bigger than 0, we also add the specular term to the color.

## Task 5.3.1/2: Specularity & Colors

We start by extracting the color from the texture for these 3 textures:
texture_surface_day
texture_clouds
texture_surface_night

we compute the corresponding color for day, night and cloud situation and mix them together accordingly to get the correct final color.

For the day, we applied the phong lighting model like we did in the phong fragment. 
The main difference is that the ambient and diffuse component of the material are sampled from the day texture and that the specular component is pure white. 
Another important difference is that we only add the specular component if texture_gloss is equal to one (we check the condition > 0.5 in the code, this is equivalent since texture_gloss is a binary mask).
To add the specular component, we mix the color with the specular color weighted by the specularity value computed from the cloud texture.

For the cloud, same as for the day but there is no specular component.
We then proceed to mix, the day color and cloud color with the weight taken from texture cloud.

For the night, we only need to mix the color extracted from texture_surface_night and pure black with the weight take  from texture cloud.

Finally, in order to get the final color, we mix the day color (which is already a mix of initial day color and cloud color) and the night color. 
We use the diffuse component coefficient  from the Phong lighting model to determine the amount of daylight. We rely on a mapping (f(nl) = (nl+1)/2) to change the domaine of nl from [-1,1] to [0,1].

## Task 5.4: Custom mesh

We created a (beautiful) sculpture from scratch, exported it to the correct format and used it in the project.
