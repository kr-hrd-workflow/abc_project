#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const publicRoot = path.join(repoRoot, "apps", "web", "public");
const assetsRoot = path.join(publicRoot, "simulation", "r3f", "assets");
const manifestPath = path.join(assetsRoot, "manifest.json");

const requiredFields = [
  "id",
  "path",
  "kind",
  "source",
  "license",
  "units",
  "pbr",
  "lod",
  "maxTextureSize",
  "maxTriangles",
  "maxFileSizeBytes"
];
const allowedKinds = new Set(["vehicle", "prop", "texture", "decal"]);
const allowedLods = new Set(["hero", "near", "medium", "far", "material", "decal"]);
const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const bannedNameTerms = [
  "toy",
  "blockout",
  "proxy",
  "placeholder",
  "primitive-only",
  "temp",
  "test-asset"
];
const proofArtifactPaths = [
  "artifacts/r3f-stage4.1-asset-realism-contact-sheet.png",
  "artifacts/r3f-stage4.1-glb-turntable-contact-sheet.png"
];
const firstPassPayloadLimitBytes = 25 * 1024 * 1024;
const nearVehicleTriangleFloor = 600;
const lodRank = new Map([
  ["hero", 0],
  ["near", 1],
  ["medium", 2],
  ["far", 3]
]);

const failures = [];
const assetMetricsById = new Map();
const countedPayloadPaths = new Set();
let firstPassPayloadBytes = 0;

function addFailure(message) {
  failures.push(message);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isPowerOfTwo(value) {
  return value > 0 && (value & (value - 1)) === 0;
}

function toAssetLocalPath(assetPath) {
  const normalizedPath = assetPath.replace(/\\/g, "/");
  const relativePath = normalizedPath.startsWith("/")
    ? normalizedPath.slice(1)
    : normalizedPath;

  return path.resolve(publicRoot, relativePath);
}

function isInsideDirectory(childPath, parentPath) {
  const relativePath = path.relative(parentPath, childPath);

  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function normalizeNameText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function findBannedNameTerm(value) {
  const normalizedValue = normalizeNameText(value);

  return bannedNameTerms.find((term) => normalizedValue.includes(term));
}

function formatBytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function readPngDimensions(buffer) {
  const pngSignature = "89504e470d0a1a0a";

  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error("invalid PNG header");
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function readJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error("invalid JPEG header");
  }

  let offset = 2;
  const startOfFrameMarkers = new Set([
    0xc0,
    0xc1,
    0xc2,
    0xc3,
    0xc5,
    0xc6,
    0xc7,
    0xc9,
    0xca,
    0xcb,
    0xcd,
    0xce,
    0xcf
  ]);

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (buffer[offset] === 0xff) {
      offset += 1;
    }

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      continue;
    }

    if (offset + 2 > buffer.length) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset);

    if (segmentLength < 2) {
      throw new Error("invalid JPEG segment length");
    }

    if (startOfFrameMarkers.has(marker)) {
      if (offset + 7 > buffer.length) {
        throw new Error("truncated JPEG SOF segment");
      }

      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3)
      };
    }

    offset += segmentLength;
  }

  throw new Error("JPEG dimensions not found");
}

function readWebpDimensions(buffer) {
  if (
    buffer.length < 30 ||
    buffer.subarray(0, 4).toString("ascii") !== "RIFF" ||
    buffer.subarray(8, 12).toString("ascii") !== "WEBP"
  ) {
    throw new Error("invalid WebP header");
  }

  const chunkType = buffer.subarray(12, 16).toString("ascii");

  if (chunkType === "VP8X") {
    return {
      width: readUInt24LE(buffer, 24) + 1,
      height: readUInt24LE(buffer, 27) + 1
    };
  }

  if (chunkType === "VP8L") {
    if (buffer.length < 25 || buffer[20] !== 0x2f) {
      throw new Error("invalid WebP lossless header");
    }

    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];

    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))
    };
  }

  if (chunkType === "VP8 ") {
    const startCode = Buffer.from([0x9d, 0x01, 0x2a]);
    const startOffset = buffer.indexOf(startCode, 16);

    if (startOffset === -1 || startOffset + 7 > buffer.length) {
      throw new Error("invalid WebP lossy frame header");
    }

    return {
      width: buffer.readUInt16LE(startOffset + 3) & 0x3fff,
      height: buffer.readUInt16LE(startOffset + 5) & 0x3fff
    };
  }

  throw new Error(`unsupported WebP chunk ${chunkType}`);
}

