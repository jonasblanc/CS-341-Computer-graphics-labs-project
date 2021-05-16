import {
  vec2,
  vec3,
  vec4,
  mat2,
  mat3,
  mat4,
} from "../lib/gl-matrix_3.3.0/esm/index.js";
export { noise3D };

/**
 * Coordinates recieved are in real world coordinates (ie between -0.5 and 0.5 for the central chunk)
 * @param {*} x
 * @param {*} y
 * @param {*} z
 * @returns
 */
function noise3D(x, y, z) {
  
  return terrain2d(x,y,z)
  //return plan3D(x, y, z);
  //return sphere3D(x, y, z);
  //return perlin_noise_2D(x, y);
}

const HEIGHT_SCALE_FACTOR = 0.35; 

function terrain2d(x,y,z){
  const height = HEIGHT_SCALE_FACTOR*perlin_fbm(x,y);

  if(z<=height){
    return 1;
  }
  else{
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
  x -= 4;
  y -= 4;
  z -= 4;
  if (x * x + y * y + z * z < 15) {
    return 1;
  }
  return 0;
}


//---------------------------------------------------------------------------2D implementation-------------------------------------------------------------------------

const NUM_GRADIENTS = 12.0;

// -- Gradient table --
function gradients(i) {
	if (i ==  0) return [ 1,  1];
	if (i ==  1) return [ 1,  1];
	if (i ==  2) return [ 1, -1];
	if (i ==  3) return [-1, -1];
	if (i ==  4) return [ 1,  0];
	if (i ==  5) return [-1,  0];
	if (i ==  6) return [ 1,  0];
	if (i ==  7) return [-1,  0];
	if (i ==  8) return [ 0,  1];
	if (i ==  9) return [ 0, -1];
	if (i == 10) return [ 0,  1];
	if (i == 11) return [ 0, -1];
	return [0, 0];
}

/**
 * Hash function for a one dimensional number
 * @param {*} x
 * @returns a hash in range [0, 289) (might be decimal)
 */
function hash_poly(x) {
	return (((x*34)+1)*x) % 289;
}

/**
 * Hash function to hash a 2D point into an array index in range [0, NUM_GRADIENTS-1]
 * @param {*} grid_point: 2D point on the grid
 * @returns a hash in range [0, 289)
 */
function hash_func(grid_point) {
	return Math.floor(hash_poly(hash_poly(grid_point[0]) + grid_point[1]) % NUM_GRADIENTS);
}

/**
 * Smooth interpolation polynomial
 * @param {*} t
 * @returns the weight of the interpolation
 */
function blending_weight_poly(t) {
	return t*t*t*(t*(t*6.0 - 15.0)+10.0);
}

/**
 * Performs linear interpolation between two values using the given weight
 * @param {*} x: first value
 * @param {*} y: second value
 * @param {*} a: weight
 * @returns the linear interpolation
 */
function mix(x, y, a){
  return (1-a)*x + a*y;
}

/**
 * Compute the perlin noise of a 2D point
 * @param {*} x: x coordinate
 * @param {*} y: y coordinate
 * @returns a random looking value representing the height at this point
 */
function perlin_noise_2D(x,y) {

  const point = [x,y]

	const c00 = vec2.floor([0., 0.], point); //floor each component
	const c10 = [c00[0]+1.0, c00[1]];
	const c01 = [c00[0],     c00[1]+1.0];
	const c11 = [c00[0]+1.0, c00[1]+1.0];

	const gradient00 = gradients(hash_func(c00));
	const gradient10 = gradients(hash_func(c10));
	const gradient01 = gradients(hash_func(c01));
	const gradient11 = gradients(hash_func(c11));

	const a = vec2.subtract([0., 0.], point, c00);
	const b = vec2.subtract([0., 0.], point, c10);
	const c = vec2.subtract([0., 0.], point, c01);
	const d = vec2.subtract([0., 0.], point, c11);


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
const freq_multiplier = 2.17;
const ampl_multiplier = 0.5;
const num_octaves = 4;

/**
 * Compute the fractional Brownian motion (FBM) of a 2D point
 * @param {*} x: x coordinate
 * @param {*} y: y coordinate
 * @returns a random looking value representing the height at this point with different frequencies to have more details
 */
function perlin_fbm(x, y) {

	let fbm = 0.0;
	let freqi = 1.0;
	let ampi = 1.0;
	for (let i = 0; i < num_octaves; ++i ){
		fbm +=  ampi * perlin_noise_2D(x * freqi, y * freqi);
		freqi = freqi*freq_multiplier;
		ampi = ampi*ampl_multiplier;
	}
	return fbm;
}