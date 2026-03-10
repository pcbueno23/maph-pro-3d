import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import * as THREE from "three";

export interface ThreeMFModel {
  name: string;
  vertices: Float32Array;
  triangles: Uint32Array;
  color?: string;
}

export interface ThreeMFMetadata {
  title?: string;
  designer?: string;
  description?: string;
  creationDate?: string;
  application?: string;
}

export interface ThreeMFSlicing {
  layerHeight?: number;
  infillDensity?: number;
  printTime?: number;
  filamentUsed?: number;
}

export interface ThreeMFAnalysis {
  models: ThreeMFModel[];
  metadata: ThreeMFMetadata;
  build: {
    items: {
      objectId: number;
      transform?: number[];
    }[];
  };
  slicing?: ThreeMFSlicing;
}

export interface ThreeMFParseResult {
  geometries: THREE.BufferGeometry[];
  analysis: ThreeMFAnalysis;
  combinedAnalysis: {
    totalVolume: number;
    totalWeight: number;
    estimatedTime: number;
    estimatedCost: number;
    dimensions: { x: number; y: number; z: number };
  };
}

export async function parse3MF(file: File): Promise<ThreeMFParseResult> {
  // logs só em desenvolvimento
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[3MF Parser] Iniciando parse:", file.name, "Size:", file.size);
  }

  // 1) array buffer
  const arrayBuffer = await file.arrayBuffer();
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[3MF Parser] ArrayBuffer lido:", arrayBuffer.byteLength, "bytes");
  }

  // 2) unzip
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch {
    throw new Error("Arquivo 3MF corrompido ou não é um ZIP válido");
  }

  const modelPath = findModelFile(zip);
  const modelFile = zip.file(modelPath);
  if (!modelFile) {
    throw new Error(`Arquivo modelo não encontrado em: ${modelPath}`);
  }

  // 3) XML
  const modelXml = await modelFile.async("text");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: false,
    trimValues: true,
  });

  let parsed: any;
  try {
    parsed = parser.parse(modelXml);
  } catch {
    throw new Error("XML do modelo 3MF malformado");
  }

  if (!parsed.model) {
    throw new Error("Estrutura 3MF inválida: tag <model> não encontrada");
  }

  const model = parsed.model;

  const metadata = extractMetadata(model);
  const models = extractModels(model);

  if (models.length === 0) {
    throw new Error("Nenhuma geometria encontrada no arquivo 3MF");
  }

  const build = extractBuild(model);
  const slicing = await extractSlicingInfo(zip);

  const analysis: ThreeMFAnalysis = {
    models,
    metadata,
    build,
    slicing,
  };

  const geometries: THREE.BufferGeometry[] = [];
  models.forEach((m, idx) => {
    try {
      const geo = createThreeGeometry(m);
      geometries.push(geo);
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log(
          `[3MF Parser] Geometria ${idx} criada:`,
          (geo.attributes.position as THREE.BufferAttribute).count,
          "vértices",
        );
      }
    } catch {
      // ignora geometria inválida
    }
  });

  if (geometries.length === 0) {
    throw new Error("Não foi possível criar geometrias 3D a partir do arquivo");
  }

  const combinedAnalysis = calculateCombinedAnalysis(geometries, slicing);

  return {
    geometries,
    analysis,
    combinedAnalysis,
  };
}

function findModelFile(zip: JSZip): string {
  const possiblePaths = ["3D/3dmodel.model", "3D/3DModel.model", "3dmodel.model", "model.model"];

  for (const path of possiblePaths) {
    if (zip.file(path)) return path;
  }

  const files = Object.keys(zip.files);
  const modelFile = files.find(
    (f) => f.toLowerCase().endsWith(".model") && !f.startsWith("_") && !f.includes("__MACOSX"),
  );

  if (modelFile) return modelFile;
  throw new Error("Arquivo .model não encontrado no 3MF.");
}

function extractMetadata(model: any): ThreeMFMetadata {
  const metadata: ThreeMFMetadata = {};

  if (!model.metadata) return metadata;

  const metaArray = Array.isArray(model.metadata) ? model.metadata : [model.metadata];
  metaArray.forEach((m: any) => {
    const name = (m["@_name"] || m.name || "").toLowerCase();
    const value = m["#text"] || m.value || m;
    switch (name) {
      case "title":
        metadata.title = value;
        break;
      case "designer":
      case "author":
        metadata.designer = value;
        break;
      case "description":
        metadata.description = value;
        break;
      case "creationdate":
        metadata.creationDate = value;
        break;
      case "application":
        metadata.application = value;
        break;
      default:
        break;
    }
  });

  return metadata;
}