async function readImageDimensions(localPath, extension) {
  const buffer = await readFile(localPath);

  if (extension === ".png") {
    return readPngDimensions(buffer);
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return readJpegDimensions(buffer);
  }

  if (extension === ".webp") {
    return readWebpDimensions(buffer);
  }

  throw new Error(`unsupported image extension ${extension}`);
}

function readImageDimensionsFromBuffer(buffer, mimeType) {
  if (mimeType === "image/png") {
    return readPngDimensions(buffer);
  }

  if (mimeType === "image/jpeg") {
    return readJpegDimensions(buffer);
  }

  if (mimeType === "image/webp") {
    return readWebpDimensions(buffer);
  }

  throw new Error(`unsupported embedded image mime type ${mimeType ?? "unknown"}`);
}

function readGlbChunks(buffer) {
  if (buffer.length < 12 || buffer.subarray(0, 4).toString("ascii") !== "glTF") {
    throw new Error("GLB header is missing glTF magic");
  }

  const version = buffer.readUInt32LE(4);
  const declaredLength = buffer.readUInt32LE(8);

  if (version !== 2) {
    throw new Error(`GLB version must be 2, received ${version}`);
  }

  if (declaredLength !== buffer.length) {
    throw new Error(
      `GLB declared length ${declaredLength} does not match file size ${buffer.length}`
    );
  }

  let offset = 12;
  let jsonChunk = null;
  let binaryChunk = null;

  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;

    if (chunkEnd > buffer.length) {
      throw new Error("GLB chunk length exceeds file size");
    }

    if (chunkType === 0x4e4f534a) {
      jsonChunk = buffer.subarray(chunkStart, chunkEnd);
    } else if (chunkType === 0x004e4942) {
      binaryChunk = buffer.subarray(chunkStart, chunkEnd);
    }

    offset = chunkEnd;
  }

  if (!jsonChunk) {
    throw new Error("GLB JSON chunk is missing");
  }

  return {
    json: JSON.parse(jsonChunk.toString("utf8").trim()),
    binaryChunk
  };
}

function getAccessorCount(gltf, accessorIndex) {
  const accessor = gltf.accessors?.[accessorIndex];

  return Number.isInteger(accessor?.count) ? accessor.count : null;
}

function countGlbTriangles(gltf) {
  let triangles = 0;

  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const mode = primitive.mode ?? 4;

      if (mode !== 4) {
        continue;
      }

      if (Number.isInteger(primitive.indices)) {
        const indexCount = getAccessorCount(gltf, primitive.indices);

        if (indexCount !== null) {
          triangles += Math.floor(indexCount / 3);
        }

        continue;
      }

      const positionAccessorIndex = primitive.attributes?.POSITION;

      if (Number.isInteger(positionAccessorIndex)) {
        const vertexCount = getAccessorCount(gltf, positionAccessorIndex);

        if (vertexCount !== null) {
          triangles += Math.floor(vertexCount / 3);
        }
      }
    }
  }

  return triangles;
}

function getNamedGltfParts(gltf) {
  const nodeNames = (gltf.nodes ?? []).map((node) => node.name).filter(hasText);
  const meshNames = (gltf.meshes ?? []).map((mesh) => mesh.name).filter(hasText);
  const materialNames = (gltf.materials ?? [])
    .map((material) => material.name)
    .filter(hasText);

  return {
    nodeNames,
    meshNames,
    materialNames,
    allNames: [...nodeNames, ...meshNames, ...materialNames]
  };
}

function getBufferViewBytes(gltf, binaryChunk, bufferViewIndex) {
  const bufferView = gltf.bufferViews?.[bufferViewIndex];

  if (!bufferView || !binaryChunk) {
    return null;
  }

  const byteOffset = bufferView.byteOffset ?? 0;
  const byteLength = bufferView.byteLength;

  if (!Number.isInteger(byteOffset) || !Number.isInteger(byteLength)) {
    return null;
  }

  return binaryChunk.subarray(byteOffset, byteOffset + byteLength);
}

