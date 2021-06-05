# Lab 1 summary

## Task 1.1: Implement Ray-Plane intersections

For this task, we first computed the dot product between the ray_direction and the plane_normal vector and check if the result is 0 (+- float_error). If it is the case, it means that they are perpendicular and thus, that the ray is parralel to the plan and thus, there is no solution.

Otherwise, we compute 't' by using the equation 'dot(normal, ax) = 0' where 'x' is any point on the plane and 'a' a given point from the plane (here we used the plane center), replacing 'x' by the ray equation 'O+dt' and then solving for 't'.

Then, we check that 't' is not too big (bigger than the threshold) or negative which means that the intersection is behind the viewer.

Finally, we have to return the right direction of the normal (the one pointing towards the viewer). For that, we compute the dot product between the direction of the ray and the normal. If the result is positive, it means that they point in the same direction, so we have to take the opposite of the normal such that it points towards the viewer and if the result is negative, we can just take the normal. Also, since we don't know if the normal passed as argument is already normalised or not, we normalize it before returning it.

## Task 1.2.1: Derive the expression for a Ray-Cylinder intersection

Please see TheoryExercise.pdf for the derivation. To get the idea of where to start was the more difficult part.

## Task 1.2.2: Implement Ray-Cylinder intersections

We implemented the result of our derivation with only one difficulty:
We had one bug that took us some long debugging sessions to find: we disregarded the first intersection if the second was closer, before checking that the second was actually in the finite cylinder.
