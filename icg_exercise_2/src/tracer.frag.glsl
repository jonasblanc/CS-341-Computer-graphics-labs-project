precision highp float;

#define MAX_RANGE 1e6
//#define NUM_REFLECTIONS

//#define NUM_SPHERES
#if NUM_SPHERES != 0
uniform vec4 spheres_center_radius[NUM_SPHERES]; // ...[i] = [center_x, center_y, center_z, radius]
#endif

//#define NUM_PLANES
#if NUM_PLANES != 0
uniform vec4 planes_normal_offset[NUM_PLANES]; // ...[i] = [nx, ny, nz, d] such that dot(vec3(nx, ny, nz), point_on_plane) = d
#endif

//#define NUM_CYLINDERS
struct Cylinder {
	vec3 center;
	vec3 axis;
	float radius;
	float height;
};
#if NUM_CYLINDERS != 0
uniform Cylinder cylinders[NUM_CYLINDERS];
#endif


//#define NUM_TRIANGLES
struct Triangle {
	mat3 vertices;
// 	mat3 normals;
};
struct AABB {
	vec3 corner_min;
	vec3 corner_max;
};
#if NUM_TRIANGLES != 0
uniform Triangle triangles[NUM_TRIANGLES];
uniform AABB mesh_extent;
#endif

// materials
//#define NUM_MATERIALS
struct Material {
	vec3 color;
	float ambient;
	float diffuse;
	float specular;
	float shininess;
	float mirror;
};
uniform Material materials[NUM_MATERIALS];
#if (NUM_SPHERES != 0) || (NUM_PLANES != 0) || (NUM_CYLINDERS != 0) || (NUM_TRIANGLES != 0)
uniform int object_material_id[NUM_SPHERES+NUM_PLANES+NUM_CYLINDERS];
#endif

// lights
//#define NUM_LIGHTS
struct Light {
	vec3 color;
	vec3 position;
};
#if NUM_LIGHTS != 0
uniform Light lights[NUM_LIGHTS];
#endif
uniform vec3 light_color_ambient;


varying vec3 v2f_ray_origin;
varying vec3 v2f_ray_direction;

/*
	Solve the quadratic a*x^2 + b*x + c = 0. The method returns the number of solutions and store them
	in the argument solutions.
*/
int solve_quadratic(float a, float b, float c, out vec2 solutions) {

	// Linear case: bx+c = 0
	if (abs(a) < 1e-12) {
		if (abs(b) < 1e-12) {
			// no solutions
			return 0; 
		} else {
			// 1 solution: -c/b
			solutions[0] = - c / b;
			return 1;
		}
	} else {
		float delta = b * b - 4. * a * c;

		if (delta < 0.) {
			// no solutions in real numbers, sqrt(delta) produces an imaginary value
			return 0;
		} 

		// Avoid cancellation:
		// One solution doesn't suffer cancellation:
		//      a * x1 = 1 / 2 [-b - bSign * sqrt(b^2 - 4ac)]
		// "x2" can be found from the fact:
		//      a * x1 * x2 = c

		// We do not use the sign function, because it returns 0
		// float a_x1 = -0.5 * (b + sqrt(delta) * sign(b));
		float sqd = sqrt(delta);
		if (b < 0.) {
			sqd = -sqd;
		}
		float a_x1 = -0.5 * (b + sqd);


		solutions[0] = a_x1 / a;
		solutions[1] = c / a_x1;

		// 2 solutions
		return 2;
	} 
}

