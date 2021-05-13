import {
  vec2,
  vec3,
  vec4,
  mat2,
  mat3,
  mat4,
} from "../lib/gl-matrix_3.3.0/esm/index.js";
import { mat4_matmul_many } from "./icg_math.js";

function terrain_build_mesh() {
  const CHUNK_X = 10;
  const CHUNK_Y = 10;
  const CHUNK_Z = 10;

  const WATER_LEVEL = -0.03125;

  const vertices = [];
  const normals = [];
  const faces = [];

  // Map a 3D grid index (x, y, z) into a 1D index into the output vertex array.
  function xyz_to_v_index(x, y, z) {
    return x + y * CHUNK_X + z * CHUNK_X * CHUNK_Y;
  }

  for (let gx = 0; gx < CHUNK_X; gx++) {
    for (let gy = 0; gy < CHUNK_Y; gy++) {
      for (let gz = 0; gz < CHUNK_Z; gz++) {
        const idx = xyz_to_v_index(gx, gy, gz);

        // TODO adpat normal to cube
        normals[idx] = [0, 0, 1];

        /*
				The XY coordinates are calculated so that the full grid covers the square [-0.5, 0.5]^2 in the XY plane.
				*/
        const mapped_X = gx / CHUNK_X - 0.5;
        const mapped_Y = gy / CHUNK_Y - 0.5;
        const mapped_Z = gz / CHUNK_Z - 0.5;
        vertices[idx] = [mapped_X, mapped_Y, mapped_Z];
      }
    }
  }
  for (let gx = 0; gx < CHUNK_X - 1; gx++) {
    for (let gy = 0; gy < CHUNK_Y - 1; gy++) {
      for (let gz = 0; gz < CHUNK_Z - 1; gz++) {
        /*
         * We create a cube if the visibility is above 0 and nothing if it's below
         */
        let visibility = noise3D(gx, gy, gz);
        // we put the value between 0...1 so that it could be stored in a non-float texture on older browsers/GLES3, the -0.5 brings it back to -0.5 ... 0.5

        if (visibility >= 0.5) {
          const v000 = xyz_to_v_index(gx, gy, gz);
          const v001 = xyz_to_v_index(gx, gy, gz + 1);
          const v010 = xyz_to_v_index(gx, gy + 1, gz);
          const v011 = xyz_to_v_index(gx, gy + 1, gz + 1);
          const v100 = xyz_to_v_index(gx + 1, gy, gz);
          const v101 = xyz_to_v_index(gx + 1, gy, gz + 1);
          const v110 = xyz_to_v_index(gx + 1, gy + 1, gz);
          const v111 = xyz_to_v_index(gx + 1, gy + 1, gz + 1);

          faces.push([v000, v001, v010]);
          faces.push([v011, v010, v001]);

          faces.push([v000, v100, v001]);
          faces.push([v101, v001, v100]);

          faces.push([v000, v010, v100]);
          faces.push([v110, v100, v010]);

          faces.push([v111, v011, v101]);
          faces.push([v001, v101, v011]);

          faces.push([v111, v110, v011]);
          faces.push([v010, v011, v110]);

          faces.push([v111, v101, v110]);
          faces.push([v100, v110, v101]);

          // faces.push([v1, v2, v3]) // adds a triangle on vertex indices v1, v2, v3
        }
      }
    }
  }

  return {
    vertex_positions: vertices,
    vertex_normals: normals,
    faces: faces,
  };
}

function noise3D(x, y, z) {
  x -= 4;
  y -= 4;
  z -= 4;
  if ( x*x + y*y + z*z < 15 && x*x + y*y + z*z > 10 ){
    return 1;
  }
  return 0;
}

export function init_terrain(regl, resources, height_map_buffer) {
  const terrain_mesh = terrain_build_mesh();

  const pipeline_draw_terrain = regl({
    attributes: {
      position: terrain_mesh.vertex_positions,
      normal: terrain_mesh.vertex_normals,
    },
    uniforms: {
      mat_mvp: regl.prop("mat_mvp"),
      mat_model_view: regl.prop("mat_model_view"),
      mat_normals: regl.prop("mat_normals"),

      light_position: regl.prop("light_position"),
    },
    elements: terrain_mesh.faces,

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
