import { noise3D, normalComputation, ISO_VALUE } from "./noise.js";
import {
  vec3,
} from "../lib/gl-matrix_3.3.0/esm/index.js";

import {
  CHUNK_SIZE_X,
  CHUNK_SIZE_Y,
  CHUNK_SIZE_Z,
  NUMBER_CUBE_X,
  NUMBER_CUBE_Y,
  NUMBER_CUBE_Z,
} from "./terrain_constants.js";

// ============================ Definitions ============================ //
//  Our marching cube alogithm is based on this cube definition, and vertices order.
//  We call "vertices" the v0,..v7 and "drawingVertices" the e0,..e11 and
//  the index of the drawingVertices in a cube "drawingVertices"
//
//
//                 v7_______e6_____________v6
//                  /|                    /|
//                 / |                   / |
//              e7/  |                e5/  |
//               /___|______e4_________/   |
//            v4|    |                 |v5 |e10
//              |    |                 |   |
//              |    |e11              |e9 |
//            e8|    |                 |   |
//              |    |_________________|___|
//              |   / v3      e2       |   /v2
//   z x        |  /                   |  /
//   |/_ y      | /e3                  | /e1
//              |/_____________________|/
//              v0         e0          v1



// ============================ Marching cube algorithm ============================ //

/**
 * Create the chunk mesh for the corresponding chunk offset from a 3D noise function
 * @param {*} chunk_offset - 3D vector of the chunk offset 
 * @returns terrain chunk mesh of the form:
 * {
    vertex_positions: [],
    vertex_normals: [],
    faces: [],
  };
 */
export function terrain_build_mesh(chunk_offset) {
  
  const verticesNoiseValue = [];
  const drawingVertices = [];
  const drawingVerticesNormals = [];
  const faces = [];

  // Overlap with neighbouring chunks to cover all vertices and drawing vertices of the chunk
  for (let gx = 0; gx <= NUMBER_CUBE_X; gx++) {
    for (let gy = 0; gy <= NUMBER_CUBE_Y; gy++) {
      for (let gz = 0; gz <= NUMBER_CUBE_Z; gz++) {
        
        // Compute noise value at vertices coordinates
        const idx_vertex = xyz_to_cube_index(gx, gy, gz);
        verticesNoiseValue[idx_vertex] = noise3D(cubePositionToNoiseCoordinate(
          gx,
          gy,
          gz,
          chunk_offset
        ));
        
        // Fill drawingVertices and drawingVerticesNormals
        // The ones that will be used will be updated when the face using them is created
        const idx = 3 * idx_vertex;
        for (let i = 0; i < 3; i++) {
          drawingVertices[idx + i] = [0,0,0]
          drawingVerticesNormals[idx + i] = [0, 0, 0];
        }
      }
    }
  }

  // Compute faces, ajust drawing vertices position and normals
  for (let gx = 0; gx < NUMBER_CUBE_X; gx++) {
    for (let gy = 0; gy < NUMBER_CUBE_Y; gy++) {
      for (let gz = 0; gz < NUMBER_CUBE_Z; gz++) {
        const cubeVerticesNoiseValue = getCubeNoiseValues(
          gx,
          gy,
          gz,
          verticesNoiseValue
        );

        if (isOnSurface(cubeVerticesNoiseValue)) {
          const cubeDrawingVerticesIndex = getCubeDrawingVerticesIndex(gx, gy, gz);
          const cubeFaces = getFacesFromCubeVerticesNoiseValue(cubeVerticesNoiseValue);

          for (let face_idx = 0; face_idx < cubeFaces.length; ++face_idx) {
            const current_face = [];

            for (let faces_vertex_idx = 0; faces_vertex_idx < 3; ++faces_vertex_idx) {
              
              // Translate faces from [eX, eY, eZ] to drawingVertices index
              const eX = cubeFaces[face_idx][faces_vertex_idx];
              const drawingVertexIdx = cubeDrawingVerticesIndex[eX];
              current_face.push(drawingVertexIdx);

              // Compute position of the drawingVertex
              const drawingVertexPosition = interpolateDrawingVertexPosition(gx, gy, gz, eX, chunk_offset, cubeVerticesNoiseValue);
              drawingVertices[drawingVertexIdx] = drawingVertexPosition;
                            
              // Compute normal of the drawingVertex
              drawingVerticesNormals[drawingVertexIdx] = normalComputation(drawingVertexPosition, [
                1 / CHUNK_SIZE_X,
                1 / CHUNK_SIZE_Y,
                1 / CHUNK_SIZE_Z,
              ]);
            }
            faces.push(current_face);
          }
        }
      }
    }
  }

  return {
    vertex_positions: drawingVertices,
    vertex_normals: drawingVerticesNormals,
    faces: faces,
  };
}


