//=============================================================================
//
//   Exercise code for the lecture "Introduction to Computer Graphics"
//     by Prof. Mario Botsch, Bielefeld University
//
//   Copyright (C) by Computer Graphics Group, Bielefeld University
//
//=============================================================================

precision mediump float;

varying vec2 v2f_tex_coord;
varying vec3 v2f_normal; // normal vector in camera coordinates
varying vec3 v2f_dir_to_light; // direction to light source
varying vec3 v2f_dir_from_view; // viewing vector (from eye to vertex in view coordinates)

uniform sampler2D texture_surface_day;
uniform sampler2D texture_surface_night;
uniform sampler2D texture_clouds;
uniform sampler2D texture_gloss;
uniform float sim_time;

uniform vec3  light_color;
uniform float ambient;
uniform float shininess;

void main()
{

	/** TODO 5.3:
    * - Copy your working code from the fragment shader of your Phong shader use it as
    * starting point
    * - instead of using a single texture, use the four texures `texture_surface_day`, `texture_surface_night`,
    * `texture_clouds` and `texture_gloss` and mix them for enhanced effects
    * Hints:
    * - cloud and gloss textures are just greyscales. So you'll just need one color-
    * component.
    * - The texture(texture, 2d_position) returns a 4-vector (rgba). You can use
    * `texture(...).r` to get just the red component or `texture(...).rgb` to get a vec3 color
    * value
    * - use mix(vec3 a,vec3 b, s) = a*(1-s) + b*s for linear interpolation of two colors
     */
    vec3 m_ambient_diffuse_specular_day_light = texture2D(texture_surface_day,v2f_tex_coord).rgb;
    vec3 m_ambient_diffuse_specular_cloud_light = texture2D(texture_clouds, v2f_tex_coord).rgb;
    vec3 m_ambient_diffuse_specular_night_light = texture2D(texture_surface_night,v2f_tex_coord).rgb;
    
	vec3 l = normalize(v2f_dir_to_light);
    vec3 r = normalize(reflect(-l, v2f_normal));
    vec3 v = -normalize(v2f_dir_from_view);
    
    float nl = dot(v2f_normal, l);
    float rv = dot(r, v);

    //-------Day------
    vec3 ambient_day = ambient * light_color * m_ambient_diffuse_specular_day_light;
    vec3 diffuse_day = light_color * m_ambient_diffuse_specular_day_light * nl;
    vec3 specular_day = light_color * vec3(1.0) * pow(rv, shininess);

    vec3 color_day = ambient_day;

    if(nl > 0.0){
        color_day += diffuse_day;
        if(rv > 0.0){
            if (texture2D(texture_gloss, v2f_tex_coord).r >= 0.5){
                color_day = mix(color_day, specular_day, texture2D(texture_clouds, v2f_tex_coord).r);
            }
        }
    }

    //-------Cloud------
    vec3 ambient_cloud = ambient * light_color * m_ambient_diffuse_specular_cloud_light;
    vec3 diffuse_cloud = light_color * m_ambient_diffuse_specular_cloud_light * nl;

    vec3 color_cloud = ambient_cloud;
    if(nl > 0.0){
        color_cloud += diffuse_cloud;
    }

    color_day = mix(color_day, color_cloud, texture2D(texture_clouds, v2f_tex_coord).r);
    
    //-------Night------
    vec3 color_night = mix(m_ambient_diffuse_specular_night_light, vec3(0.0), texture2D(texture_clouds, v2f_tex_coord).r);
    vec3 color = mix(color_day,color_night,(nl+1.0)/2.0);
    gl_FragColor = vec4(color_day, 1.); // output: RGBA in 0..1 range
}