function verifyEmbeddedGlbTextures(assetId, entry, gltf, binaryChunk) {
  for (const [imageIndex, image] of (gltf.images ?? []).entries()) {
    if (!Number.isInteger(image.bufferView)) {
      continue;
    }

    const imageBytes = getBufferViewBytes(gltf, binaryChunk, image.bufferView);

    if (!imageBytes) {
      addFailure(`${assetId}: GLB embedded image ${imageIndex} bufferView is invalid`);
      continue;
    }

    let dimensions;

    try {
      dimensions = readImageDimensionsFromBuffer(imageBytes, image.mimeType);
    } catch (error) {
      addFailure(
        `${assetId}: could not read GLB embedded image ${imageIndex} dimensions (${error.message})`
      );
      continue;
    }

    if (dimensions.width > entry.maxTextureSize || dimensions.height > entry.maxTextureSize) {
      addFailure(
        `${assetId}: GLB embedded image ${imageIndex} dimensions ${dimensions.width}x${dimensions.height} exceed maxTextureSize ${entry.maxTextureSize}`
      );
    }

    const isPowerOfTwoTexture =
      isPowerOfTwo(dimensions.width) && isPowerOfTwo(dimensions.height);

    if (!isPowerOfTwoTexture && entry.allowNonPowerOfTwo !== true) {
      addFailure(
        `${assetId}: GLB embedded image ${imageIndex} dimensions ${dimensions.width}x${dimensions.height} are not power-of-two`
      );
    }
  }
}

async function verifyGlb(assetId, entry, localPath, fileStat) {
  if (!isPositiveInteger(entry.maxFileSizeBytes)) {
    addFailure(`${assetId}: maxFileSizeBytes must be a positive integer`);
  } else if (fileStat.size > entry.maxFileSizeBytes) {
    addFailure(
      `${assetId}: GLB size ${fileStat.size} bytes exceeds ${entry.maxFileSizeBytes} byte budget`
    );
  }

  if (!isPositiveInteger(entry.maxTriangles)) {
    addFailure(`${assetId}: GLB maxTriangles must be a positive integer`);
  }

  let glb;

  try {
    glb = readGlbChunks(await readFile(localPath));
  } catch (error) {
    addFailure(`${assetId}: ${error.message}`);
    return;
  }

  const triangleCount = countGlbTriangles(glb.json);
  const namedParts = getNamedGltfParts(glb.json);

  if (triangleCount > entry.maxTriangles) {
    addFailure(
      `${assetId}: GLB triangle count ${triangleCount} exceeds ${entry.maxTriangles} triangle budget`
    );
  }

  for (const name of [...namedParts.nodeNames, ...namedParts.materialNames]) {
    const bannedTerm = findBannedNameTerm(name);

    if (bannedTerm) {
      addFailure(
        `${assetId}: GLB node/material name "${name}" contains banned Stage 4.1 term "${bannedTerm}"`
      );
    }
  }

  assetMetricsById.set(assetId, {
    type: "glb",
    fileSizeBytes: fileStat.size,
    triangleCount,
    nameText: normalizeNameText(namedParts.allNames.join(" "))
  });

  verifyEmbeddedGlbTextures(assetId, entry, glb.json, glb.binaryChunk);
}

async function verifyImage(assetId, entry, localPath, extension, fileStat) {
  if (!isPositiveInteger(entry.maxFileSizeBytes)) {
    addFailure(`${assetId}: maxFileSizeBytes must be a positive integer`);
  } else if (fileStat.size > entry.maxFileSizeBytes) {
    addFailure(
      `${assetId}: image size ${fileStat.size} bytes exceeds ${entry.maxFileSizeBytes} byte budget`
    );
  }

  let dimensions;

  try {
    dimensions = await readImageDimensions(localPath, extension);
  } catch (error) {
    addFailure(`${assetId}: could not read image dimensions (${error.message})`);
    return;
  }

  if (!isPositiveInteger(dimensions.width) || !isPositiveInteger(dimensions.height)) {
    addFailure(`${assetId}: image dimensions must be positive`);
    return;
  }

  if (dimensions.width > entry.maxTextureSize || dimensions.height > entry.maxTextureSize) {
    addFailure(
      `${assetId}: image dimensions ${dimensions.width}x${dimensions.height} exceed maxTextureSize ${entry.maxTextureSize}`
    );
  }

  const isPowerOfTwoTexture =
    isPowerOfTwo(dimensions.width) && isPowerOfTwo(dimensions.height);

  if (!isPowerOfTwoTexture && entry.allowNonPowerOfTwo !== true) {
    addFailure(
      `${assetId}: image dimensions ${dimensions.width}x${dimensions.height} are not power-of-two`
    );
  }

  if (entry.allowNonPowerOfTwo === true && !hasText(entry.nonPowerOfTwoReason)) {
    addFailure(`${assetId}: non-power-of-two exception requires nonPowerOfTwoReason`);
  }

  assetMetricsById.set(assetId, {
    type: "image",
    fileSizeBytes: fileStat.size,
    dimensions
  });
}

