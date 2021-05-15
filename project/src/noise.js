export { noise3D };

/**
 * Coordinates recieved are in real world coordinates (ie between -0.5 and 0.5 for the central chunk)
 * @param {*} x
 * @param {*} y
 * @param {*} z
 * @returns
 */
function noise3D(x, y, z) {
  return plan3D(x, y, z);
  //return sphere3D(x, y, z);
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