/*
	Check for intersection of the ray with a given sphere in the scene.
*/
bool ray_sphere_intersection(
		vec3 ray_origin, vec3 ray_direction, 
		vec3 sphere_center, float sphere_radius, 
		out float t, out vec3 normal) 
{
	vec3 oc = ray_origin - sphere_center;

	vec2 solutions; // solutions will be stored here

	int num_solutions = solve_quadratic(
		// A: t^2 * ||d||^2 = dot(ray_direction, ray_direction) but ray_direction is normalized
		1., 
		// B: t * (2d dot (o - c))
		2. * dot(ray_direction, oc),	
		// C: ||o-c||^2 - r^2				
		dot(oc, oc) - sphere_radius*sphere_radius,
		// where to store solutions
		solutions
	);

	// result = distance to collision
	// MAX_RANGE means there is no collision found
	t = MAX_RANGE+10.;
	bool collision_happened = false;

	if (num_solutions >= 1 && solutions[0] > 0.) {
		t = solutions[0];
	}
	
	if (num_solutions >= 2 && solutions[1] > 0. && solutions[1] < t) {
		t = solutions[1];
	}

	if (t < MAX_RANGE) {
		vec3 intersection_point = ray_origin + ray_direction * t;
		normal = (intersection_point - sphere_center) / sphere_radius;

		return true;
	} else {
		return false;
	}	
}

/*
	Check whether 2 vectors are parralel
*/
bool is_vector_parrallel_to_plan(vec3 vect, vec3 plane_normal){

	return abs(dot(vect, plane_normal)) < 1e-12;
}

/*
	Return the normal which points towards the viewer.
*/
vec3 normal_towards_viewer(vec3 normal, vec3 ray_direction){
	return normalize(dot(ray_direction, normal) >= 0. ? -normal : normal);
}

/*
	Check for intersection of the ray with a given plane in the scene.
*/
bool ray_plane_intersection(
		vec3 ray_origin, vec3 ray_direction, 
		vec3 plane_normal, float plane_offset, 
		out float t, out vec3 normal) 
{
	/** TODO 1.1:
	The plane is described by its normal vec3(nx, ny, nz) and an offset d.
	Point p belongs to the plane iff `dot(normal, p) = d`.

	- compute the ray's ntersection of the plane
	- if ray and plane are parallel there is no intersection
	- otherwise compute intersection data and store it in `normal`, and `t` (distance along ray until intersection).
	- return whether there is an intersection in front of the viewer (t > 0)
	*/

	// can use the plane center if you need it
	vec3 plane_center = plane_normal * plane_offset;
	t = MAX_RANGE + 10.;

	if(is_vector_parrallel_to_plan(ray_direction, plane_normal)){
		return false;
	}

	t = (dot(plane_normal, plane_center) - dot(plane_normal, ray_origin))/dot(plane_normal, ray_direction);
	
	if(t>MAX_RANGE || t<=0.){
		return false;
	}
	else{
		normal = normal_towards_viewer(plane_normal, ray_direction);
		return true;
	}

}

/*
	Check that a solution found by the intersection between a ray and an infinite cylinder
	is inside the corresponding finite cylinder.
*/
bool is_inside_finite_cylinder(vec3 ray_origin, vec3 ray_direction, Cylinder cyl, float solution){
	
	vec3 intersection_point = ray_origin + ray_direction * solution;
	vec3 center_intersection = intersection_point - cyl.center;

	return dot(center_intersection, center_intersection) <= (cyl.height / 2.) * (cyl.height / 2.) + cyl.radius * cyl.radius;

}
/*
	Check for intersection of the ray with a given cylinder in the scene.
*/
bool ray_cylinder_intersection(
		vec3 ray_origin, vec3 ray_direction, 
		Cylinder cyl,
		out float t, out vec3 normal) 
{
	/** TODO 1.2.2: 
	- compute the ray's first valid intersection with the cylinder
		(valid means in front of the viewer: t > 0)
	- store intersection point in `intersection_point`
	- store ray parameter in `t`
	- store normal at intersection_point in `normal`.
	- return whether there is an intersection with t > 0
	*/

	vec3 intersection_point;
	t = MAX_RANGE + 10.;

	//Solve the equations of the infinite cylinder-ray intersection
	vec3 v = cross(ray_direction, cyl.axis);
	vec3 w = cross((ray_origin - cyl.center), cyl.axis);
	float a = dot(v,v);
	float b = 2. * dot(v, w);
	float c = dot(w,w) - (cyl.radius * cyl.radius) * dot(cyl.axis, cyl.axis);

	
	vec2 solutions; // solutions will be stored here

	int num_solutions = solve_quadratic(a, b, c, solutions);
	
	if (num_solutions >= 1 && solutions[0] > 0. && is_inside_finite_cylinder(ray_origin, ray_direction, cyl, solutions[0])) {
		t = solutions[0];
	}
	
	if (num_solutions >= 2  && solutions[1] < t  && solutions[1] > 0. && is_inside_finite_cylinder(ray_origin, ray_direction, cyl, solutions[1])){
		t = solutions[1];
	}
	
	
	if (t < MAX_RANGE) {
		
		vec3 intersection_point = ray_origin + ray_direction * t;
		vec3 proj = (dot((intersection_point-cyl.center), cyl.axis)/dot(cyl.axis, cyl.axis))*cyl.axis;
		normal = (intersection_point - cyl.center) - proj;

		normal = normal_towards_viewer(normal, ray_direction);

		return true;
	} 
	else {
		return false;
	}	


	return false;
}


