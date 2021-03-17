**Task 2.1: Implement Phong Lighting**

We first normalized all the recieved vectors that needed to be normalized. Then we computed l (vector intersection point to light source).
To check that the light is located in the correct side of the object we computed the dot product between the surface normal and the light which would be positive if they are on the same side. (The surface normal is the one pointing toward the camera.)
We computed the diffuse component. (Nearly forgot to use mat.color).

For the specular term we still want the light to be located in the right side of the surface. So we implemented this part in the same "if" as the previous one.
Then we computed r. (We had an hard time figuring out that we should use "-l" instead of "l" in the reflect function.)
We used the dot product between r and the direction_to_camera to determine if the reflected light shines toward the camera.

We finaly return the sum of the diffuse and the specular term.

The "#if NUM_LIGHTS != 0" around the for-loop was no trivial.

We had the rewrite the main a couple time since we didn't took a screenshot before implementing the shadows and reflexions.

**Task 2.2: Implement shadows**

We test if there is an object between the light and the intersection point, if there is we cancel the diffuse and specular contribution.
We slightly move the intersection point along the normal of the surface to avoid acnee shadowing.

We had only one difficulty concerning the shadow to be able to display corner scene correctly. 
We finally added the same factor as for the shadow acnee when checking if the intersection with a potential object was in front of the light or not.

**Task 2.3.1: Derive iterative formula**

See TheoryExercise.pdf for full derivation.

**Task 2.3.2: Implement reflections**




Mirror1 = level 1 reflection
Mirror2 = level 3 reflection

Workload:

Zad: 1/3
Loïc: 1/3
Jonas: 1/3