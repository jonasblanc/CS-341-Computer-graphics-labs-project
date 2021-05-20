precision highp float;

// varying vec2 v2f_tex_coord;
varying vec3 v2f_normal; // normal vector in camera coordinates
varying vec3 v2f_dir_to_light; // direction to light source
varying vec3 v2f_dir_from_view; // viewing vector (from eye to vertex in view coordinates)
varying float v2f_height;
uniform bool night_mode;
uniform float sim_time;

const vec3  light_color = vec3(1.0, 0.941, 0.898);
// Small perturbation to prevent "z-fighting" on the water on some machines...
const float terrain_water_level    = -0.02 + 1e-6; //-0.03125 + 1e-6;
const vec3  terrain_color_water    = vec3(0.29, 0.51, 0.62);
const vec3  terrain_color_mountain = vec3(0.8, 0.5, 0.4);
const vec3  terrain_color_grass    = vec3(0.33, 0.43, 0.18);

void main()
{
	
    float height = v2f_height;

	vec3 color_map = vec3(0.0);
	float shininess = 0.0;

	if(height < terrain_water_level){
		color_map = terrain_color_water;
		shininess = 8.0;
	}else{
		color_map = mix(terrain_color_grass, terrain_color_mountain, (height - terrain_water_level)*2.0);
	 	shininess = 0.5;
	}

	vec3 l = normalize(v2f_dir_to_light);
    vec3 r = normalize(reflect(-l, v2f_normal));
    vec3 v = -normalize(v2f_dir_from_view);
    
    float nl = dot(v2f_normal, l);
    float rv = dot(r, v);

    vec3 color = light_color * 0.2;

    
    if(nl > 0.0){
        vec3 diffuse = light_color * color_map * nl;
        color += diffuse;
        if(rv > 0.0){
            vec3 specular = light_color * color_map * pow(rv, shininess);
            color += specular;
        }
    }

    float a = (cos(sim_time)+1.0)/2.0;
    vec3 day_night_color = mix(vec3(.0, .04, .12),vec3(1.0),  a);
    color = mix(color, day_night_color, length(v2f_dir_from_view) / 3.0); //chnage 1 to 0 and vice versa to enable day/night

    // Brut force terrain color
    // if(!night_mode){
    //     color = mix(color, day_night_color, length(v2f_dir_from_view) / 3.0); //chnage 1 to 0 and vice versa to enable day/night
    // }else{
    //   color = mix(color, vec3(.0, .04, .12), length(v2f_dir_from_view) / 3.0); //chnage 1 to 0 and vice versa to enable day/night
    // }	
    gl_FragColor = vec4(color, 1.); // output: RGBA in 0..1 range
}
