**Task 4.1.1: 2D translation in shader**

To apply a translation to the vector 2D vector, we simply need to add the mouse offset to the vertex position.
Then we call "draw_triangle_with_offset" with the mouse offset vector and set the color to blue.

**Task 4.1.2: 2D matrix transform**

To be able to be able to apply the transform matrice to the 2D vector we need to make it a 3D homogenous vector.
In order to do that we simply extend it with a zero for the Z-coordinate and 1 for homogenous component.
Then we can multiply it with transform matrice to obtain a the new homogenous vector.
We assumed here that gl_Position is scaled by it's homogenous component we used to display a 3D point.

We now need to create the translation and rotation matrix. Mat4 functions can be used in that purpose.
All that is left to do is to apply them in the right order. 
For the red triangle, we first want to rotate the triangle and then to translate it at it place.
For the green triangle, we first want to translate the triangle and then to rotate it.

**Task 4.2.1: MVP matrix**
To apply the mvp matrix, we just had to multiply our position vector by the mvp matrix.
To compute the mvp matrix, we just had to multiply the matrixes for the projection, the view and the model using the given method mat4_matmul_many.

**Task 4.2.2: View matrix**

To compute the view matrix, we first had to compute the look_at matrix. To create it, we placed on the first row the vector which corresponds to the camera postion which is on the x axis at a distance -r from the origin, then the view target which is the origin as second row and finally the up vector which must be perpendicular to the vector going from the camera to the origin watching up, thus along the z axis for the last row. To combine it with the rotations created by the mouse, we just had to multiply it with two rotations matrixes, one around y from cam_angle_y degree and one around z from cam_angle_z.

**Task 4.2.3: Model matrix**

Workload:

Zad: 1/3
Loïc: 1/3
Jonas: 1/3
