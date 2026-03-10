import * as THREE from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";

export interface STLAnalysis {
  volume: number;
  volumeCm3: number;
  weight: number;
  dimensions: { x: number; y: number; z: number };
  triangleCount: number;
  estimatedTime: number;
  estimatedCost: number;
}

export interface STLParseResult {
  geometry: THREE.BufferGeometry;
  analysis: STLAnalysis;
}

const MATERIAL_DENSITIES = {
  PLA: 1.24,
};

export async function parseSTL(file: File): Promise<STLParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const loader = new STLLoader();
        const geometry = loader.parse(arrayBuffer);
        const analysis = calculateAnalysis(geometry);
        resolve({ geometry, analysis });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Erro ao ler arquivo STL"));
    reader.readAsArrayBuffer(file);
  });
}

function calculateAnalysis(geometry: THREE.BufferGeometry): STLAnalysis {
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();

  const bbox = geometry.boundingBox!;
  const dimensions = {
    x: Number((bbox.max.x - bbox.min.x).toFixed(1)),
    y: Number((bbox.max.y - bbox.min.y).toFixed(1)),
    z: Number((bbox.max.z - bbox.min.z).toFixed(1)),
  };

  const volume = calculateVolume(geometry);
  const volumeCm3 = volume / 1000;

  const density = MATERIAL_DENSITIES.PLA;
  const infill = 0.2;
  const weight = volumeCm3 * density * infill;

  const layerHeight = 0.2;
  const printSpeed = 50;
  const layers = dimensions.z / layerHeight;
  const perimeterPerLayer = estimatePerimeter(geometry);
  const timeSeconds = (layers * perimeterPerLayer) / printSpeed;
  const estimatedTime = Math.ceil(timeSeconds / 60);

  const filamentCost = (weight / 1000) * 120;
  const energyCost = (100 / 1000) * (estimatedTime / 60) * 0.85;
  const estimatedCost = filamentCost + energyCost;

  const triangleCount = geometry.index
    ? geometry.index.count / 3
    : geometry.attributes.position.count / 3;

  return {
    volume: Math.round(volume),
    volumeCm3: Number(volumeCm3.toFixed(2)),
    weight: Number(weight.toFixed(1)),
    dimensions,
    triangleCount,
    estimatedTime,
    estimatedCost: Number(estimatedCost.toFixed(2)),
  };
}

function calculateVolume(geometry: THREE.BufferGeometry): number {
  const position = geometry.attributes.position;
  const indices = geometry.index;
  let volume = 0;

  if (indices) {
    for (let i = 0; i < indices.count; i += 3) {
      const a = indices.getX(i);
      const b = indices.getX(i + 1);
      const c = indices.getX(i + 2);

      const vA = new THREE.Vector3().fromBufferAttribute(position, a);
      const vB = new THREE.Vector3().fromBufferAttribute(position, b);
      const vC = new THREE.Vector3().fromBufferAttribute(position, c);

      volume += signedVolumeOfTriangle(vA, vB, vC);
    }
  } else {
    for (let i = 0; i < position.count; i += 3) {
      const vA = new THREE.Vector3().fromBufferAttribute(position, i);
      const vB = new THREE.Vector3().fromBufferAttribute(position, i + 1);
      const vC = new THREE.Vector3().fromBufferAttribute(position, i + 2);

      volume += signedVolumeOfTriangle(vA, vB, vC);
    }
  }

  return Math.abs(volume);
}

function signedVolumeOfTriangle(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
): number {
  return p1.dot(p2.cross(p3)) / 6;
}

function estimatePerimeter(geometry: THREE.BufferGeometry): number {
  const bbox = geometry.boundingBox!;
  const width = bbox.max.x - bbox.min.x;
  const depth = bbox.max.y - bbox.min.y;
  return 2 * (width + depth);
}

