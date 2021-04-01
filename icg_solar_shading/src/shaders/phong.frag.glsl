precision mediump float;
		
varying vec2 v2f_tex_coord;
varying vec3 v2f_normal; // normal vector in camera coordinates
varying vec3 v2f_dir_to_light; // direction to light source
varying vec3 v2f_dir_from_view; // viewing vector (from eye to vertex in view coordinates)


uniform vec3  light_color;
uniform float ambient;
uniform float shininess;

uniform sampler2D texture_base_color;

void main() {

	// TODO 5.2: apply the phong lighting model
	/**
    *  Implement the Phong shading model by using the passed
    *  variables and write the resulting color to `color`.
    *  `texture_base_color` should be used as material parameter for ambient, diffuse and specular lighting.
    * Hints:
    * - The texture(texture, 2d_position) returns a 4-vector (rgba). You can use
    * `texture(...).r` to get just the red component or `texture(...).rgb` to get a vec3 color
    * value
     */
	gl_FragColor = vec4(light_color, 1.); // output: RGBA in 0..1 range

    vec3 m_ambient_diffuse_specular = texture(texture_base_color, v2f_tex_coord).rgb;

	vec3 l = normalize(v2f_dir_to_light);
    vec3 diffuse_factor = dot(v2f_normal, l); //n*l
    vec3 r = normalize(reflect(-l, v2f_normal));
    vec3 v = -normalize(v2f_dir_from_view);
    vec3 specular_factor = dot(r, v);

    vec3 Ia = ambient * light_color;

    color = Ia * m_ambient_diffuse_specular;

    if(diffuse_factor>0.0){
        color += light_color * m_ambient_diffuse_specular * diffuse_factor
        if(specular_factor>0.0){
            color += light_color * m_ambient_diffuse_specular * pow(specular_factor, shininess)
        }
    }
    



    //////////////////////////////////////////////////////////////////////START OLD/////////////////////////////////////////////
    direction_to_camera = normalize(direction_to_camera);
	object_normal = normalize(object_normal);

	// 2.2: Implement shadows
	float ANTI_ACNEE_FACTOR = 0.001;	
	vec3 ray_direction = normalize(light.position - object_point);
	vec3 ray_origin = object_point + ANTI_ACNEE_FACTOR * object_normal;
	float col_distance;
	vec3 col_normal = vec3(0.);
	int mat_id = 0;

	if(ray_intersection(ray_origin, ray_direction, col_distance, col_normal, mat_id)){
		if(col_distance + ANTI_ACNEE_FACTOR  <= length(light.position - object_point)){
			return vec3(0.);
		}
	}

	// 2.1: Implement Phong Lighting
	vec3 l = normalize(light.position - object_point);

	vec3 diffuse = vec3(0.,0.,0.);
	vec3 specular = vec3(0.,0.,0.);

	// Positive only if the normal pointing toward the camera point toward the light as well
	// meaning that the light shine on the visible side of the surface
	if(dot(object_normal, l) > 0.){
		diffuse =  light.color * mat.color * mat.diffuse * dot(object_normal, l);
		
		vec3 r = normalize(reflect(-l, object_normal));

		if(dot(r, direction_to_camera) >0.){
			specular = mat.color * mat.specular * pow(dot(r, direction_to_camera), mat.shininess);
		}
	}
    /////////////////////////////////////////////////////////////////////END OLD/////////////////////////////////////////////

}
