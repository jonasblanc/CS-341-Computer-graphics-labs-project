import { createREGL } from "../lib/regljs_2.1.0/regl.module.js";
import { vec3, vec4, mat4 } from "../lib/gl-matrix_3.3.0/esm/index.js";

import {
  DOM_loaded_promise,
  load_text,
  register_button_with_hotkey,
  register_keyboard_action,
} from "./icg_web.js";

import { deg_to_rad, mat4_matmul_many } from "./icg_math.js";

import { generate_terrains } from "./terrain_generation.js";

import { STARTING_LOCATION } from "./terrain_constants.js";

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
		Simulation variables
	---------------------------------------------------------------*/

  // Init in activate_preset_view
  let cam_look_at = [0, 0, 0];
  let cam_pos = [0, 0, 0];
  let sim_time = 0.0;
  let prev_regl_time = 0.0;
  let is_sun_rotating = true;

  /*---------------------------------------------------------------
		Camera
	---------------------------------------------------------------*/

  const DEFAULT_CAM_LOOK_AT = [0, 0.0, 0.0];
  const DEFAULT_CAM_POS = [1, 0.0, 0.4];
  const MIN_ZOOM = 0.4;
  const MAX_ZOOM = 0.52;

  const mat_world_to_cam = mat4.create();

  function update_cam_transform() {
    const look_at = mat4.lookAt(
      mat4.create(),
      cam_pos, // camera position in world coord
      cam_look_at, // view target point
      [0, 0, 1] // up vector
    );
    mat4_matmul_many(mat_world_to_cam, look_at);
  }

  update_cam_transform();

  /*---------------------------------------------------------------
		Mouvements
	---------------------------------------------------------------*/

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
  register_keyboard_action("p", () => {
    is_sun_rotating = !is_sun_rotating;
  });

  /*
  Complex, non-intuitive moves
  register_keyboard_action("i", () => {
    cam_pos[0] += 0.005;
    cam_pos[2] += 0.01;
    update_cam_transform();
  });
  register_keyboard_action("k", () => {
    cam_pos[0] -= 0.005;
    cam_pos[2] -= 0.01;
    update_cam_transform();
  });
  register_keyboard_action("j", () => {
    cam_pos[1] += 0.005;
    cam_pos[2] += 0.01;
    update_cam_transform();
  });
  register_keyboard_action("l", () => {
    cam_pos[1] -= 0.005;
    cam_pos[2] -= 0.01;
    update_cam_transform();
  });
*/

  window.addEventListener("wheel", (event) => {
    // scroll wheel to zoom in or out
    const factor = event.deltaY / 200;

    let tmp = cam_pos[2] + factor;
    if (tmp > MIN_ZOOM && tmp < MAX_ZOOM) {
      cam_pos[0] += 2 * factor;
      cam_pos[2] = tmp;
    }

    event.preventDefault(); // don't scroll the page too...
    update_cam_transform();
  });

  function activate_preset_view() {
    cam_look_at = vec3.add([0, 0, 0], DEFAULT_CAM_LOOK_AT, STARTING_LOCATION);
    cam_pos = vec3.add([0, 0, 0], DEFAULT_CAM_POS, STARTING_LOCATION);
    sim_time = 24.0;
    update_cam_transform();
  }

  activate_preset_view();
  register_button_with_hotkey("btn-preset-view", "c", activate_preset_view);

  // Prevent clicking and dragging from selecting the GUI text.
  canvas_elem.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  /*---------------------------------------------------------------
		Actors
	---------------------------------------------------------------*/

  var terrain_actors = generate_terrains(regl, resources, cam_look_at);

  /*---------------------------------------------------------------
		Frame render
	---------------------------------------------------------------*/
  function mix(color1, color2, mix_value) {
    let result = [];
    for (let i = 0; i < 3; ++i) {
      result.push(color1[i] * mix_value + (1 - mix_value) * color2[i]);
    }
    return result;
  }

  const mat_projection = mat4.create();
  const mat_view = mat4.create();

  regl.frame((frame) => {
    const dt = frame.time - prev_regl_time;
    if (is_sun_rotating) {
      sim_time += dt / 3;
    }
    prev_regl_time = frame.time;

    // Return the same mesh without recomputing it or a new if the location has changed
    terrain_actors = generate_terrains(regl, resources, cam_look_at);

    mat4.perspective(
      mat_projection,
      deg_to_rad * 60, // fov y
      frame.framebufferWidth / frame.framebufferHeight, // aspect ratio
      0.01, // near
      100 // far
    );

    mat4.copy(mat_view, mat_world_to_cam);

    // We directly compute the light position in the camera coordinates
    let base_vect = vec3.rotateX([0, 0, 0], [0, 0, -5], [0, 0, 0], sim_time);
    let moving_light_position_cam = [
      base_vect[0],
      base_vect[1],
      base_vect[2],
      1,
    ];

    let sin_sim_time = (Math.sin(sim_time) + 1.0) / 2.0;
    let sky_color = mix([0, 0.04, 0.22], [1, 1, 1], sin_sim_time);

    // Set the sky color
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
  });
}

DOM_loaded_promise.then(main);
