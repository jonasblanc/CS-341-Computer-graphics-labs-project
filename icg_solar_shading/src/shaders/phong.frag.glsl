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
    
	vec3 m_ambient_diffuse_specular = texture2D(texture_base_color, v2f_tex_coord).rgb;

	vec3 l = normalize(v2f_dir_to_light);
    float diffuse_factor = dot(v2f_normal, l); //n*l
    vec3 r = normalize(reflect(-l, v2f_normal));
    vec3 v = -normalize(v2f_dir_from_view);
    float specular_factor = dot(r, v);

    vec3 Ia = ambient * light_color;

    color = Ia * m_ambient_diffuse_specular;

    if(diffuse_factor>0.0){
        color += light_color * m_ambient_diffuse_specular * diffuse_factor
        if(specular_factor>0.0){
            color += light_color * m_ambient_diffuse_specular * pow(specular_factor, shininess)
        }
    }

}
