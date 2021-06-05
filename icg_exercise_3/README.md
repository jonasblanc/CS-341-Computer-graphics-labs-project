# ICG Exercise 3 - Raytracing Meshes
[Handout](https://htmlpreview.github.io/?https://github.com/jonasblanc/ComputerGraphicProject/blob/master/icg_exercise_3/exercise3.html)

In this exercise we add support for traingle face meshes. We took three steps in that direction. First find if and where the camera rays intersect the triangle faces. Then compute the surface normal at each intersection point. Finally instead of computing ray-triangle intersection for all triangles in the mesh, we test if the ray intersect certain regions of the scene by creating bounding box around the meshes.

For the normal computation we implemented two startegies. The first one, named flat shading, is to use the face normal for each intersection point in the face. The second, named phong shading, we interpolate the normal based on the normals of the face's vertices.

[Here](./report/README.md) is a summary of the executed tasks in this lab.

Below is a comparaison between flat shading and phong shading:  
![result](./report/mesh_shading1_flat.png)
![result](./report/mesh_shading1_phong.png)

Here we make the bounding box visible by inverting the color inside it:  
![result](./report/desk3_bb_off.png)
![result](./report/desk3_bb_on.png)