function validateEntryShape(assetId, entry) {
  if (!isRecord(entry)) {
    addFailure(`${assetId}: manifest entry must be an object`);
    return;
  }

  for (const field of requiredFields) {
    if (!(field in entry)) {
      addFailure(`${assetId}: missing required field "${field}"`);
    }
  }

  if (entry.id !== assetId) {
    addFailure(`${assetId}: id field must match manifest key`);
  }

  if (!hasText(entry.path)) {
    addFailure(`${assetId}: path must be a non-empty string`);
  } else {
    const normalizedPath = entry.path.replace(/\\/g, "/");

    if (!normalizedPath.startsWith("/simulation/r3f/assets/")) {
      addFailure(`${assetId}: path must stay under /simulation/r3f/assets/`);
    }

    if (normalizedPath.toLowerCase().includes("archive/unreal/original")) {
      addFailure(`${assetId}: path must not point into archive/unreal/original`);
    }

    const bannedTerm = findBannedNameTerm(`${assetId} ${normalizedPath}`);

    if (bannedTerm) {
      addFailure(`${assetId}: id or path contains banned Stage 4.1 term "${bannedTerm}"`);
    }
  }

  if (!allowedKinds.has(entry.kind)) {
    addFailure(`${assetId}: kind must be one of ${Array.from(allowedKinds).join(", ")}`);
  }

  if (!allowedLods.has(entry.lod)) {
    addFailure(`${assetId}: lod must be one of ${Array.from(allowedLods).join(", ")}`);
  }

  if (!hasText(entry.source)) {
    addFailure(`${assetId}: source is required`);
  }

  if (!hasText(entry.license)) {
    addFailure(`${assetId}: license is required`);
  }

  if (entry.units !== "meters") {
    addFailure(`${assetId}: units must be "meters"`);
  }

  if (typeof entry.pbr !== "boolean") {
    addFailure(`${assetId}: pbr must be boolean`);
  }

  if ((entry.lod === "near" || entry.lod === "hero") && entry.pbr !== true) {
    addFailure(`${assetId}: near/hero assets must declare pbr=true`);
  }

  if (!isPositiveInteger(entry.maxTextureSize)) {
    addFailure(`${assetId}: maxTextureSize must be a positive integer`);
  }

  if (!isNonNegativeInteger(entry.maxTriangles)) {
    addFailure(`${assetId}: maxTriangles must be a non-negative integer`);
  }

  if (!isPositiveInteger(entry.maxFileSizeBytes)) {
    addFailure(`${assetId}: maxFileSizeBytes must be a positive integer`);
  }

  if (entry.allowNonPowerOfTwo !== undefined && typeof entry.allowNonPowerOfTwo !== "boolean") {
    addFailure(`${assetId}: allowNonPowerOfTwo must be boolean when present`);
  }

  validateStageRealismMetadata(assetId, entry);
}