// ============================ Helper functions ============================ //

/**
 * Compute if a cube is on the surface based on a list of boolean (true if the corner is in the object)
 * @param {*} cubeVerticesNoiseValue - 8D vector of boolean corresponding to v0,..v7
 * @returns true if the cube is on the surface 
 */
 function isOnSurface(cubeVerticesNoiseValue) {
  let atLeatOneCornerInObject = false;
  let allCornersInObject = true;
  for (let i = 0; i < cubeVerticesNoiseValue.length; ++i) {
    const isInObject = cubeVerticesNoiseValue[i] <= ISO_VALUE;
    atLeatOneCornerInObject |= isInObject;
    allCornersInObject &= isInObject;
  }
  return atLeatOneCornerInObject && !allCornersInObject;
}

/**
 * Compute the cubes faces based one the cube vertices noise value
 * @param {*} cubeVerticesNoiseValue 
 * @returns an array of faces
 */
 function getFacesFromCubeVerticesNoiseValue(cubeVerticesNoiseValue){
  // Compute table entry index
  let idx = 0;
  for (let i = cubeVerticesNoiseValue.length - 1; i >= 0; --i) {
    //maybe have to reverse traversal order
    idx *= 2;
    if (cubeVerticesNoiseValue[i] >= ISO_VALUE) {
      idx += 1;
    }
  }

  const LUTEntry = LOOK_UP_TABLE[idx];

  // Translate table entry into correct format
  let i = 0;
  let triangles = [];
  while (i < 16 && LUTEntry[i] != -1) {
    triangles.push([LUTEntry[i], LUTEntry[i + 1], LUTEntry[i + 2]]);
    i += 3;
  }
  return triangles
}

/**
 * Extract the noise value of cube vertices at position (x, y, z)
 * @param {*} x 
 * @param {*} y 
 * @param {*} z 
 * @param {*} verticesNoiseValue - array of vertices noise values
 * @returns 8D vector of noise values
 */
 function getCubeNoiseValues(x, y, z, verticesNoiseValue) {
  return [
    verticesNoiseValue[xyz_to_cube_index(x, y, z)],
    verticesNoiseValue[xyz_to_cube_index(x, y + 1, z)],
    verticesNoiseValue[xyz_to_cube_index(x + 1, y + 1, z)],
    verticesNoiseValue[xyz_to_cube_index(x + 1, y, z)],
    verticesNoiseValue[xyz_to_cube_index(x, y, z + 1)],
    verticesNoiseValue[xyz_to_cube_index(x, y + 1, z + 1)],
    verticesNoiseValue[xyz_to_cube_index(x + 1, y + 1, z + 1)],
    verticesNoiseValue[xyz_to_cube_index(x + 1, y, z + 1)],
  ];
}

 /**
 * Compute the drawingVertex position based on position and noise value of the adjacent vertices
 * @param {*} x 
 * @param {*} y 
 * @param {*} z 
 * @param {*} eX - index in cube of the drawingVertex
 * @param {*} chunk_offset - 3D vector of the chunk offset 
 * @param {*} cubeVerticesNoiseValue 
 * @returns 3D vector with the position of the drawingVertex
 */
