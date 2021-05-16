import {
  vec2,
  vec3,
  vec4,
  mat2,
  mat3,
  mat4,
} from "../lib/gl-matrix_3.3.0/esm/index.js";
import { mat4_matmul_many } from "./icg_math.js";

import { terrain_build_mesh } from "./marching_cube.js";

var last_offset = [0, 0, 0];
var last_terrains = [];

export function generate_terrains(regl, resources, position) {
  const offset_x = Math.round(position[0]);
  const offset_y = Math.round(position[1]);
  const offset_z = Math.round(position[2]);

  if (
    last_offset[0] == offset_x &&
    last_offset[1] == offset_y &&
    last_offset[2] == offset_z &&
    last_terrains.length != 0
  ) {
    return last_terrains;
  } else {
    last_offset = [offset_x, offset_y, offset_z];

    const chunk_offset = [
      [-1, -1, 0],
      [-1, 0, 0],
      [-1, 1, 0],
      [0, -1, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, -1, 0],
      [1, 0, 0],
      [1, 1, 0],
    ];

    const terrains = [];

    for (let i = 0; i < chunk_offset.length; ++i) {
      const mesh = terrain_build_mesh(
        [
          offset_x + chunk_offset[i][0],
          offset_y + chunk_offset[i][1],
          offset_z + chunk_offset[i][2],
        ],
        0
      );

      terrains.push(create_terrain_actor(regl, resources, mesh));
    }
    last_terrains = terrains;
    return terrains;
  }
}

function create_terrain_actor(regl, resources, mesh) {
  const pipeline_draw_terrain = regl({
    attributes: {
      position: mesh.vertex_positions,
      normal: mesh.vertex_positions,
    },
    uniforms: {
      mat_mvp: regl.prop("mat_mvp"),
      mat_model_view: regl.prop("mat_model_view"),
      mat_normals: regl.prop("mat_normals"),

      light_position: regl.prop("light_position"),
    },
    elements: mesh.faces,

    vert: resources["shaders/terrain.vert.glsl"],
    frag: resources["shaders/terrain.frag.glsl"],
  });

  class TerrainActor {
    constructor() {
      this.mat_mvp = mat4.create();
      this.mat_model_view = mat4.create();
      this.mat_normals = mat3.create();
      this.mat_model_to_world = mat4.create();
    }

    draw({ mat_projection, mat_view, light_position_cam }) {
      mat4_matmul_many(this.mat_model_view, mat_view, this.mat_model_to_world);
      mat4_matmul_many(this.mat_mvp, mat_projection, this.mat_model_view);

      mat3.fromMat4(this.mat_normals, this.mat_model_view);
      mat3.transpose(this.mat_normals, this.mat_normals);
      mat3.invert(this.mat_normals, this.mat_normals);

      pipeline_draw_terrain({
        mat_mvp: this.mat_mvp,
        mat_model_view: this.mat_model_view,
        mat_normals: this.mat_normals,

        light_position: light_position_cam,
      });
    }
  }
  return new TerrainActor();
}