function validateVehicleLods(entriesById) {
  const vehicles = Array.from(entriesById.entries()).filter(
    ([, entry]) => isRecord(entry) && entry.kind === "vehicle"
  );
  const groups = new Map();

  for (const [assetId, entry] of vehicles) {
    if (!hasText(entry.lodGroup)) {
      addFailure(`${assetId}: vehicle assets must declare lodGroup`);
      continue;
    }

    const existingGroup = groups.get(entry.lodGroup) ?? [];
    existingGroup.push([assetId, entry]);
    groups.set(entry.lodGroup, existingGroup);

    if ((entry.lod === "near" || entry.lod === "hero") && !hasText(entry.lowerDetailId)) {
      addFailure(`${assetId}: near/hero vehicle assets must declare lowerDetailId`);
    }

    if (hasText(entry.lowerDetailId)) {
      const lowerEntry = entriesById.get(entry.lowerDetailId);

      if (!lowerEntry) {
        addFailure(`${assetId}: lowerDetailId ${entry.lowerDetailId} does not exist`);
        continue;
      }

      if (lowerEntry.kind !== "vehicle") {
        addFailure(`${assetId}: lowerDetailId ${entry.lowerDetailId} is not a vehicle`);
      }

      if (lowerEntry.lodGroup !== entry.lodGroup) {
        addFailure(`${assetId}: lowerDetailId ${entry.lowerDetailId} must share lodGroup`);
      }

      const entryRank = lodRank.get(entry.lod);
      const lowerRank = lodRank.get(lowerEntry.lod);

      if (entryRank === undefined || lowerRank === undefined || lowerRank <= entryRank) {
        addFailure(`${assetId}: lowerDetailId ${entry.lowerDetailId} must use a lower-detail lod`);
      }

      if (
        isPositiveInteger(entry.maxTriangles) &&
        isPositiveInteger(lowerEntry.maxTriangles) &&
        lowerEntry.maxTriangles >= entry.maxTriangles
      ) {
        addFailure(`${assetId}: lowerDetailId ${entry.lowerDetailId} must have fewer triangles`);
      }
    }
  }

  for (const [groupId, groupEntries] of groups) {
    const lowerOptions = groupEntries.filter(([, entry]) =>
      ["medium", "far"].includes(entry.lod)
    );

    if (lowerOptions.length === 0) {
      addFailure(`${groupId}: vehicle lodGroup is missing a lower-detail option`);
    }
  }
}

function requireMinimumDetail(assetId, details, field, minimum) {
  if (!Number.isFinite(details[field]) || details[field] < minimum) {
    addFailure(`${assetId}: details.${field} must be >= ${minimum}`);
  }
}

function metadataContains(details, pattern) {
  return pattern.test(JSON.stringify(details).toLowerCase());
}

function validateStageRealismMetadata(assetId, entry) {
  if (!isRecord(entry)) {
    return;
  }

  if (entry.realismStatus !== "stage4_1_ready") {
    addFailure(`${assetId}: realismStatus must be "stage4_1_ready"`);
  }

  if (entry.visualRejectIfToyLike !== true) {
    addFailure(`${assetId}: visualRejectIfToyLike must be true`);
  }

  const details = entry.details;

  if (entry.kind === "vehicle" && ["near", "medium", "far"].includes(entry.lod)) {
    if (entry.realisticSilhouette !== true) {
      addFailure(`${assetId}: vehicle ${entry.lod} LOD must declare realisticSilhouette=true`);
    }

    if (!isRecord(details)) {
      addFailure(`${assetId}: vehicle ${entry.lod} LOD must include details metadata`);
      return;
    }

    requireMinimumDetail(assetId, details, "wheels", entry.lod === "near" ? 4 : 1);
    requireMinimumDetail(assetId, details, "glassSurfaces", 1);
    requireMinimumDetail(assetId, details, "lightEmitters", entry.lod === "near" ? 2 : 1);
    requireMinimumDetail(assetId, details, "bodyPanelBreaks", entry.lod === "near" ? 3 : 1);

    if (typeof details.mirrors !== "boolean") {
      addFailure(`${assetId}: details.mirrors must be boolean for vehicle LODs`);
    } else if (entry.lod === "near" && details.mirrors !== true) {
      addFailure(`${assetId}: near vehicle LODs must declare details.mirrors=true`);
    } else if (entry.lod !== "near" && details.mirrors === false && !hasText(details.mirrorReason)) {
      addFailure(`${assetId}: non-near vehicle LODs without mirrors require details.mirrorReason`);
    }

    if (entry.lod === "far") {
      const farMetadataChecks = [
        ["wheel", /wheel|tire/],
        ["glass", /glass|window|windshield/],
        ["light", /light|headlight|taillight|emitter|lightbar/]
      ];

      for (const [label, pattern] of farMetadataChecks) {
        if (!metadataContains(details, pattern)) {
          addFailure(`${assetId}: far vehicle LOD metadata must preserve ${label} blocks`);
        }
      }
    }
  }

  if (entry.kind === "prop") {
    if (!isRecord(details)) {
      addFailure(`${assetId}: prop assets must include details metadata`);
      return;
    }

    if (!isRecord(details.scaleReferenceMeters) || Object.keys(details.scaleReferenceMeters).length === 0) {
      addFailure(`${assetId}: prop details.scaleReferenceMeters is required`);
    }

    if (!hasNonEmptyArray(details.functionalParts)) {
      addFailure(`${assetId}: prop details.functionalParts must be a non-empty array`);
    }
  }

  if (entry.kind === "texture" || entry.kind === "decal") {
    if (!isRecord(details)) {
      addFailure(`${assetId}: ${entry.kind} assets must include details metadata`);
      return;
    }

    if (!hasNonEmptyArray(details.materialFeatures) && !hasNonEmptyArray(details.decalFeatures)) {
      addFailure(`${assetId}: ${entry.kind} details must include materialFeatures or decalFeatures`);
    }

    if (!hasText(details.provenance)) {
      addFailure(`${assetId}: ${entry.kind} details.provenance is required`);
    }
  }
}

