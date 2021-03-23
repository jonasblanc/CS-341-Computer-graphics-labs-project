**Task 3.1.1: Compute triangle normals and opening angles**

We used vec3 substract and angle methode to first compute the vectors between the vertices and then the corresponding angles. 
The normal was obtained by a cross product of two of those vectors.

**Task 3.1.2: Compute vertex normals**

We added the contribution of each faces to each vertex linked to that triangles weighted by the openning angle.
Our very first version had the right "idea" but because of broken arithmetic with js and vec3 we had weird results.
We spent hours trying to understand where the bug was coming from, reading our code again and again.
We did as much version of the same computation as we could imagine, until this one which apparently is finally fully correctly undertsood. 

**Task 3.2.1: Implement ray-triangle intersection**



**Task 3.2.2: Implement flat and Phong shading strategies**

**Task 3.3: Implement Bounding Box intersection""


The level of reflexion is set to 2 for every screenshot we took.

Workload:

Zad: 1/3
Loïc: 1/3
Jonas: 1/3