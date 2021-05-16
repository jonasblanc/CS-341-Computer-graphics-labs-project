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
    const chunk_offset = [
      // Front row
      [-1, -1, 0], // 0
      [-1, 0, 0], // 1
      [-1, 1, 0], // 2
      // Center row
      [0, -1, 0], // 3
      [0, 0, 0], // 4
      [0, 1, 0], // 5
      // Back row
      [1, -1, 0], // 6
      [1, 0, 0], // 7
      [1, 1, 0], // 8
    ];
    var terrains = [];
    if (last_terrains.length != 0 || last_offset[2] != offset_z) {
      terrains = generate_all_chunks(regl, resources, chunk_offset, [
        offset_x,
        offset_y,
        offset_z,
      ]);
    } else {
      update_chunks(chunk_offset, offset_x, offset_y, offset_z);
    }

    for (let i = 0; i < chunk_offset.length; ++i) {
      const mesh = terrain_build_mesh([
        offset_x + chunk_offset[i][0],
        offset_y + chunk_offset[i][1],
        offset_z + chunk_offset[i][2],
      ]);

      terrains.push(create_terrain_actor(regl, resources, mesh));
    }
    last_offset = [offset_x, offset_y, offset_z];
    last_terrains = terrains;
    return terrains;
  }
}

function generate_all_chunks(regl, resources, chunk_offset, offset_xyz) {
  const terrains = [];

  for (let i = 0; i < chunk_offset.length; ++i) {
    const mesh = terrain_build_mesh([
      offset_xyz[0] + chunk_offset[i][0],
      offset_xyz[1] + chunk_offset[i][1],
      offset_xyz[2] + chunk_offset[i][2],
    ]);

    terrains.push(create_terrain_actor(regl, resources, mesh));
  }
  return terrains;
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

function update_chunks(chunk_offset, offset_x, offset_y, offset_z) {
  const terrains = [];
  // Back and front
  if (last_offset[0] < offset_x) {
    terrains[0] = last_terrains[3];
    terrains[1] = last_terrains[4];
    terrains[2] = last_terrains[5];
    terrains[3] = last_terrains[6];
    terrains[4] = last_terrains[7];
    terrains[5] = last_terrains[8];
    terrains[6] = terrain_build_mesh([
      offset_x + chunk_offset[6][0],
      offset_y + chunk_offset[6][1],
      offset_z + chunk_offset[6][2],
    ]);
    terrains[7] = terrain_build_mesh([
      offset_x + chunk_offset[7][0],
      offset_y + chunk_offset[7][1],
      offset_z + chunk_offset[7][2],
    ]);
    terrains[8] = terrain_build_mesh([
      offset_x + chunk_offset[8][0],
      offset_y + chunk_offset[8][1],
      offset_z + chunk_offset[8][2],
    ]);
  } else if (last_offset[0] > offset_x) {
    terrains[0] = terrain_build_mesh([
      offset_x + chunk_offset[0][0],
      offset_y + chunk_offset[0][1],
      offset_z + chunk_offset[0][2],
    ]);
    terrains[1] = terrain_build_mesh([
      offset_x + chunk_offset[1][0],
      offset_y + chunk_offset[1][1],
      offset_z + chunk_offset[1][2],
    ]);
    terrains[2] = terrain_build_mesh([
      offset_x + chunk_offset[2][0],
      offset_y + chunk_offset[2][1],
      offset_z + chunk_offset[2][2],
    ]);
    terrains[3] = last_terrains[0];
    terrains[4] = last_terrains[1];
    terrains[5] = last_terrains[2];
    terrains[6] = last_terrains[3];
    terrains[7] = last_terrains[4];
    terrains[8] = last_terrains[5];
  }

  // Right and left
  if (last_offset[1] < offset_y) {
    terrains[0] = last_terrains[1];
    terrains[1] = last_terrains[2];
    terrains[2] = terrain_build_mesh([
      offset_x + chunk_offset[2][0],
      offset_y + chunk_offset[2][1],
      offset_z + chunk_offset[2][2],
    ]);
    terrains[3] = last_terrains[4];
    terrains[4] = last_terrains[5];
    terrains[5] = terrain_build_mesh([
      offset_x + chunk_offset[5][0],
      offset_y + chunk_offset[5][1],
      offset_z + chunk_offset[5][2],
    ]);
    terrains[6] = last_terrains[7];
    terrains[7] = last_terrains[8];
    terrains[8] = terrain_build_mesh([
      offset_x + chunk_offset[8][0],
      offset_y + chunk_offset[8][1],
      offset_z + chunk_offset[8][2],
    ]);
  } else if (last_offset[1] > offset_y) {
    terrains[0] = terrain_build_mesh([
      offset_x + chunk_offset[0][0],
      offset_y + chunk_offset[0][1],
      offset_z + chunk_offset[0][2],
    ]);
    terrains[1] = last_terrains[0];
    terrains[2] = last_terrains[1];
    terrains[3] = terrain_build_mesh([
      offset_x + chunk_offset[3][0],
      offset_y + chunk_offset[3][1],
      offset_z + chunk_offset[3][2],
    ]);
    terrains[4] = last_terrains[3];
    terrains[5] = last_terrains[4];
    terrains[6] = terrain_build_mesh([
      offset_x + chunk_offset[6][0],
      offset_y + chunk_offset[6][1],
      offset_z + chunk_offset[6][2],
    ]);
    terrains[7] = last_terrains[6];
    terrains[8] = last_terrains[7];
  }
  return terrains;
}