function requireNameEvidence(assetId, metric, label, pattern) {
  if (!pattern.test(metric.nameText)) {
    addFailure(`${assetId}: GLB names lack ${label} evidence required by Stage 4.1 metadata`);
  }
}

function validateVehicleNameEvidence(assetId, entry, metric) {
  if (!metric || metric.type !== "glb" || entry.kind !== "vehicle" || !isRecord(entry.details)) {
    return;
  }

  const details = entry.details;

  if (details.wheels > 0) {
    requireNameEvidence(assetId, metric, "wheel/tire", /wheel|tire/);
  }

  if (details.wheels > 0 && entry.lod === "near") {
    requireNameEvidence(assetId, metric, "hub", /hub/);
  }

  if (details.glassSurfaces > 0) {
    requireNameEvidence(assetId, metric, "glass/window", /glass|window|windshield/);
  }

  if (details.lightEmitters > 0) {
    requireNameEvidence(assetId, metric, "light/emitter", /light|headlight|taillight|emitter|lightbar/);
  }

  if (details.bodyPanelBreaks > 0) {
    requireNameEvidence(assetId, metric, "body panel/break", /body|panel|break|seam|door|hood|trunk|cab|cargo/);
  }

  if (details.mirrors === true) {
    requireNameEvidence(assetId, metric, "mirror", /mirror/);
  }

  if (entry.lod === "near") {
    if (metric.triangleCount < nearVehicleTriangleFloor) {
      addFailure(
        `${assetId}: near vehicle triangle count ${metric.triangleCount} is below realism floor ${nearVehicleTriangleFloor}`
      );
    }

    requireNameEvidence(assetId, metric, "front cue", /front|grille|headlight|hood|windshield/);
    requireNameEvidence(assetId, metric, "rear cue", /rear|taillight|trunk|deck|cargo/);
  }
}

function validateActualVehicleLodTriangles(entriesById) {
  const groups = new Map();

  for (const [assetId, entry] of entriesById) {
    if (!isRecord(entry) || entry.kind !== "vehicle" || !hasText(entry.lodGroup)) {
      continue;
    }

    const groupEntries = groups.get(entry.lodGroup) ?? [];
    groupEntries.push([assetId, entry]);
    groups.set(entry.lodGroup, groupEntries);
  }

  for (const [, groupEntries] of groups) {
    const farEntries = groupEntries.filter(([, entry]) => entry.lod === "far");
    const sourceEntries = groupEntries.filter(([, entry]) => ["near", "medium"].includes(entry.lod));

    for (const [farAssetId] of farEntries) {
      const farMetric = assetMetricsById.get(farAssetId);

      if (!farMetric || farMetric.type !== "glb") {
        continue;
      }

      for (const [sourceAssetId] of sourceEntries) {
        const sourceMetric = assetMetricsById.get(sourceAssetId);

        if (!sourceMetric || sourceMetric.type !== "glb") {
          continue;
        }

        if (farMetric.triangleCount >= sourceMetric.triangleCount) {
          addFailure(
            `${farAssetId}: far LOD triangle count ${farMetric.triangleCount} must be below ${sourceAssetId} triangle count ${sourceMetric.triangleCount}`
          );
        }
      }
    }
  }
}

function validateStageRealismEvidence(entriesById) {
  for (const [assetId, entry] of entriesById) {
    validateVehicleNameEvidence(assetId, entry, assetMetricsById.get(assetId));
  }
}

