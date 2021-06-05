# Computer graphics labs and project

This repo regroups all the lab and the final project developed for the EPFL course CS-341 Computer graphics.

Any of the labs / project can be accessed by running a local server with the following line. 

```
$ python3 -m http.server
```

It should be executed in the folder containing the lab / project. Then you should be able to view it by open your [localhost](http://localhost:8000/index.html) in your favorite browser

## Labs

* [Lab 0 - “Hello World”](./icg_exercise_0): we set up the working environment. If the above instructions are not clear enough, you should find all the required explanation in this lab.
* [Lab 1 - Planes and Cylinders](./icg_exercise_1): we compute ray intersection with various 3D shapes (plan, cylinder).
* [Lab 2 - Lighting](./icg_exercise_2): we implement the lighting in the scene in three steps: phong lightiing, shadows and reflections.
* [Lab 3 - Raytracing Meshes](./icg_exercise_3): we add support for triangle based meshes. We look at flat vs phong shading and make the computation more efficient using bounding box.
* [Lab 4 - Geometric transforms in the GPU pipeline](./icg_exercise_4): we change the pipeline from ray tracing to rasterization to take advantage of the GPU. We render of the solar system with this new pipeline.
* [Lab 5 – Texturing and Lighting](./icg_exercise_5): we improve to look of the solar system by implement the phong lighting model and adding textures.

