attribute vec3 position;
attribute vec3 normal;

// Vertex shader computes eye-space vertex position and normals + world-space height
varying vec3 v2f_normal; // normal vector in camera coordinates
varying vec3 v2f_dir_to_light; // direction to light source
varying vec3 v2f_dir_from_view; // viewing vector (from eye to vertex in view coordinates)
varying float v2f_height;

uniform mat4 mat_mvp;
uniform mat4 mat_model_view;
uniform mat3 mat_normals; // mat3 not 4, because normals are only rotated and not translated

uniform vec4 light_position; //in camera space coordinates already
void main()
{
    v2f_height = position.z;
    vec4 position_v4 = vec4(position, 1);

	// viewing vector (from camera to vertex in view coordinates), camera is at vec3(0, 0, 0) in cam coords
    vec4 dir_from_view_4D = mat_model_view * position_v4;//It is just the position in view system since the camera is at origin
	v2f_dir_from_view = vec3(dir_from_view_4D);	// direction to light source

	v2f_dir_to_light = vec3(light_position) - v2f_dir_from_view;//Vector from vertex to light
	// transform normal to camera coordinates
	v2f_normal = normalize(mat_normals * normal);
	
	gl_Position = mat_mvp * position_v4;
}