function validatePayloadBudget() {
  if (firstPassPayloadBytes >= firstPassPayloadLimitBytes) {
    addFailure(
      `first-pass GLB + texture payload ${formatBytes(firstPassPayloadBytes)} must stay below ${formatBytes(firstPassPayloadLimitBytes)}`
    );
  }
}

async function verifyProofArtifacts() {
  for (const artifactPath of proofArtifactPaths) {
    const localPath = path.join(repoRoot, artifactPath);
    let fileStat;

    try {
      fileStat = await stat(localPath);
    } catch {
      addFailure(`${artifactPath}: missing Stage 4.1 proof artifact`);
      continue;
    }

    if (!fileStat.isFile()) {
      addFailure(`${artifactPath}: Stage 4.1 proof artifact path is not a file`);
      continue;
    }

    let dimensions;

    try {
      dimensions = readPngDimensions(await readFile(localPath));
    } catch (error) {
      addFailure(`${artifactPath}: proof artifact must be a valid PNG (${error.message})`);
      continue;
    }

    if (!isPositiveInteger(dimensions.width) || !isPositiveInteger(dimensions.height)) {
      addFailure(`${artifactPath}: proof artifact dimensions must be positive`);
    }
  }
}

async function verifyConcreteAsset(assetId, entry) {
  if (!hasText(entry.path)) {
    return;
  }

  const localPath = toAssetLocalPath(entry.path);

  if (!isInsideDirectory(localPath, assetsRoot)) {
    addFailure(`${assetId}: resolved path escapes the R3F assets directory`);
    return;
  }

  let fileStat;

  try {
    fileStat = await stat(localPath);
  } catch {
    addFailure(`${assetId}: missing asset file at ${entry.path}`);
    return;
  }

  if (!fileStat.isFile()) {
    addFailure(`${assetId}: asset path is not a file`);
    return;
  }

  const extension = path.extname(localPath).toLowerCase();

  if (extension === ".glb" || imageExtensions.has(extension)) {
    const resolvedPayloadPath = path.resolve(localPath);

    if (!countedPayloadPaths.has(resolvedPayloadPath)) {
      countedPayloadPaths.add(resolvedPayloadPath);
      firstPassPayloadBytes += fileStat.size;
    }
  }

  if (extension === ".glb") {
    await verifyGlb(assetId, entry, localPath, fileStat);
    return;
  }

  if (imageExtensions.has(extension)) {
    await verifyImage(assetId, entry, localPath, extension, fileStat);
    return;
  }

  addFailure(`${assetId}: unsupported asset file extension ${extension}`);
}

async function readManifest() {
  let rawManifest;

  try {
    rawManifest = await readFile(manifestPath, "utf8");
  } catch (error) {
    addFailure(`manifest: could not read ${manifestPath} (${error.message})`);
    return null;
  }

  try {
    return JSON.parse(rawManifest);
  } catch (error) {
    addFailure(`manifest: invalid JSON (${error.message})`);
    return null;
  }
}

async function main() {
  const manifest = await readManifest();

  if (!manifest) {
    return;
  }

  if (!isRecord(manifest)) {
    addFailure("manifest: root must be a JSON object keyed by stable asset IDs");
    return;
  }

  const entries = Object.entries(manifest);

  if (entries.length === 0) {
    addFailure("manifest: must contain at least one asset entry");
    return;
  }

  const entriesById = new Map(entries);

  for (const [assetId, entry] of entriesById) {
    validateEntryShape(assetId, entry);
  }

  validateVehicleLods(entriesById);

  for (const [assetId, entry] of entriesById) {
    if (isRecord(entry)) {
      await verifyConcreteAsset(assetId, entry);
    }
  }

  validateActualVehicleLodTriangles(entriesById);
  validateStageRealismEvidence(entriesById);
  validatePayloadBudget();
  await verifyProofArtifacts();
}

await main();

if (failures.length > 0) {
  console.error("R3F asset verification failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  if (countedPayloadPaths.size > 0) {
    console.error(
      `First-pass GLB + texture payload: ${formatBytes(firstPassPayloadBytes)} / ${formatBytes(firstPassPayloadLimitBytes)}.`
    );
  }

  process.exitCode = 1;
} else {
  console.log(
    `R3F asset verification passed. First-pass GLB + texture payload: ${formatBytes(firstPassPayloadBytes)} / ${formatBytes(firstPassPayloadLimitBytes)}.`
  );
}