bool ray_AABB_filter(
	vec3 ray_origin, vec3 ray_direction, AABB aabb)
{
	return true;
}

bool ray_triangle_intersection(
		vec3 ray_origin, vec3 ray_direction, 
		Triangle tri,
		out float t, out vec3 normal) 
{

	vec3 p0 = tri.vertices[0];
	vec3 p1 = tri.vertices[1];
	vec3 p2 = tri.vertices[2];

	vec3 intersection_point;
	t = MAX_RANGE + 10.;

	return false;
}


/*
	Check for intersection of the ray with any object in the scene.
*/
bool ray_intersection(
		vec3 ray_origin, vec3 ray_direction, 
		out float col_distance, out vec3 col_normal, out int material_id) 
{
	col_distance = MAX_RANGE + 10.;
	col_normal = vec3(0., 0., 0.);

	float object_distance;
	vec3 object_normal;

	// Check for intersection with each sphere
	#if NUM_SPHERES != 0 // only run if there are spheres in the scene
	for(int i = 0; i < NUM_SPHERES; i++) {
		bool b_col = ray_sphere_intersection(
			ray_origin, 
			ray_direction, 
			spheres_center_radius[i].xyz, 
			spheres_center_radius[i][3], 
			object_distance, 
			object_normal
		);

		// choose this collision if its closer than the previous one
		if (b_col && object_distance < col_distance) {
			col_distance = object_distance;
			col_normal = object_normal;
			material_id =  object_material_id[i];
		}
	}
	#endif

	// Check for intersection with each plane
	#if NUM_PLANES != 0 // only run if there are planes in the scene
	for(int i = 0; i < NUM_PLANES; i++) {
		bool b_col = ray_plane_intersection(
			ray_origin, 
			ray_direction, 
			planes_normal_offset[i].xyz, 
			planes_normal_offset[i][3], 
			object_distance, 
			object_normal
		);

		// choose this collision if its closer than the previous one
		if (b_col && object_distance < col_distance) {
			col_distance = object_distance;
			col_normal = object_normal;
			material_id =  object_material_id[NUM_SPHERES+i];
		}
	}
	#endif

	// Check for intersection with each cylinder
	#if NUM_CYLINDERS != 0 // only run if there are cylinders in the scene
	for(int i = 0; i < NUM_CYLINDERS; i++) {
		bool b_col = ray_cylinder_intersection(
			ray_origin, 
			ray_direction,
			cylinders[i], 
			object_distance, 
			object_normal
		);

		// choose this collision if its closer than the previous one
		if (b_col && object_distance < col_distance) {
			col_distance = object_distance;
			col_normal = object_normal;
			material_id =  object_material_id[NUM_SPHERES+NUM_PLANES+i];
		}
	}
	#endif

	// Check for intersection with each triangle
	#if NUM_TRIANGLES != 0 // only run if there are triangles in the scene
	if( ray_AABB_filter(ray_origin, ray_direction, mesh_extent) ) {
		for(int i = 0; i < NUM_TRIANGLES; i++) {
			bool b_col = ray_triangle_intersection(
				ray_origin, 
				ray_direction,
				triangles[i],
				object_distance, 
				object_normal
			);

			// choose this collision if its closer than the previous one
			if (b_col && object_distance < col_distance) {
				col_distance = object_distance;
				col_normal = object_normal;
				material_id = object_material_id[NUM_SPHERES+NUM_PLANES+NUM_CYLINDERS+i];
			}
		}
	}
	#endif

	return col_distance < MAX_RANGE;
}


