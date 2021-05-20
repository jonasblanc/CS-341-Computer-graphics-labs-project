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

import {
  CHUNK_SIZE_X,
  CHUNK_SIZE_Y,
  CHUNK_SIZE_Z,
} from "./terrain_constants.js";

var last_offset = [0, 0, 0];
var last_terrains = [];

/**
 * Generate the terrain composed of 9 chunks based on the given position
 * @param {*} regl
 * @param {*} resources
 * @param {*} position
 * @returns a list of TerrainActor
 */
export function generate_terrains(regl, resources, position) {
  const chunk_offset_x = Math.round(position[0] / CHUNK_SIZE_X);
  const chunk_offset_y = Math.round(position[1] / CHUNK_SIZE_Y);
  const chunk_offset_z = Math.round(position[2] / CHUNK_SIZE_Z);

  if (
    last_offset[0] == chunk_offset_x &&
    last_offset[1] == chunk_offset_y &&
    last_offset[2] == chunk_offset_z &&
    last_terrains.length != 0
  ) {
    return last_terrains;
  } else {
    const chunk_grid_offset = [
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
    if (last_terrains.length == 0 || last_offset[2] != chunk_offset_z) {
      terrains = generate_all_chunks(regl, resources, chunk_grid_offset, [
        chunk_offset_x,
        chunk_offset_y,
        chunk_offset_z,
      ]);
    } else {
      terrains = update_chunks(
        regl,
        resources,
        chunk_grid_offset,
        chunk_offset_x,
        chunk_offset_y,
        chunk_offset_z
      );
    }

    last_offset = [chunk_offset_x, chunk_offset_y, chunk_offset_z];
    last_terrains = terrains;
    return terrains;
  }
}

/**
 * Generate all 9 chunks
 * @param {*} regl
 * @param {*} resources
 * @param {*} chunk_grid_offset
 * @param {*} chunk_offset_xyz
 * @returns a list of TerrainActor
 */
function generate_all_chunks(
  regl,
  resources,
  chunk_grid_offset,
  chunk_offset_xyz
) {
  const terrains = [];

  for (let i = 0; i < chunk_grid_offset.length; ++i) {
    const mesh = terrain_build_mesh([
      chunk_offset_xyz[0] + chunk_grid_offset[i][0],
      chunk_offset_xyz[1] + chunk_grid_offset[i][1],
      chunk_offset_xyz[2] + chunk_grid_offset[i][2],
    ]);

    terrains.push(create_terrain_actor(regl, resources, mesh));
  }
  return terrains;
}

/**
 * Create a TerrainActor with the given mesh
 * @param {*} regl
 * @param {*} resources
 * @param {*} mesh
 * @returns a TerrainActor
 */
function create_terrain_actor(regl, resources, mesh) {
  const pipeline_draw_terrain = regl({
    attributes: {
      position: mesh.vertex_positions,
      normal: mesh.vertex_normals,
    },
    uniforms: {
      mat_mvp: regl.prop("mat_mvp"),
      mat_model_view: regl.prop("mat_model_view"),
      mat_normals: regl.prop("mat_normals"),
      sky_color: regl.prop("sky_color"),

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

    draw({ mat_projection, mat_view, light_position_cam, sky_color }) {
      mat4_matmul_many(this.mat_model_view, mat_view, this.mat_model_to_world);
      mat4_matmul_many(this.mat_mvp, mat_projection, this.mat_model_view);

      mat3.fromMat4(this.mat_normals, this.mat_model_view);
      mat3.transpose(this.mat_normals, this.mat_normals);
      mat3.invert(this.mat_normals, this.mat_normals);

      pipeline_draw_terrain({
        mat_mvp: this.mat_mvp,
        mat_model_view: this.mat_model_view,
        mat_normals: this.mat_normals,
        sky_color: sky_color,

        light_position: light_position_cam,
      });
    }
  }
  return new TerrainActor();
}

/**
 * Update the chunk list by recreating the necessary chunks and keeping the common chunks
 * @param {*} regl
 * @param {*} resources
 * @param {*} chunk_offset
 * @param {*} offset_x
 * @param {*} offset_y
 * @param {*} offset_z
 * @returns List of TerrainActor
 */
function update_chunks(
  regl,
  resources,
  chunk_offset,
  offset_x,
  offset_y,
  offset_z
) {
  const terrains = [];
  // Back and front
  if (last_offset[0] < offset_x) {
    terrains[0] = last_terrains[3];
    terrains[1] = last_terrains[4];
    terrains[2] = last_terrains[5];
    terrains[3] = last_terrains[6];
    terrains[4] = last_terrains[7];
    terrains[5] = last_terrains[8];
    terrains[6] = create_terrain_actor(
      regl,
      resources,
      terrain_build_mesh([
        offset_x + chunk_offset[6][0],
        offset_y + chunk_offset[6][1],
        offset_z + chunk_offset[6][2],
      ])
    );
    terrains[7] = create_terrain_actor(
      regl,
      resources,
      terrain_build_mesh([
        offset_x + chunk_offset[7][0],
        offset_y + chunk_offset[7][1],
        offset_z + chunk_offset[7][2],
      ])
    );
    terrains[8] = create_terrain_actor(
      regl,
      resources,
      terrain_build_mesh([
        offset_x + chunk_offset[8][0],
        offset_y + chunk_offset[8][1],
        offset_z + chunk_offset[8][2],
      ])
    );
  } else if (last_offset[0] > offset_x) {
    terrains[0] = create_terrain_actor(
      regl,
      resources,
      terrain_build_mesh([
        offset_x + chunk_offset[0][0],
        offset_y + chunk_offset[0][1],
        offset_z + chunk_offset[0][2],
      ])
    );
    terrains[1] = create_terrain_actor(
      regl,
      resources,
      terrain_build_mesh([
        offset_x + chunk_offset[1][0],
        offset_y + chunk_offset[1][1],
        offset_z + chunk_offset[1][2],
      ])
    );
    terrains[2] = create_terrain_actor(
      regl,
      resources,
      terrain_build_mesh([
        offset_x + chunk_offset[2][0],
        offset_y + chunk_offset[2][1],
        offset_z + chunk_offset[2][2],
      ])
    );
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
    terrains[2] = create_terrain_actor(
      regl,
      resources,
      terrain_build_mesh([
        offset_x + chunk_offset[2][0],
        offset_y + chunk_offset[2][1],
        offset_z + chunk_offset[2][2],
      ])
    );
    terrains[3] = last_terrains[4];
    terrains[4] = last_terrains[5];
    terrains[5] = create_terrain_actor(
      regl,
      resources,
      terrain_build_mesh([
        offset_x + chunk_offset[5][0],
        offset_y + chunk_offset[5][1],
        offset_z + chunk_offset[5][2],
      ])
    );
    terrains[6] = last_terrains[7];
    terrains[7] = last_terrains[8];
    terrains[8] = create_terrain_actor(
      regl,
      resources,
      terrain_build_mesh([
        offset_x + chunk_offset[8][0],
        offset_y + chunk_offset[8][1],
        offset_z + chunk_offset[8][2],
      ])
    );
  } else if (last_offset[1] > offset_y) {
    terrains[0] = create_terrain_actor(
      regl,
      resources,
      terrain_build_mesh([
        offset_x + chunk_offset[0][0],
        offset_y + chunk_offset[0][1],
        offset_z + chunk_offset[0][2],
      ])
    );
    terrains[1] = last_terrains[0];
    terrains[2] = last_terrains[1];
    terrains[3] = create_terrain_actor(
      regl,
      resources,
      terrain_build_mesh([
        offset_x + chunk_offset[3][0],
        offset_y + chunk_offset[3][1],
        offset_z + chunk_offset[3][2],
      ])
    );
    terrains[4] = last_terrains[3];
    terrains[5] = last_terrains[4];
    terrains[6] = create_terrain_actor(
      regl,
      resources,
      terrain_build_mesh([
        offset_x + chunk_offset[6][0],
        offset_y + chunk_offset[6][1],
        offset_z + chunk_offset[6][2],
      ])
    );
    terrains[7] = last_terrains[6];
    terrains[8] = last_terrains[7];
  }
  return terrains;
}
