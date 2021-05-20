import {
  vec2,
  vec3,
  vec4,
  mat2,
  mat3,
  mat4,
} from "../lib/gl-matrix_3.3.0/esm/index.js";
import { max } from "../lib/gl-matrix_3.3.0/esm/vec3.js";
export { noise3D, normalComputation };

/**
 * Coordinates recieved are in real world coordinates (ie between -0.5 and 0.5 for the central chunk)
 * @param {*} xyz
 * @returns
 */
function noise3D(xyz) {
  const x = xyz[0];
  const y = xyz[1];
  const z = xyz[2];

  const value_choose_region = choose_noise_function(x, y);
  if (value_choose_region <= -0.33) {
    return plain(x, y, z);
  } else if (value_choose_region <= 0.33) {
    return water_with_flying_islands(x, y, z);
  } else {
    return mountain(x, y, z);
  }

  //return terrain2d(xyz[0], xyz[1], xyz[2]);
  //return plan3D(xyz[0],xyz[1], xyz[2]);
  //return plan3D(xyz[0],xyz[1], xyz[2]);
  //return sin2D(xyz[0],xyz[1], xyz[2]);
  //return sin1D(xyz[0],xyz[1], xyz[2]);
  //return sphere3D(xyz[0], xyz[1], xyz[2]);
  //return smoothSphere3D(xyz[0], xyz[1], xyz[2]);
  //return perlin_noise_2D(xyz[0], xyz[1]);
}

function normalComputation(xyz, delta) {
  // normal as finite difference of the height map
  // dz/dx = (h(x+dx) - h(x-dx)) / (2 dx)
  const x = xyz[0];
  const y = xyz[1];
  const z = xyz[2];
  return vec3.normalize(
    [0, 0, 0],
    [
      -(noise3D([x + delta[0], y, z]) - noise3D([x - delta[0], y, z])) /
        (2 * delta[0]),
      -(noise3D([x, y + delta[1], z]) - noise3D([x, y - delta[1], z])) /
        (2 * delta[1]),
      -(noise3D([x, y, z + delta[2]]) - noise3D([x, y, z - delta[2]])) /
        (2 * delta[2]),
    ]
  );
}

const HEIGHT_SCALE_FACTOR = 0.35;

function terrain2d(x, y, z, num_octaves, freq_multiplier, ampl_multiplier) {
  if (z < -0.05) {
    return 1;
  }

  const height =
    HEIGHT_SCALE_FACTOR *
    perlin_fbm(x, y, num_octaves, freq_multiplier, ampl_multiplier);

  if (z <= height) {
    return 1;
  } else {
    return 0;
  }
}

function plan3D(x, y, z) {
  if (z < 0) {
    return 1;
  }
  return 0;
}

function sphere3D(x, y, z) {
  const r2 = x * x + y * y + z * z;
  if (r2 < 0.1) {
    return 1;
  } else {
    return 0;
  }
}

function smoothSphere3D(x, y, z) {
  const r2 = x * x + y * y + z * z;
  return Math.exp(-3 * r2);
}

function sin2D(x, y, z) {
  if (z < -0.3) {
    return 1;
  } else {
    if (z < (Math.sin(2 * x) + Math.sin(2 * y)) / 5 - 0.1) {
      return 1;
    } else {
      return 0;
    }
  }
}

function sin1D(x, y, z) {
  if (z < -0.1) {
    return 1;
  } else {
    if (z < Math.sin(2 * x) / 3 - 0.1) {
      return 1;
    } else {
      return 0;
    }
  }
}

//---------------------------------------------------------------------------2D implementation-------------------------------------------------------------------------

const NUM_GRADIENTS = 12.0;

// -- Gradient table --
function gradients(i) {
  if (i == 0) return [1, 1];
  if (i == 1) return [1, 1];
  if (i == 2) return [1, -1];
  if (i == 3) return [-1, -1];
  if (i == 4) return [1, 0];
  if (i == 5) return [-1, 0];
  if (i == 6) return [1, 0];
  if (i == 7) return [-1, 0];
  if (i == 8) return [0, 1];
  if (i == 9) return [0, -1];
  if (i == 10) return [0, 1];
  if (i == 11) return [0, -1];
  return [0, 0];
}

/**
 * Hash function for a one dimensional number
 * @param {*} x
 * @returns a hash in range [0, 289) (might be decimal)
 */
function hash_poly(x) {
  return ((x * 34 + 1) * x) % 289;
}

/**
 * Hash function to hash a 2D point into an array index in range [0, NUM_GRADIENTS-1]
 * @param {*} grid_point: 2D point on the grid
 * @returns a hash in range [0, 289)
 */
function hash_func(grid_point) {
  return Math.floor(
    hash_poly(hash_poly(grid_point[0]) + grid_point[1]) % NUM_GRADIENTS
  );
}

/**
 * Smooth interpolation polynomial
 * @param {*} t
 * @returns the weight of the interpolation
 */
