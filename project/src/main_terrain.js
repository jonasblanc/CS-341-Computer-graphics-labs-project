import { createREGL } from "../lib/regljs_2.1.0/regl.module.js";
import {
  vec3,
  vec4,
  mat4,
} from "../lib/gl-matrix_3.3.0/esm/index.js";

import {
  DOM_loaded_promise,
  load_text,
  register_button_with_hotkey,
  register_keyboard_action,
} from "./icg_web.js";

import {
  deg_to_rad,
  mat4_matmul_many,
} from "./icg_math.js";

import { generate_terrains } from "./terrain_generation.js";

import{ STARTING_LOCATION } from "./terrain_constants.js"

async function main() {
  /* const in JS means the variable will not be bound to a new value, but the value can be modified (if its an object or array)
		https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const
	*/

  const debug_overlay = document.getElementById("debug-overlay");

  // We are using the REGL library to work with webGL
  // http://regl.party/api
  // https://github.com/regl-project/regl/blob/master/API.md

  const regl = createREGL({
    // the canvas to use
    profile: true, // if we want to measure the size of buffers/textures in memory
    extensions: ["oes_texture_float"], // enable float textures
  });

  // The <canvas> (HTML element for drawing graphics) was created by REGL, lets take a handle to it.
  const canvas_elem = document.getElementsByTagName("canvas")[0];

  {
    // Resize canvas to fit the window, but keep it square.
    function resize_canvas() {
      canvas_elem.width = window.innerWidth;
      canvas_elem.height = window.innerHeight;
    }
    resize_canvas();
    window.addEventListener("resize", resize_canvas);
  }

  /*---------------------------------------------------------------
		Resource loading
	---------------------------------------------------------------*/

  /*
	The textures fail to load when the site is opened from local file (file://) due to "cross-origin".
	Solutions:
	* run a local webserver
		caddy file-server -browse -listen 0.0.0.0:8000 -root .
		# or
		python -m http.server 8000
		# open localhost:8000
	OR
	* run chromium with CLI flag
		"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --allow-file-access-from-files index.html

	* edit config in firefox
		security.fileuri.strict_origin_policy = false
	*/

  // Start downloads in parallel
  const resources = {};

  [
    "noise.frag.glsl",
    "display.vert.glsl",

    "terrain.vert.glsl",
    "terrain.frag.glsl",

    "buffer_to_screen.vert.glsl",
    "buffer_to_screen.frag.glsl",
  ].forEach((shader_filename) => {
    resources[`shaders/${shader_filename}`] = load_text(
      `./src/shaders/${shader_filename}`
    );
  });

  // Wait for all downloads to complete
  for (const key of Object.keys(resources)) {
    resources[key] = await resources[key];
  }

  /*---------------------------------------------------------------
		Camera
	---------------------------------------------------------------*/
  const mat_world_to_cam = mat4.create();

  let cam_angle_z = 0; // in radians!
  let cam_angle_y = 0; // in radians!


  const DEFAULT_CAM_LOOK_AT = [0, 0.0, 0.0];
  const DEFAULT_CAM_POS = [1, 0.0, 0.4];
  const MIN_Z = 0.4;
  const MAX_Z = 0.52;

  let cam_look_at = [0,0,0];
  let cam_pos = [0,0,0];

  const light_position_world = [0, 0, 0, 1];
  const light_position_cam = [0, 0, 0, 0];

  let sim_time = 0.0;
  let prev_regl_time = 0.0;
  let is_sun_rotating = true;

  function update_cam_transform() {
    /*
    const look_at = mat4.lookAt(
      mat4.create(),
      [1, 0, 1], //cam_pos, // camera position in world coord
      [0, 0, 0], //cam_look_at, // view target point
      [0, 0, 1] // up vector
    );
    let rotatedZ = mat4.fromZRotation(mat4.create(), cam_angle_z);
    let rotatedY = mat4.fromZRotation(mat4.create(), cam_angle_y);

    let deplacement = mat4.fromTranslation(mat4.create(), cam_pos);

    mat4_matmul_many(
      mat_world_to_cam,
      look_at,
      rotatedZ,
      rotatedY,
      deplacement
    );*/

    const look_at = mat4.lookAt(
      mat4.create(),
      cam_pos, // camera position in world coord
      cam_look_at, // view target point
      [0, 0, 1] // up vector
    );
    mat4_matmul_many(mat_world_to_cam, look_at);
  }

  update_cam_transform();

  /*
		UI
	*/
  register_keyboard_action("z", () => {
    debug_overlay.classList.toggle("hide");
  });
  register_keyboard_action("w", () => {
    cam_look_at[0] -= 0.2;
    cam_pos[0] -= 0.2;
    update_cam_transform();
  });
  register_keyboard_action("a", () => {
    cam_look_at[1] -= 0.2;
    cam_pos[1] -= 0.2;
    update_cam_transform();
  });
  register_keyboard_action("s", () => {
    cam_look_at[0] += 0.2;
    cam_pos[0] += 0.2;
    update_cam_transform();
  });
  register_keyboard_action("d", () => {
    cam_look_at[1] += 0.2;
    cam_pos[1] += 0.2;
    update_cam_transform();
  });
  register_keyboard_action("m", () => {
    is_sun_rotating = !is_sun_rotating;
  });

  function activate_preset_view() {
    cam_look_at = vec3.add([0,0,0], DEFAULT_CAM_LOOK_AT, STARTING_LOCATION);
    cam_pos = vec3.add([0,0,0], DEFAULT_CAM_POS, STARTING_LOCATION);
    sim_time = 24.0;
    update_cam_transform();
  }
  activate_preset_view();
  register_button_with_hotkey("btn-preset-view", "c", activate_preset_view);

  // Prevent clicking and dragging from selecting the GUI text.
  canvas_elem.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  // Rotate camera position by dragging with the mouse
  window.addEventListener("mousemove", (event) => {
    // if left or middle button is pressed
    if (event.buttons & 1 || event.buttons & 4) {
      cam_angle_z += event.movementX * 0.005;
      cam_angle_y += -event.movementY * 0.005;

      update_cam_transform();
    }
  });

  window.addEventListener("wheel", (event) => {
    // scroll wheel to zoom in or out
    const factor = event.deltaY/200;
    
    let tmp = cam_pos[2] + factor;
    if( tmp >MIN_Z && tmp <MAX_Z ){
      cam_pos[0] += 2*factor;
      cam_pos[2] = tmp;
    }
    
    event.preventDefault(); // don't scroll the page too...
    update_cam_transform();
  });

  /*---------------------------------------------------------------
		Actors
	---------------------------------------------------------------*/

  var terrain_actors = generate_terrains(regl, resources, cam_look_at);

  function mix(color1, color2, mix_value) {
    let result = [];
    for (let i = 0; i < 3; ++i) {
      result.push(color1[i] * mix_value + (1 - mix_value) * color2[i]);
    }
    return result;
  }

  /*---------------------------------------------------------------
		Frame render
	---------------------------------------------------------------*/
  const mat_projection = mat4.create();
  const mat_view = mat4.create();

  regl.frame((frame) => {
    const dt = frame.time - prev_regl_time;
    if (is_sun_rotating) {
      sim_time += dt / 3;
    }
    prev_regl_time = frame.time;

    terrain_actors = generate_terrains(regl, resources, cam_look_at);

    mat4.perspective(
      mat_projection,
      deg_to_rad * 60, // fov y
      frame.framebufferWidth / frame.framebufferHeight, // aspect ratio
      0.01, // near
      100 // far
    );

    mat4.copy(mat_view, mat_world_to_cam);

    // Calculate light position in camera frame
    vec4.transformMat4(light_position_cam, light_position_world, mat_view);

    let sin_sim_time = (Math.sin(sim_time) + 1.0) / 2.0;
    let base_vect = vec3.rotateX([0, 0, 0], [0, 0, -5], [0, 0, 0], sim_time);
    let moving_light_position_cam = [
      base_vect[0],
      base_vect[1],
      base_vect[2],
      1,
    ];

    let sky_color = mix([0, 0.04, 0.12], [1, 1, 1], sin_sim_time); // mix([0, 0.04, 0.12], [0.74, 0.88, 0.97], sin_sim_time);

    regl.clear({ color: [sky_color[0], sky_color[1], sky_color[2], 1] });

    const scene_info = {
      mat_view: mat_view,
      mat_projection: mat_projection,
      light_position_cam: moving_light_position_cam,
      sky_color: sky_color,
    };

    for (let i = 0; i < terrain_actors.length; ++i) {
      terrain_actors[i].draw(scene_info);
    }

    // 		debug_text.textContent = `
    // Hello! Sim time is ${sim_time.toFixed(2)} s
    // Camera: angle_z ${(cam_angle_z / deg_to_rad).toFixed(1)}, angle_y ${(cam_angle_y / deg_to_rad).toFixed(1)}, distance ${(cam_distance_factor*cam_distance_base).toFixed(1)}
    // `
  });
}

DOM_loaded_promise.then(main);
