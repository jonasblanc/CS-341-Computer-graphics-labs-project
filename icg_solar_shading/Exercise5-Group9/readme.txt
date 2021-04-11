**Task 5.1.0: Copy from Previous Homework**

**Task 5.1.1: Compute Billboard’s “model-to-world” matrix**

**Task 5.1.2: Billboard Shader**

**Task 5.1.3: Blending the Color of Billboard and Background**

**Task 5.2: Implement Phong Lighting**

**Task 5.3.1/2: Specularity & Colors**

We start by extracting the color from the texture for these 3 textures:
texture_surface_day
texture_clouds
texture_surface_night

we compute the corresponding color for day, night and cloud situation and mix them together accordingly to get the correct final color.

For the day, we applied the phong lighting model like we did in the phong fragment. The main difference is that the ambient and diffuse component of the material are sampled from the day texture and that the specular component is pure white. Another important difference is that we only add the specular component if texture_gloss is equal to one (we check the condition > 0.5 in the code, this is equivalent since texture_gloss is a binary mask). To add the specular component, we mix the color with the specular color weighted by the specularity value computed from the cloud texture.

For the cloud, same as for the day but there is no specular component.
We then proceed to mix, the day color and cloud color with the weight taken from texture cloud.

For the night, we only need to mix the color extracted from texture_surface_night and pure black with the weight take  from texture cloud.

Finally, in order to get the final color, we mix the day color (which is already a mix of initial day color and cloud color) and the night color. We use the diffuse component coefficient  from the Phong lighting model to determine the amount of daylight. We rely on a mapping (f(nl) = (nl+1)/2) to change the domaine of nl from [-1,1] to [1,1].

**Task 5.4: Custom mesh**

We downloaded a .obj model of a Formula 1 car from the web, resized it and rotated it accordingly, exported it to the correct format and used it in the project.

Workload:

Zad: 1/3
Loïc: 1/3
Jonas: 1/3
