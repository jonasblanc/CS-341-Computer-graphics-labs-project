# Lab 3 summary

## Task 3.1.1: Compute triangle normals and opening angles

We used vec3 substract and angle methods to first compute the vectors between the vertices and then the corresponding angles. 
The normal was obtained by a cross product of two of those vectors.

## Task 3.1.2: Compute vertex normals

We added the contribution of each face to each vertex (of to the corresponding triangle) weighted by the opening angle.
Our very first version had the right "idea" but didn't provide the correct results due to broken arithmetics with js and vec3.
We spent hours trying to understand where the bug was coming from, reading our code again and again.
We tried doing the same computations in as many different ways as we could come up with, all to no avail. 
Finally, we found out that the operator += wasn't doing what we supposed it would do. 
Therefore we were able to fix our implementation and get the correct results.

## Task 3.2.1: Implement ray-triangle intersection

To implement the ray-triangle intersection, we had to solve the equation 'o+td = alpha*A+beta*B+gamma*C' with the constraints 'alpha+beta+gamma = 1' and 'alpha,beta,gamma>=0'coming from the barycentric coordinates. 
As suggested in the question, we decided to solve it using Cramer's rule. 
Therefore, we first had to transform the equation above in the form 'Ax = b' where x is the vector with the 3 unknowns (i.e. alpha, beta and t). 
To be able to use Cramer's rule, we also needed a method to compute the determinant of a matrix, which we implemented by using the mixed product between the 3 columns of the matrix. 
Then to implement Cramer's rule, we first computed the determinant of A. 
If it was equal (close since we use floats) to 0, it doesn't have a unique solution, so we return and otherwise we compute alpha, gamma and t by replacing the corresponding column of A with b, computing the determinant of this new matrix and dividing by the determinant of A.

After having solved the equation, we check that t is bigger or equal to 0, so that the intersection happens in front of the viewer.
We then compute gamma using the first constraint from above and check that the 3 values are bigger or equal to 0 (second constraint). 
If everything holds, we have an intersection, otherwise not.

## Task 3.2.2: Implement flat and Phong shading strategies

To implement flat and Phong shading, we just had to first check which mode was used (#if defined). 
Then we computed the normal either by taking the cross product between two side of the triangle (which will give the vector perpendicular to both sides, i.e. the normal) and normalizing it in case of flat shading, or by adding the 3 vertex normals using alpha, beta and gamma as weights in case of Phong shading.

## Task 3.3: Implement Bounding Box intersection""

Basically we want to check the equation p_m <= x <= p_M component wise, where p_m and p_M are the respective min and max corner of the AABB, and x is a point in space.
In our case x = o + td, where o is the ray_origin  and d the ray_direction.
The above equation becomes (p_m - o)/d <= t <= (p_M - o)/d, which we are still computing component wise.
The first if-else statement is there to treat the case of a division by zero when one of the components of the ray_direction is 0.
Then, we make sure t_min <= t_max (component wise), otherwise we swap them.
At this point, we have three different intervals for t, (one for each component). 
We make sure that the intersection of these 3 intervals is not empty.
In other words, that the range of the ray parameter (`t`) values which are included in the bounding box is not empty.


The level of reflexion is set to 2 for every screenshot we took.

## Workload:

Zad: 1/3
Loïc: 1/3
Jonas: 1/3
