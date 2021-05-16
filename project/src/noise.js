export { noise3D };

/**
 * Coordinates recieved are in real world coordinates (ie between -0.5 and 0.5 for the central chunk)
 * @param {*} x
 * @param {*} y
 * @param {*} z
 * @returns
 */
function noise3D(xyz) {
  //return plan3D(xyz[0],xyz[1], xyz[2);
  //return sin2D(xyz[0],xyz[1], xyz[2);
  return sin1D(xyz[0], xyz[1], xyz[2]);

  //return sphere3D(x, y, z);
}

function plan3D(x, y, z) {
  if (z < 0) {
    return 1;
  }
  return 0;
}

function sphere3D(x, y, z) {
  if (x * x + y * y + z * z < 0.1) {
    return 1;
  }
  return 0;
}

function sin2D(x, y, z) {
  if (z < -0.3) {
    return 1;
  } else {
    if (z < (Math.sin(2 * x) + Math.sin(2 * y)) / 5 - 0.1) {
      return 1;
    } else {
      return 0;
    }
  }
}

function sin1D(x, y, z) {
  if (z < -0.1) {
    return 1;
  } else {
    if (z < Math.sin(2 * x) / 3 - 0.1) {
      return 1;
    } else {
      return 0;
    }
  }
}