function extractModels(model: any): ThreeMFModel[] {
  if (!model.resources) return [];

  const resources = model.resources;
  let objects: any[] = [];

  if (resources.object) {
    objects = Array.isArray(resources.object) ? resources.object : [resources.object];
  } else if (resources["m:object"]) {
    objects = Array.isArray(resources["m:object"])
      ? resources["m:object"]
      : [resources["m:object"]];
  }

  return objects.map((obj: any, index: number) => {
    const id = obj["@_id"] || obj["@_objectid"] || index + 1;
    const name = obj["@_name"] || obj["@_partname"] || `Modelo ${id}`;

    const mesh = obj.mesh || obj["m:mesh"];
    if (!mesh) {
      throw new Error(`Objeto ${id} não contém mesh`);
    }

    const verticesData = mesh.vertices?.vertex || mesh["m:vertices"]?.["m:vertex"];
    if (!verticesData) {
      throw new Error(`Mesh ${id} não contém vértices`);
    }
    const vertexArray = Array.isArray(verticesData) ? verticesData : [verticesData];
    const vertices = new Float32Array(vertexArray.length * 3);
    vertexArray.forEach((v: any, i: number) => {
      vertices[i * 3] = parseFloat(v["@_x"] || v.x || 0);
      vertices[i * 3 + 1] = parseFloat(v["@_y"] || v.y || 0);
      vertices[i * 3 + 2] = parseFloat(v["@_z"] || v.z || 0);
    });

    const trianglesData = mesh.triangles?.triangle || mesh["m:triangles"]?.["m:triangle"];
    if (!trianglesData) {
      throw new Error(`Mesh ${id} não contém triângulos`);
    }
    const triangleArray = Array.isArray(trianglesData) ? trianglesData : [trianglesData];
    const triangles = new Uint32Array(triangleArray.length * 3);
    triangleArray.forEach((t: any, i: number) => {
      triangles[i * 3] = parseInt(t["@_v1"] || t.v1 || 0, 10);
      triangles[i * 3 + 1] = parseInt(t["@_v2"] || t.v2 || 0, 10);
      triangles[i * 3 + 2] = parseInt(t["@_v3"] || t.v3 || 0, 10);
    });

    return {
      name,
      vertices,
      triangles,
      color: obj["@_pid"],
    };
  });
}

function extractBuild(model: any): { items: any[] } {
  if (!model.build) return { items: [] };

  const buildItems = model.build.item
    ? Array.isArray(model.build.item)
      ? model.build.item
      : [model.build.item]
    : [];

  return {
    items: buildItems.map((item: any) => ({
      objectId: parseInt(item["@_objectid"] || item["@_id"] || 0, 10),
      transform: item["@_transform"]?.split(" ").map((n: string) => parseFloat(n)),
    })),
  };
}

async function extractSlicingInfo(zip: JSZip): Promise<ThreeMFSlicing | undefined> {
  const slicing: ThreeMFSlicing = {};

  const plateFile =
    zip.file("Metadata/plate_1.json") ||
    zip.file("Metadata/Plate_1.json") ||
    zip.file("plate_1.json");
  if (plateFile) {
    try {
      const plateData = JSON.parse(await plateFile.async("text"));
      if (plateData.estimated_time) {
        slicing.printTime = Math.ceil(plateData.estimated_time / 60);
      }
      if (plateData.filament_used) {
        slicing.filamentUsed = plateData.filament_used;
      }
    } catch {
      // ignore
    }
  }

  return Object.keys(slicing).length > 0 ? slicing : undefined;
}

function createThreeGeometry(model: ThreeMFModel): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(model.vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(model.triangles, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  if (!geometry.boundingBox || geometry.boundingBox.isEmpty()) {
    throw new Error("Geometria resultante está vazia");
  }
  return geometry;
}

function calculateCombinedAnalysis(
  geometries: THREE.BufferGeometry[],
  slicing?: ThreeMFSlicing,
): ThreeMFParseResult["combinedAnalysis"] {
  let totalVolume = 0;
  const bbox = new THREE.Box3();

  geometries.forEach((geo) => {
    totalVolume += calculateMeshVolume(geo);
    if (geo.boundingBox) bbox.union(geo.boundingBox);
  });

  const volumeCm3 = totalVolume / 1000;
  const density = 1.24;
  const infill = slicing?.infillDensity ? slicing.infillDensity / 100 : 0.2;
  const totalWeight = volumeCm3 * density * infill;

  let estimatedTime: number;
  if (slicing?.printTime) {
    estimatedTime = slicing.printTime;
  } else if (slicing?.filamentUsed) {
    const printSpeed = 5;
    estimatedTime = (slicing.filamentUsed / printSpeed) * 60;
  } else {
    const throughput = 8;
    const seconds = totalVolume / throughput;
    estimatedTime = Math.ceil(seconds / 60);
  }

  const filamentCost = (totalWeight / 1000) * 120;
  const energyCost = (100 / 1000) * (estimatedTime / 60) * 0.85;

  return {
    totalVolume: Math.round(totalVolume),
    totalWeight: Number(totalWeight.toFixed(1)),
    estimatedTime: Math.round(estimatedTime),
    estimatedCost: Number((filamentCost + energyCost).toFixed(2)),
    dimensions: {
      x: Number((bbox.max.x - bbox.min.x).toFixed(1)),
      y: Number((bbox.max.y - bbox.min.y).toFixed(1)),
      z: Number((bbox.max.z - bbox.min.z).toFixed(1)),
    },
  };
}

function calculateMeshVolume(geometry: THREE.BufferGeometry): number {
  const position = geometry.attributes.position as THREE.BufferAttribute | undefined;
  const indices = geometry.index;
  if (!position) return 0;

  let volume = 0;
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();

  if (indices) {
    for (let i = 0; i < indices.count; i += 3) {
      vA.fromBufferAttribute(position, indices.getX(i));
      vB.fromBufferAttribute(position, indices.getX(i + 1));
      vC.fromBufferAttribute(position, indices.getX(i + 2));
      volume += signedVolume(vA, vB, vC);
    }
  } else {
    for (let i = 0; i < position.count; i += 3) {
      vA.fromBufferAttribute(position, i);
      vB.fromBufferAttribute(position, i + 1);
      vC.fromBufferAttribute(position, i + 2);
      volume += signedVolume(vA, vB, vC);
    }
  }

  return Math.abs(volume);
}

function signedVolume(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): number {
  return a.dot(b.cross(c)) / 6;
}

