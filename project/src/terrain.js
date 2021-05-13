import {
  vec2,
  vec3,
  vec4,
  mat2,
  mat3,
  mat4,
} from "../lib/gl-matrix_3.3.0/esm/index.js";
import { mat4_matmul_many } from "./icg_math.js";

class BufferData {
  constructor(regl, buffer) {
    this.width = buffer.width;
    this.height = buffer.height;
    this.data = regl.read({ framebuffer: buffer });

    // this can read both float and uint8 buffers
    if (this.data instanceof Uint8Array) {
      // uint8 array is in range 0...255
      this.scale = 1 / 255;
    } else {
      this.scale = 1;
    }
  }

  get(x, y) {
    x = Math.min(Math.max(x, 0), this.width - 1);
    y = Math.min(Math.max(y, 0), this.height - 1);

    return this.data[(x + y * this.width) << 2] * this.scale;
  }
}

function terrain_build_mesh(height_map) {
  const grid_width = height_map.width;
  const grid_height = height_map.height;
  //const grid_deepness = height_map.deepness; //How to add that to height_map

  const WATER_LEVEL = -0.03125;

  const vertices = [];
  const normals = [];
  const faces = [];

  // Map a 3D grid index (x, y, z) into a 1D index into the output vertex array.
  function xyz_to_v_index(x, y, z) {
    return x + y * grid_width + z * grid_width * grid_height;
  }

  const height_factor = 10;

  for (let gy = 0; gy < grid_height; gy++) {
    for (let gx = 0; gx < grid_width; gx++) {
      for (let gz = 0; gz < height_factor; gz++) {
        const idx = xyz_to_v_index(gx, gy, gz);
        //let visibility = height_map.get(gx, gy, gz) - 0.5 // we put the value between 0...1 so that it could be stored in a non-float texture on older browsers/GLES3, the -0.5 brings it back to -0.5 ... 0.5

        // normal as finite difference of the height map
        // dz/dx = (h(x+dx) - h(x-dx)) / (2 dx)
        /*
		normals[idx] = vec3.normalize(
          [0, 0, 0],
          [
            -(height_map.get(gx + 1, gy, gz) - height_map.get(gx - 1, gy, gz)) /
              (2 / grid_width),
            -(height_map.get(gx, gy + 1, gz) - height_map.get(gx, gy - 1, gz)) /
              (2 / grid_height),
            -(height_map.get(gx, gy, gz + 1) - height_map.get(gx, gy, gz - 1)) /
              (2 / grid_deepness),
          ]
        );
		*/
        // TODO adpat normal to cube
        /*
        normals[idx] = vec3.normalize(
          [0, 0, 0],
          [
            -(height_map.get(gx + 1, gy) - height_map.get(gx - 1, gy)) /
              (2 / grid_width),
            -(height_map.get(gx, gy + 1) - height_map.get(gx, gy - 1)) /
              (2 / grid_height),
            1,
          ]
        );
		*/
        normals[idx] = [0, 0, 1];

        /* TODO 6.1
				Generate the displaced terrain vertex corresponding to integer grid location (gx, gy). 
				The height (Z coordinate) of this vertex is determined by height_map.
				If the point falls below WATER_LEVEL:
				* it should be clamped back to WATER_LEVEL.
				* the normal should be [0, 0, 1]

				The XY coordinates are calculated so that the full grid covers the square [-0.5, 0.5]^2 in the XY plane.
				*/
        const mapped_X = gx / grid_width - 0.5;
        const mapped_Y = gy / grid_height - 0.5;
        const mapped_Z = gz / height_factor - 0.5;

        /*
				if(visibility < WATER_LEVEL){
					visibility = WATER_LEVEL;
					normals[idx] = [0, 0, 1];
				}
				*/

        //vertices[idx] = [mapped_X, mapped_Y, visibility]
        vertices[idx] = [mapped_X, mapped_Y, mapped_Z];
      }
    }
  }

  for (let gy = 0; gy < grid_height - 1; gy++) {
    for (let gx = 0; gx < grid_width - 1; gx++) {
      const height = height_map.get(gx, gy) * height_factor;
      for (let gz = 0; gz < height - 1; gz++) {
        /*
         * We create a cube if the visibility is above 0 and nothing if it's below
         */

        let visibility = height_map.get(gx, gy, gz) - 0.5; // we put the value between 0...1 so that it could be stored in a non-float texture on older browsers/GLES3, the -0.5 brings it back to -0.5 ... 0.5

        if (visibility >= 0) {
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

    return {
      vertex_positions: vertices,
      vertex_normals: normals,
      faces: faces,
    };
  }
}

export function init_terrain(regl, resources, height_map_buffer) {
  const terrain_mesh = terrain_build_mesh(
    new BufferData(regl, height_map_buffer)
  );

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
