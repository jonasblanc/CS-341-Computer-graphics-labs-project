// this version is needed for: indexing an array, const array, modulo %
precision highp float;

//=============================================================================
//	Exercise code for "Introduction to Computer Graphics 2018"
//     by
//	Krzysztof Lis @ EPFL
//=============================================================================

#define NUM_GRADIENTS 12

// -- Gradient table --
vec2 gradients(int i) {
	if (i ==  0) return vec2( 1,  1);
	if (i ==  1) return vec2(-1,  1);
	if (i ==  2) return vec2( 1, -1);
	if (i ==  3) return vec2(-1, -1);
	if (i ==  4) return vec2( 1,  0);
	if (i ==  5) return vec2(-1,  0);
	if (i ==  6) return vec2( 1,  0);
	if (i ==  7) return vec2(-1,  0);
	if (i ==  8) return vec2( 0,  1);
	if (i ==  9) return vec2( 0, -1);
	if (i == 10) return vec2( 0,  1);
	if (i == 11) return vec2( 0, -1);
	return vec2(0, 0);
}

float hash_poly(float x) {
	return mod(((x*34.0)+1.0)*x, 289.0);
}

// -- Hash function --
// Map a gridpoint to 0..(NUM_GRADIENTS - 1)
int hash_func(vec2 grid_point) {
	return int(mod(hash_poly(hash_poly(grid_point.x) + grid_point.y), float(NUM_GRADIENTS)));
}

// -- Smooth interpolation polynomial --
// Use mix(a, b, blending_weight_poly(t))
float blending_weight_poly(float t) {
	return t*t*t*(t*(t*6.0 - 15.0)+10.0);
}


// Constants for FBM
const float freq_multiplier = 2.17;
const float ampl_multiplier = 0.5;
const int num_octaves = 4;

// ==============================================================
// 1D Perlin noise evaluation and plotting

float perlin_noise_1d(float x) {
	/*
	// Note Gradients in the table are 2d, so in the 1D case we use grad.x
	*/

	/* TODO 2.1
	Evaluate the 1D Perlin noise function at "x" as described in the handout. 
	You will determine the two grid points surrounding x, 
	look up their gradients, 
	evaluate the the linear functions these gradients describe, 
	and interpolate these values 
	using the smooth interolation polygnomial blending_weight_poly.
	
	Note: gradients in the gradient lookup table are 2D, 
	 */

	float c_0 = floor(x);
	float c_1 = c_0 + 1.;

	float g_0 = gradients(hash_func(vec2(c_0,0.))).x;
	float g_1 = gradients(hash_func(vec2(c_1,0.))).x;

	float phi_0 = g_0 * (x-c_0);
	float phi_1 = g_1 * (x-c_1);
	
	float t = x - c_0;
	
	return mix(phi_0, phi_1, blending_weight_poly(t));
}

float perlin_fbm_1d(float x) {
	/* TODO 3.1
	Implement 1D fractional Brownian motion (fBm) as described in the handout.
	You should add together num_octaves octaves of Perlin noise, starting at octave 0. 
	You also should use the frequency and amplitude multipliers:
	freq_multiplier and ampl_multiplier defined above to rescale each successive octave.
	
	Note: the GLSL `for` loop may be useful.
	*/
	float fbm = 0.0;
	float freqi = 1.0;
	float ampi = 1.0;

	for (int i = 0; i < num_octaves; ++i ){
		fbm += ampi * perlin_noise_1d(x * freqi);
		freqi = freqi*freq_multiplier;
		ampi = ampi*ampl_multiplier;
	}
	return fbm;
}

// ----- plotting -----

const vec3 plot_foreground = vec3(0.5, 0.8, 0.5);
const vec3 plot_background = vec3(0.2, 0.2, 0.2);

vec3 plot_value(float func_value, float coord_within_plot) {
	return (func_value < ((coord_within_plot - 0.5)*2.0)) ? plot_foreground : plot_background;
}

vec3 plots(vec2 point) {
	// Press D (or right arrow) to scroll

	// fit into -1...1
	point += vec2(1., 1.);
	point *= 0.5;

	if(point.y < 0. || point.y > 1.) {
		return vec3(255, 0, 0);
	}

	float y_inv = 1. - point.y;
	float y_rel = y_inv / 0.2;
	int which_plot = int(floor(y_rel));
	float coord_within_plot = fract(y_rel);

	vec3 result;
	if(which_plot < 4) {
		result = plot_value(
 			perlin_noise_1d(point.x * pow(freq_multiplier, float(which_plot))),
			coord_within_plot
		);
	} else {
		result = plot_value(
			perlin_fbm_1d(point.x) * 1.5,
			coord_within_plot
		);
	}

	return result;
}

// ==============================================================
// 2D Perlin noise evaluation