function interpolateDrawingVertexPosition(x, y, z, eX, chunk_offset, cubeVerticesNoiseValue){
  // Compute index in the cube of the adjacent vertices of the drawing vertex eX
  let vertexIdxInCube = []
  switch (eX) {
    case 0:
      vertexIdxInCube = [0, 1];
      break;
    case 1:
      vertexIdxInCube = [1, 2];
      break;
    case 2:
      vertexIdxInCube = [2, 3];
      break;
    case 3:
      vertexIdxInCube = [3, 0];
      break;
    case 4:
      vertexIdxInCube = [4, 5];
      break;
    case 5:
      vertexIdxInCube = [5, 6];
      break;
    case 6:
      vertexIdxInCube = [6, 7];
      break;
    case 7:
      vertexIdxInCube = [7, 4];      
      break;
    case 8:
      vertexIdxInCube = [0, 4];
      break;
    case 9:
      vertexIdxInCube = [1, 5];
      break;
    case 10:
      vertexIdxInCube = [2, 6];
      break;
    case 11:
      vertexIdxInCube = [3, 7];
      break;
  }

  const shift = [
    [0, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [1, 0, 0],
    [0, 0, 1],
    [0, 1, 1],
    [1, 1, 1],
    [1, 0, 1],
  ];
  
  // Adjacent vertices coordinates
  const P1 = cubePositionToDrawingCoordinates(
    vec3.add([0, 0, 0], [x, y, z], shift[vertexIdxInCube[0]]), chunk_offset);
  const P2 = cubePositionToDrawingCoordinates(
    vec3.add([0, 0, 0], [x, y, z], shift[vertexIdxInCube[1]]), chunk_offset);
  
  // Adjacent vertices noise value
  const NV1 = cubeVerticesNoiseValue[vertexIdxInCube[0]];
  const NV2 = cubeVerticesNoiseValue[vertexIdxInCube[1]];
  const drawingVertexCoordinates = vec3.add(
    [0, 0, 0],
    P1,
    vec3.scale(
      [0, 0, 0],
      vec3.sub([0, 0, 0], P2, P1),
      (ISO_VALUE - NV1) / (NV2 - NV1)
    )
  );
  return drawingVertexCoordinates
}


// ============================ Index mapping ============================ //

/**
 * Map cube position in the chunk into a 1D index array.
 * @param {*} x 
 * @param {*} y 
 * @param {*} z 
 * @returns 1D index
 */
function xyz_to_cube_index(x, y, z) {
  return (
    x + y * (NUMBER_CUBE_X + 1) + z * (NUMBER_CUBE_X + 1) * (NUMBER_CUBE_Y + 1)
  );
}

/**
 *  Map cube position in the chunk and chunk offset into noise world coordinates
 * @param {*} x 
 * @param {*} y 
 * @param {*} z 
 * @param {*} chunk_offset - 3D vector of the chunk offset 
 * @returns 3D vector of the mapped coordinates 
 */
function cubePositionToNoiseCoordinate(x, y, z, chunk_offset) {
  const mapped_X = chunk_offset[0] + x / NUMBER_CUBE_X - 0.5;
  const mapped_Y = chunk_offset[1] + y / NUMBER_CUBE_Y - 0.5;
  const mapped_Z = chunk_offset[2] + z / NUMBER_CUBE_Z - 0.5;
  return [mapped_X, mapped_Y, mapped_Z];
}

/**
 * Map cube position in the chunk and chunk offset into drawing world coordinates
 * @param {*} xyz - 3D vector of cube coordinates
 * @param {*} chunk_offset - 3D vector of the chunk offset 
 * @returns 3D vector of the mapped coordinates 
 */
function cubePositionToDrawingCoordinates(xyz, chunk_offset) {
  const mapped_X =
    (chunk_offset[0] + xyz[0] / NUMBER_CUBE_X) * CHUNK_SIZE_X - 0.5;
  const mapped_Y =
    (chunk_offset[1] + xyz[1] / NUMBER_CUBE_Y) * CHUNK_SIZE_Y - 0.5;
  const mapped_Z =
    (chunk_offset[2] + xyz[2] / NUMBER_CUBE_Z) * CHUNK_SIZE_Z - 0.5;
  return [mapped_X, mapped_Y, mapped_Z];
}

/**
 * Compute indexes of the 12 drawing vertices of the cube at position (x, y, z) in "drawingVertices"
 * @param {*} x 
 * @param {*} y 
 * @param {*} z 
 * @returns 12 indexes in an array in order e0,..e11
 */
 function getCubeDrawingVerticesIndex(x, y, z) {
  function getCubeDrawingVertexIndex(x, y, z, eX) {
    switch (eX) {
      case 0:
        return 3 * xyz_to_cube_index(x, y, z) + 1;
      case 1:
        return 3 * xyz_to_cube_index(x, y + 1, z);
      case 2:
        return 3 * xyz_to_cube_index(x + 1, y, z) + 1;
      case 3:
        return 3 * xyz_to_cube_index(x, y, z);
      case 4:
        return 3 * xyz_to_cube_index(x, y, z + 1) + 1;
      case 5:
        return 3 * xyz_to_cube_index(x, y + 1, z + 1);
      case 6:
        return 3 * xyz_to_cube_index(x + 1, y, z + 1) + 1;
      case 7:
        return 3 * xyz_to_cube_index(x, y, z + 1);
      case 8:
        return 3 * xyz_to_cube_index(x, y, z) + 2;
      case 9:
        return 3 * xyz_to_cube_index(x, y + 1, z) + 2;
      case 10:
        return 3 * xyz_to_cube_index(x + 1, y + 1, z) + 2;
      case 11:
        return 3 * xyz_to_cube_index(x + 1, y, z) + 2;
    }
  }

  const drawingVerticesIndex = [];
  for (let i = 0; i < 12; ++i) {
    drawingVerticesIndex.push(getCubeDrawingVertexIndex(x, y, z, i));
  }
  return drawingVerticesIndex;
}


// Table staken from: http://paulbourke.net/geometry/polygonise/
const LOOK_UP_TABLE = [
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 1, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 8, 3, 9, 8, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 2, 10, 0, 2, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [2, 8, 3, 2, 10, 8, 10, 9, 8, -1, -1, -1, -1, -1, -1, -1],
  [3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 11, 2, 8, 11, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 9, 0, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 11, 2, 1, 9, 11, 9, 8, 11, -1, -1, -1, -1, -1, -1, -1],
  [3, 10, 1, 11, 10, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 10, 1, 0, 8, 10, 8, 11, 10, -1, -1, -1, -1, -1, -1, -1],
  [3, 9, 0, 3, 11, 9, 11, 10, 9, -1, -1, -1, -1, -1, -1, -1],
  [9, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 3, 0, 7, 3, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 1, 9, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 1, 9, 4, 7, 1, 7, 3, 1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [3, 4, 7, 3, 0, 4, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1],
  [9, 2, 10, 9, 0, 2, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
  [2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, -1, -1, -1, -1],
  [8, 4, 7, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [11, 4, 7, 11, 2, 4, 2, 0, 4, -1, -1, -1, -1, -1, -1, -1],
  [9, 0, 1, 8, 4, 7, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
  [4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1, -1, -1, -1, -1],
  [3, 10, 1, 3, 11, 10, 7, 8, 4, -1, -1, -1, -1, -1, -1, -1],
  [1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4, -1, -1, -1, -1],
  [4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3, -1, -1, -1, -1],
  [4, 7, 11, 4, 11, 9, 9, 11, 10, -1, -1, -1, -1, -1, -1, -1],
  [9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 5, 4, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 5, 4, 1, 5, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [8, 5, 4, 8, 3, 5, 3, 1, 5, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [3, 0, 8, 1, 2, 10, 4, 9, 5, -1, -1, -1, -1, -1, -1, -1],
  [5, 2, 10, 5, 4, 2, 4, 0, 2, -1, -1, -1, -1, -1, -1, -1],
  [2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, -1, -1, -1, -1],
  [9, 5, 4, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 11, 2, 0, 8, 11, 4, 9, 5, -1, -1, -1, -1, -1, -1, -1],
  [0, 5, 4, 0, 1, 5, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
  [2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, -1, -1, -1, -1],
  [10, 3, 11, 10, 1, 3, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1],
  [4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, -1, -1, -1, -1],
  [5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, -1, -1, -1, -1],
  [5, 4, 8, 5, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1],
  [9, 7, 8, 5, 7, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 3, 0, 9, 5, 3, 5, 7, 3, -1, -1, -1, -1, -1, -1, -1],
  [0, 7, 8, 0, 1, 7, 1, 5, 7, -1, -1, -1, -1, -1, -1, -1],
  [1, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 7, 8, 9, 5, 7, 10, 1, 2, -1, -1, -1, -1, -1, -1, -1],
  [10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, -1, -1, -1, -1],
  [8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, -1, -1, -1, -1],
  [2, 10, 5, 2, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1],
  [7, 9, 5, 7, 8, 9, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1],
  [9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, -1, -1, -1, -1],
  [2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, -1, -1, -1, -1],
  [11, 2, 1, 11, 1, 7, 7, 1, 5, -1, -1, -1, -1, -1, -1, -1],
  [9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, -1, -1, -1, -1],
  [5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, -1],
  [11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, -1],
  [11, 10, 5, 7, 11, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 0, 1, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 8, 3, 1, 9, 8, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1],
  [1, 6, 5, 2, 6, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 6, 5, 1, 2, 6, 3, 0, 8, -1, -1, -1, -1, -1, -1, -1],
  [9, 6, 5, 9, 0, 6, 0, 2, 6, -1, -1, -1, -1, -1, -1, -1],
  [5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, -1, -1, -1, -1],
  [2, 3, 11, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [11, 0, 8, 11, 2, 0, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1],
  [0, 1, 9, 2, 3, 11, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1],
  [5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, -1, -1, -1, -1],
  [6, 3, 11, 6, 5, 3, 5, 1, 3, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, -1, -1, -1, -1],
  [3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, -1, -1, -1, -1],
  [6, 5, 9, 6, 9, 11, 11, 9, 8, -1, -1, -1, -1, -1, -1, -1],
  [5, 10, 6, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 3, 0, 4, 7, 3, 6, 5, 10, -1, -1, -1, -1, -1, -1, -1],
  [1, 9, 0, 5, 10, 6, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
  [10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, -1, -1, -1, -1],
  [6, 1, 2, 6, 5, 1, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, -1, -1, -1, -1],
  [8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, -1, -1, -1, -1],
  [7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, -1],
  [3, 11, 2, 7, 8, 4, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1],
  [5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11, -1, -1, -1, -1],
  [0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6, -1, -1, -1, -1],
  [9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6, -1],
  [8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6, -1, -1, -1, -1],
  [5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11, -1],
  [0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7, -1],
  [6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9, -1, -1, -1, -1],
  [10, 4, 9, 6, 4, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 10, 6, 4, 9, 10, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1],
  [10, 0, 1, 10, 6, 0, 6, 4, 0, -1, -1, -1, -1, -1, -1, -1],
  [8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, -1, -1, -1, -1],
  [1, 4, 9, 1, 2, 4, 2, 6, 4, -1, -1, -1, -1, -1, -1, -1],
  [3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, -1, -1, -1, -1],
  [0, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [8, 3, 2, 8, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1],
  [10, 4, 9, 10, 6, 4, 11, 2, 3, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, -1, -1, -1, -1],
  [3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, -1, -1, -1, -1],
  [6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, -1],
  [9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, -1, -1, -1, -1],
  [8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, -1],
  [3, 11, 6, 3, 6, 0, 0, 6, 4, -1, -1, -1, -1, -1, -1, -1],
  [6, 4, 8, 11, 6, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [7, 10, 6, 7, 8, 10, 8, 9, 10, -1, -1, -1, -1, -1, -1, -1],
  [0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, -1, -1, -1, -1],
  [10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, -1, -1, -1, -1],
  [10, 6, 7, 10, 7, 1, 1, 7, 3, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, -1, -1, -1, -1],
  [2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, -1],
  [7, 8, 0, 7, 0, 6, 6, 0, 2, -1, -1, -1, -1, -1, -1, -1],
  [7, 3, 2, 6, 7, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7, -1, -1, -1, -1],
  [2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, -1],
  [1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, -1],
  [11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, -1, -1, -1, -1],
  [8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6, -1],
  [0, 9, 1, 11, 6, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0, -1, -1, -1, -1],
  [7, 11, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [7, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [3, 0, 8, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 1, 9, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [8, 1, 9, 8, 3, 1, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1],
  [10, 1, 2, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, 3, 0, 8, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1],
  [2, 9, 0, 2, 10, 9, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1],
  [6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8, -1, -1, -1, -1],
  [7, 2, 3, 6, 2, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [7, 0, 8, 7, 6, 0, 6, 2, 0, -1, -1, -1, -1, -1, -1, -1],
  [2, 7, 6, 2, 3, 7, 0, 1, 9, -1, -1, -1, -1, -1, -1, -1],
  [1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, -1, -1, -1, -1],
  [10, 7, 6, 10, 1, 7, 1, 3, 7, -1, -1, -1, -1, -1, -1, -1],
  [10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8, -1, -1, -1, -1],
  [0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, -1, -1, -1, -1],
  [7, 6, 10, 7, 10, 8, 8, 10, 9, -1, -1, -1, -1, -1, -1, -1],
  [6, 8, 4, 11, 8, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [3, 6, 11, 3, 0, 6, 0, 4, 6, -1, -1, -1, -1, -1, -1, -1],
  [8, 6, 11, 8, 4, 6, 9, 0, 1, -1, -1, -1, -1, -1, -1, -1],
  [9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6, -1, -1, -1, -1],
  [6, 8, 4, 6, 11, 8, 2, 10, 1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6, -1, -1, -1, -1],
  [4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9, -1, -1, -1, -1],
  [10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3, -1],
  [8, 2, 3, 8, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1, -1],
  [0, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8, -1, -1, -1, -1],
  [1, 9, 4, 1, 4, 2, 2, 4, 6, -1, -1, -1, -1, -1, -1, -1],
  [8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1, -1, -1, -1, -1],
  [10, 1, 0, 10, 0, 6, 6, 0, 4, -1, -1, -1, -1, -1, -1, -1],
  [4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3, -1],
  [10, 9, 4, 6, 10, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 9, 5, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, 4, 9, 5, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1],
  [5, 0, 1, 5, 4, 0, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1],
  [11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5, -1, -1, -1, -1],
  [9, 5, 4, 10, 1, 2, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1],
  [6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5, -1, -1, -1, -1],
  [7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2, -1, -1, -1, -1],
  [3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6, -1],
  [7, 2, 3, 7, 6, 2, 5, 4, 9, -1, -1, -1, -1, -1, -1, -1],
  [9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7, -1, -1, -1, -1],
  [3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0, -1, -1, -1, -1],
  [6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8, -1],
  [9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7, -1, -1, -1, -1],
  [1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4, -1],
  [4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10, -1],
  [7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, -1, -1, -1, -1],
  [6, 9, 5, 6, 11, 9, 11, 8, 9, -1, -1, -1, -1, -1, -1, -1],
  [3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5, -1, -1, -1, -1],
  [0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11, -1, -1, -1, -1],
  [6, 11, 3, 6, 3, 5, 5, 3, 1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6, -1, -1, -1, -1],
  [0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10, -1],
  [11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5, -1],
  [6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3, -1, -1, -1, -1],
  [5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, -1, -1, -1, -1],
  [9, 5, 6, 9, 6, 0, 0, 6, 2, -1, -1, -1, -1, -1, -1, -1],
  [1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8, -1],
  [1, 5, 6, 2, 1, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6, -1],
  [10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0, -1, -1, -1, -1],
  [0, 3, 8, 5, 6, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [10, 5, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [11, 5, 10, 7, 5, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [11, 5, 10, 11, 7, 5, 8, 3, 0, -1, -1, -1, -1, -1, -1, -1],
  [5, 11, 7, 5, 10, 11, 1, 9, 0, -1, -1, -1, -1, -1, -1, -1],
  [10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1, -1, -1, -1, -1],
  [11, 1, 2, 11, 7, 1, 7, 5, 1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11, -1, -1, -1, -1],
  [9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7, -1, -1, -1, -1],
  [7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2, -1],
  [2, 5, 10, 2, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1, -1],
  [8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5, -1, -1, -1, -1],
  [9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2, -1, -1, -1, -1],
  [9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2, -1],
  [1, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 7, 0, 7, 1, 1, 7, 5, -1, -1, -1, -1, -1, -1, -1],
  [9, 0, 3, 9, 3, 5, 5, 3, 7, -1, -1, -1, -1, -1, -1, -1],
  [9, 8, 7, 5, 9, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [5, 8, 4, 5, 10, 8, 10, 11, 8, -1, -1, -1, -1, -1, -1, -1],
  [5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0, -1, -1, -1, -1],
  [0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5, -1, -1, -1, -1],
  [10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4, -1],
  [2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8, -1, -1, -1, -1],
  [0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11, -1],
  [0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5, -1],
  [9, 4, 5, 2, 11, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4, -1, -1, -1, -1],
  [5, 10, 2, 5, 2, 4, 4, 2, 0, -1, -1, -1, -1, -1, -1, -1],
  [3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9, -1],
  [5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2, -1, -1, -1, -1],
  [8, 4, 5, 8, 5, 3, 3, 5, 1, -1, -1, -1, -1, -1, -1, -1],
  [0, 4, 5, 1, 0, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5, -1, -1, -1, -1],
  [9, 4, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 11, 7, 4, 9, 11, 9, 10, 11, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11, -1, -1, -1, -1],
  [1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11, -1, -1, -1, -1],
  [3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4, -1],
  [4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2, -1, -1, -1, -1],
  [9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3, -1],
  [11, 7, 4, 11, 4, 2, 2, 4, 0, -1, -1, -1, -1, -1, -1, -1],
  [11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, -1, -1, -1, -1],
  [2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9, -1, -1, -1, -1],
  [9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7, -1],
  [3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10, -1],
  [1, 10, 2, 8, 7, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 9, 1, 4, 1, 7, 7, 1, 3, -1, -1, -1, -1, -1, -1, -1],
  [4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1, -1, -1, -1, -1],
  [4, 0, 3, 7, 4, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 8, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 10, 8, 10, 11, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [3, 0, 9, 3, 9, 11, 11, 9, 10, -1, -1, -1, -1, -1, -1, -1],
  [0, 1, 10, 0, 10, 8, 8, 10, 11, -1, -1, -1, -1, -1, -1, -1],
  [3, 1, 10, 11, 3, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 11, 1, 11, 9, 9, 11, 8, -1, -1, -1, -1, -1, -1, -1],
  [3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9, -1, -1, -1, -1],
  [0, 2, 11, 8, 0, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [3, 2, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [2, 3, 8, 2, 8, 10, 10, 8, 9, -1, -1, -1, -1, -1, -1, -1],
  [9, 10, 2, 0, 9, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8, -1, -1, -1, -1],
  [1, 10, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 3, 8, 9, 1, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 9, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 3, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
];