/*
	Return the color at an intersection point given a light and a material, exluding the contribution
	of potential reflected rays.
*/
vec3 lighting(
		vec3 object_point, vec3 object_normal, vec3 direction_to_camera, 
		Light light, Material mat) {


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
			specular =  light.color * mat.color * mat.specular * pow(dot(r, direction_to_camera), mat.shininess);
		}
	}
	
	return  diffuse + specular;
}

/*
	Get the material corresponding to mat_id from the list of materials.
*/
Material get_mat2(int mat_id) {
	Material m = materials[0];
	for(int mi = 1; mi < NUM_MATERIALS; mi++) {
		if(mi == mat_id) {
			m = materials[mi];
		}
	}
	return m;
}

void main() {


	vec3 ray_origin = v2f_ray_origin;
	vec3 ray_direction = normalize(v2f_ray_direction);

	vec3 pix_color = vec3(0.);
	
	// 2.1: 
	// Before reflexion
	/*
	float col_distance;
	vec3 col_normal = vec3(0.);
	int mat_id = 0;


	if(ray_intersection(ray_origin, ray_direction, col_distance, col_normal, mat_id)){
		Material mat = get_mat2(mat_id);

		vec3 intersectionPoint = ray_origin + col_distance * ray_direction;
		
		vec3 ambient_light = mat.color * mat.ambient * light_color_ambient;
		pix_color += ambient_light;

		#if NUM_LIGHTS != 0
		for(int i = 0; i < NUM_LIGHTS; ++i){
			vec3 lights_effect = lighting(intersectionPoint, col_normal, -ray_direction, lights[i], mat);			
			
			pix_color += lights_effect;
		}
		#endif
	}
	*/

	// 2.3.2: 
	float ANTI_ACNEE_FACTOR = 0.001;	
	float reflection_weight = 1.;

	for(int i_reflection = 0; i_reflection < NUM_REFLECTIONS+1; i_reflection++) {
		float col_distance;
		vec3 col_normal = vec3(0.);
		int mat_id = 0;

		// For NUM_REFLECTIONS times we compute the next intersection
		if(ray_intersection(ray_origin, ray_direction, col_distance, col_normal, mat_id)){
			Material mat = get_mat2(mat_id);

			// Color of the current pixel (without further reflexion)
			vec3 ci = vec3(0.);

			vec3 intersectionPoint = ray_origin + col_distance * ray_direction;
			vec3 ambient_light = mat.color * mat.ambient * light_color_ambient;

			ci += ambient_light;

			#if NUM_LIGHTS != 0
			for(int i = 0; i < NUM_LIGHTS; ++i){
				vec3 lights_effect = lighting(intersectionPoint, col_normal, -ray_direction, lights[i], mat);
				ci += lights_effect;
			}
			#endif
			
			// Add the weighted pixel color
			pix_color += (1.- mat.mirror) * reflection_weight * ci;

			// Update for the next reflexion point
			reflection_weight *= mat.mirror;
			ray_origin = intersectionPoint + ANTI_ACNEE_FACTOR * col_normal;
			ray_direction = normalize(reflect(ray_direction, col_normal));
		}
	}
	
	gl_FragColor = vec4(pix_color, 1.);
}