float perlin_noise(vec2 point) {
	/* TODO 4.1
	Implement 2D perlin noise as described in the handout.
	You may find a glsl `for` loop useful here, but it's not necessary.
	*/

	vec2 c00 = vec2(floor(point.x), floor(point.y));
	vec2 c10 = vec2(c00.x+1.0, c00.y);
	vec2 c01 = vec2(c00.x, c00.y+1.0);
	vec2 c11 = vec2(c00.x+1.0, c00.y+1.0);

	vec2 gradient00 = gradients(hash_func(c00));
	vec2 gradient10 = gradients(hash_func(c10));
	vec2 gradient01 = gradients(hash_func(c01));
	vec2 gradient11 = gradients(hash_func(c11));

	vec2 a = point-c00;
	vec2 b = point-c10;
	vec2 c = point-c01;
	vec2 d = point-c11;

	float s = dot(gradient00, a);
	float t = dot(gradient10, b);
	float u = dot(gradient01, c);
	float v = dot(gradient11, d);

	float tx = point.x - c00.x;
	float ty = point.y - c00.y;
	
	float st = mix(s, t, blending_weight_poly(tx));
	float uv = mix(u, v, blending_weight_poly(tx));

	return mix(st, uv, blending_weight_poly(ty));
}

vec3 tex_perlin(vec2 point) {
	// Visualize noise as a vec3 color
	float freq = 23.15;
 	float noise_val = perlin_noise(point * freq) + 0.5;
	return vec3(noise_val);
}

// ==============================================================
// 2D Fractional Brownian Motion

float perlin_fbm(vec2 point) {
	/* TODO 4.2
	Implement 2D fBm as described in the handout. Like in the 1D case, you
	should use the constants num_octaves, freq_multiplier, and ampl_multiplier. 
	*/
	float fbm = 0.0;
	float freqi = 1.0;
	float ampi = 1.0;
	for (int i = 0; i < num_octaves; ++i ){
		fbm +=  ampi * perlin_noise(vec2(point.x * freqi, point.y * freqi));
		freqi = freqi*freq_multiplier;
		ampi = ampi*ampl_multiplier;
	}
	return fbm;
}

vec3 tex_fbm(vec2 point) {
	// Visualize noise as a vec3 color
	float noise_val = perlin_fbm(point) + 0.5;
	return vec3(noise_val);
}

vec3 tex_fbm_for_terrain(vec2 point) {
	// scale by 0.25 for a reasonably shaped terrain
	// the +0.5 transforms it to 0..1 range - for the case of writing it to a non-float textures on older browsers or GLES3
	float noise_val = (perlin_fbm(point) * 0.25) + 0.5;
	return vec3(noise_val);
}

// ==============================================================
// 2D turbulence

float turbulence(vec2 point) {
	/* TODO 4.3
	Implement the 2D turbulence function as described in the handout.
	Again, you should use num_octaves, freq_multiplier, and ampl_multiplier.
	*/
	float turb = 0.0;
	float freqi = 1.0;
	float ampi = 1.0;
	for (int i = 0; i < num_octaves; ++i ){
		turb +=  ampi * abs(perlin_noise(vec2(point.x * freqi, point.y * freqi)));
		freqi = freqi*freq_multiplier;
		ampi = ampi*ampl_multiplier;
	}
	return turb;
}

vec3 tex_turbulence(vec2 point) {
	// Visualize noise as a vec3 color
	float noise_val = turbulence(point);
	return vec3(noise_val);
}

vec3 basic_sphere_noise(vec2 point){
	float y_centered = point.y + 8.4;
	float x_centered = point.x - 12.3;
	float value = x_centered * x_centered + y_centered * y_centered;
	
	if(value < 0.5){
		return vec3(0.8);
	}else{
		return vec3(0.0);
	}
}

vec3 basic_sphere_texture(vec2 point){
	return vec3(1.0);
}


// ==============================================================
// Procedural "map" texture

const float terrain_water_level = -0.075;
const vec3 terrain_color_water = vec3(0.29, 0.51, 0.62);
const vec3 terrain_color_grass = vec3(0.43, 0.53, 0.23);
const vec3 terrain_color_mountain = vec3(0.8, 0.7, 0.7);

vec3 tex_map(vec2 point) {
	/* TODO 5.1.1
	Implement your map texture evaluation routine as described in the handout. 
	You will need to use your perlin_fbm routine and the terrain color constants described above.
	*/
	float noise_val = perlin_fbm(point);
	vec3 color_map = vec3(0.);
	if(noise_val < terrain_water_level){
		color_map = terrain_color_water;
	}else{
		color_map = mix(terrain_color_grass, terrain_color_mountain, noise_val - terrain_water_level);
	}
	
	return color_map;
}

// ==============================================================
// Procedural "wood" texture

const vec3 brown_dark 	= vec3(0.48, 0.29, 0.00);
const vec3 brown_light 	= vec3(0.90, 0.82, 0.62);

vec3 tex_wood(vec2 point) {
	/* TODO 5.1.2
	Implement your wood texture evaluation routine as described in thE handout. 
	You will need to use your 2d turbulence routine and the wood color constants described above.
	*/
	float alpha = .5 * (1. + sin(100. * (length(point) + .15 * turbulence(point))));
    return mix(brown_light, brown_dark, alpha);
}


// ==============================================================
// Procedural "marble" texture

const vec3 white 			= vec3(0.95, 0.95, 0.95);

vec3 tex_marble(vec2 point) {
	/* TODO 5.1.3
	Implement your marble texture evaluation routine as described in the handout.
	You will need to use your 2d fbm routine and the marble color constants described above.
	*/

	vec2 q = vec2(perlin_fbm(point), perlin_fbm(point + vec2(1.7, 4.6)));
    float alpha = .5 * (1. + perlin_fbm(point + 4.*q));
    return mix(white,brown_dark,alpha);
}