function blending_weight_poly(t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

/**
 * Performs linear interpolation between two values using the given weight
 * @param {*} x: first value
 * @param {*} y: second value
 * @param {*} a: weight
 * @returns the linear interpolation
 */
function mix(x, y, a) {
  return (1 - a) * x + a * y;
}

/**
 * Compute the perlin noise of a 2D point
 * @param {*} x: x coordinate
 * @param {*} y: y coordinate
 * @returns a random looking value representing the height at this point
 */
function perlin_noise_2D(x, y) {
  const point = [x, y];

  const c00 = vec2.floor([0, 0], point); //floor each component
  const c10 = [c00[0] + 1.0, c00[1]];
  const c01 = [c00[0], c00[1] + 1.0];
  const c11 = [c00[0] + 1.0, c00[1] + 1.0];

  const gradient00 = gradients(hash_func(c00));
  const gradient10 = gradients(hash_func(c10));
  const gradient01 = gradients(hash_func(c01));
  const gradient11 = gradients(hash_func(c11));

  const a = vec2.subtract([0, 0], point, c00);
  const b = vec2.subtract([0, 0], point, c10);
  const c = vec2.subtract([0, 0], point, c01);
  const d = vec2.subtract([0, 0], point, c11);

  const s = vec2.dot(gradient00, a);
  const t = vec2.dot(gradient10, b);
  const u = vec2.dot(gradient01, c);
  const v = vec2.dot(gradient11, d);

  const tx = point[0] - c00[0];
  const ty = point[1] - c00[1];

  const st = mix(s, t, blending_weight_poly(tx));
  const uv = mix(u, v, blending_weight_poly(tx));

  return mix(st, uv, blending_weight_poly(ty));
}

// Constants for FBM
//const freq_multiplier = 2.17;
//const ampl_multiplier = 0.8;
//const num_octaves = 20;

/**
 * Compute the fractional Brownian motion (FBM) of a 2D point
 * @param {*} x: x coordinate
 * @param {*} y: y coordinate
 * @returns a random looking value representing the height at this point with different frequencies to have more details
 */
function perlin_fbm(x, y, num_octaves, freq_multiplier, ampl_multiplier) {
  let fbm = 0.0;
  let freqi = 1.0;
  let ampi = 1.0;
  for (let i = 0; i < num_octaves; ++i) {
    fbm += ampi * perlin_noise_2D(x * freqi, y * freqi);
    freqi = freqi * freq_multiplier;
    ampi = ampi * ampl_multiplier;
  }
  return fbm;
}

function choose_noise_function(x, y) {
  const angular_speed = 0.8;
  const value = Math.sin(angular_speed * x) * Math.sin(angular_speed * y);

  return value;
}

//---------------------------------------------------------------------------------BIOMES-------------------------------------------------------------------------------

const WATER_HEIGHT = -0.032;

function plain(x, y, z) {
  if (z < WATER_HEIGHT) {
    return z - WATER_HEIGHT;
  }

  const freq_multiplier = 2.17;
  const ampl_multiplier = 0.5;
  const num_octaves = 1;
  const height_scale_factor = 0.45;

  const height =
    height_scale_factor *
    perlin_fbm(x, y, num_octaves, freq_multiplier, ampl_multiplier);

  return z - Math.max(height, WATER_HEIGHT);
}

function mountain(x, y, z) {
  if (z < WATER_HEIGHT) {
    return z - WATER_HEIGHT;
  }

  const freq_multiplier = 2.17;
  const ampl_multiplier = 0.6;
  const num_octaves = 8;
  const height_scale_factor = 0.25;
  const base_height = 0.15;

  const height =
    base_height +
    height_scale_factor *
      perlin_fbm(x, y, num_octaves, freq_multiplier, ampl_multiplier);

  return z - Math.max(height, WATER_HEIGHT);
}

function water_with_flying_islands(x, y, z) {
  //if(z < WATER_HEIGHT){
  return z - WATER_HEIGHT;
  //}
  /*
  const freq_multiplier = 2.17;
  const ampl_multiplier = 0.5;
  const num_octaves = 4;
  const height_scale_factor = 0.5;

  const height_bottom_island =
    height_scale_factor *
    perlin_fbm(x, y, num_octaves, freq_multiplier, ampl_multiplier);
  
  const freq_multiplier = 2.17;
  const ampl_multiplier = 0.5;
  const num_octaves = 4;
  const height_scale_factor = 0.5;
  
    const height_top_island =
      height_scale_factor *
      perlin_fbm(x, y, num_octaves, freq_multiplier, ampl_multiplier);
  
  // No island
  if(height_top_island < height_bottom_island){
    return z - WATER_HEIGHT;
  }
  
  if(z > height_top_island){
    return z - height_top_island
  }else if(z < height_bottom_island){
   if(){

   }
      
    
  }
  */
}
