(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/stlParser.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseSTL",
    ()=>parseSTL
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$loaders$2f$STLLoader$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/examples/jsm/loaders/STLLoader.js [app-client] (ecmascript)");
;
;
const MATERIAL_DENSITIES = {
    PLA: 1.24
};
async function parseSTL(file) {
    return new Promise((resolve, reject)=>{
        const reader = new FileReader();
        reader.onload = (event)=>{
            try {
                const arrayBuffer = event.target?.result;
                const loader = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$loaders$2f$STLLoader$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STLLoader"]();
                const geometry = loader.parse(arrayBuffer);
                const analysis = calculateAnalysis(geometry);
                resolve({
                    geometry,
                    analysis
                });
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = ()=>reject(new Error("Erro ao ler arquivo STL"));
        reader.readAsArrayBuffer(file);
    });
}
function calculateAnalysis(geometry) {
    geometry.computeBoundingBox();
    geometry.computeVertexNormals();
    const bbox = geometry.boundingBox;
    const dimensions = {
        x: Number((bbox.max.x - bbox.min.x).toFixed(1)),
        y: Number((bbox.max.y - bbox.min.y).toFixed(1)),
        z: Number((bbox.max.z - bbox.min.z).toFixed(1))
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
    const timeSeconds = layers * perimeterPerLayer / printSpeed;
    const estimatedTime = Math.ceil(timeSeconds / 60);
    const filamentCost = weight / 1000 * 120;
    const energyCost = 100 / 1000 * (estimatedTime / 60) * 0.85;
    const estimatedCost = filamentCost + energyCost;
    const triangleCount = geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3;
    return {
        volume: Math.round(volume),
        volumeCm3: Number(volumeCm3.toFixed(2)),
        weight: Number(weight.toFixed(1)),
        dimensions,
        triangleCount,
        estimatedTime,
        estimatedCost: Number(estimatedCost.toFixed(2))
    };
}
function calculateVolume(geometry) {
    const position = geometry.attributes.position;
    const indices = geometry.index;
    let volume = 0;
    if (indices) {
        for(let i = 0; i < indices.count; i += 3){
            const a = indices.getX(i);
            const b = indices.getX(i + 1);
            const c = indices.getX(i + 2);
            const vA = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector3"]().fromBufferAttribute(position, a);
            const vB = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector3"]().fromBufferAttribute(position, b);
            const vC = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector3"]().fromBufferAttribute(position, c);
            volume += signedVolumeOfTriangle(vA, vB, vC);
        }
    } else {
        for(let i = 0; i < position.count; i += 3){
            const vA = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector3"]().fromBufferAttribute(position, i);
            const vB = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector3"]().fromBufferAttribute(position, i + 1);
            const vC = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector3"]().fromBufferAttribute(position, i + 2);
            volume += signedVolumeOfTriangle(vA, vB, vC);
        }
    }
    return Math.abs(volume);
}
function signedVolumeOfTriangle(p1, p2, p3) {
    return p1.dot(p2.cross(p3)) / 6;
}
function estimatePerimeter(geometry) {
    const bbox = geometry.boundingBox;
    const width = bbox.max.x - bbox.min.x;
    const depth = bbox.max.y - bbox.min.y;
    return 2 * (width + depth);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/threeMFParser.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parse3MF",
    ()=>parse3MF
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jszip$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jszip/lib/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$fast$2d$xml$2d$parser$2f$src$2f$xmlparser$2f$XMLParser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XMLParser$3e$__ = __turbopack_context__.i("[project]/node_modules/fast-xml-parser/src/xmlparser/XMLParser.js [app-client] (ecmascript) <export default as XMLParser>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [app-client] (ecmascript)");
;
;
;
async function parse3MF(file) {
    // logs só em desenvolvimento
    if ("TURBOPACK compile-time truthy", 1) {
        // eslint-disable-next-line no-console
        console.log("[3MF Parser] Iniciando parse:", file.name, "Size:", file.size);
    }
    // 1) array buffer
    const arrayBuffer = await file.arrayBuffer();
    if ("TURBOPACK compile-time truthy", 1) {
        // eslint-disable-next-line no-console
        console.log("[3MF Parser] ArrayBuffer lido:", arrayBuffer.byteLength, "bytes");
    }
    // 2) unzip
    let zip;
    try {
        zip = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jszip$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].loadAsync(arrayBuffer);
    } catch  {
        throw new Error("Arquivo 3MF corrompido ou não é um ZIP válido");
    }
    const modelPath = findModelFile(zip);
    const modelFile = zip.file(modelPath);
    if (!modelFile) {
        throw new Error(`Arquivo modelo não encontrado em: ${modelPath}`);
    }
    // 3) XML
    const modelXml = await modelFile.async("text");
    const parser = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$fast$2d$xml$2d$parser$2f$src$2f$xmlparser$2f$XMLParser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XMLParser$3e$__["XMLParser"]({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        parseAttributeValue: false,
        trimValues: true
    });
    let parsed;
    try {
        parsed = parser.parse(modelXml);
    } catch  {
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
    const analysis = {
        models,
        metadata,
        build,
        slicing
    };
    const geometries = [];
    models.forEach((m, idx)=>{
        try {
            const geo = createThreeGeometry(m);
            geometries.push(geo);
            if ("TURBOPACK compile-time truthy", 1) {
                // eslint-disable-next-line no-console
                console.log(`[3MF Parser] Geometria ${idx} criada:`, geo.attributes.position.count, "vértices");
            }
        } catch  {
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
        combinedAnalysis
    };
}
function findModelFile(zip) {
    const possiblePaths = [
        "3D/3dmodel.model",
        "3D/3DModel.model",
        "3dmodel.model",
        "model.model"
    ];
    for (const path of possiblePaths){
        if (zip.file(path)) return path;
    }
    const files = Object.keys(zip.files);
    const modelFile = files.find((f)=>f.toLowerCase().endsWith(".model") && !f.startsWith("_") && !f.includes("__MACOSX"));
    if (modelFile) return modelFile;
    throw new Error("Arquivo .model não encontrado no 3MF.");
}
function extractMetadata(model) {
    const metadata = {};
    if (!model.metadata) return metadata;
    const metaArray = Array.isArray(model.metadata) ? model.metadata : [
        model.metadata
    ];
    metaArray.forEach((m)=>{
        const name = (m["@_name"] || m.name || "").toLowerCase();
        const value = m["#text"] || m.value || m;
        switch(name){
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
function extractModels(model) {
    if (!model.resources) return [];
    const resources = model.resources;
    let objects = [];
    if (resources.object) {
        objects = Array.isArray(resources.object) ? resources.object : [
            resources.object
        ];
    } else if (resources["m:object"]) {
        objects = Array.isArray(resources["m:object"]) ? resources["m:object"] : [
            resources["m:object"]
        ];
    }
    return objects.map((obj, index)=>{
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
        const vertexArray = Array.isArray(verticesData) ? verticesData : [
            verticesData
        ];
        const vertices = new Float32Array(vertexArray.length * 3);
        vertexArray.forEach((v, i)=>{
            vertices[i * 3] = parseFloat(v["@_x"] || v.x || 0);
            vertices[i * 3 + 1] = parseFloat(v["@_y"] || v.y || 0);
            vertices[i * 3 + 2] = parseFloat(v["@_z"] || v.z || 0);
        });
        const trianglesData = mesh.triangles?.triangle || mesh["m:triangles"]?.["m:triangle"];
        if (!trianglesData) {
            throw new Error(`Mesh ${id} não contém triângulos`);
        }
        const triangleArray = Array.isArray(trianglesData) ? trianglesData : [
            trianglesData
        ];
        const triangles = new Uint32Array(triangleArray.length * 3);
        triangleArray.forEach((t, i)=>{
            triangles[i * 3] = parseInt(t["@_v1"] || t.v1 || 0, 10);
            triangles[i * 3 + 1] = parseInt(t["@_v2"] || t.v2 || 0, 10);
            triangles[i * 3 + 2] = parseInt(t["@_v3"] || t.v3 || 0, 10);
        });
        return {
            name,
            vertices,
            triangles,
            color: obj["@_pid"]
        };
    });
}
function extractBuild(model) {
    if (!model.build) return {
        items: []
    };
    const buildItems = model.build.item ? Array.isArray(model.build.item) ? model.build.item : [
        model.build.item
    ] : [];
    return {
        items: buildItems.map((item)=>({
                objectId: parseInt(item["@_objectid"] || item["@_id"] || 0, 10),
                transform: item["@_transform"]?.split(" ").map((n)=>parseFloat(n))
            }))
    };
}
async function extractSlicingInfo(zip) {
    const slicing = {};
    const plateFile = zip.file("Metadata/plate_1.json") || zip.file("Metadata/Plate_1.json") || zip.file("plate_1.json");
    if (plateFile) {
        try {
            const plateData = JSON.parse(await plateFile.async("text"));
            if (plateData.estimated_time) {
                slicing.printTime = Math.ceil(plateData.estimated_time / 60);
            }
            if (plateData.filament_used) {
                slicing.filamentUsed = plateData.filament_used;
            }
        } catch  {
        // ignore
        }
    }
    return Object.keys(slicing).length > 0 ? slicing : undefined;
}
function createThreeGeometry(model) {
    const geometry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BufferGeometry"]();
    geometry.setAttribute("position", new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BufferAttribute"](model.vertices, 3));
    geometry.setIndex(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BufferAttribute"](model.triangles, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    if (!geometry.boundingBox || geometry.boundingBox.isEmpty()) {
        throw new Error("Geometria resultante está vazia");
    }
    return geometry;
}
function calculateCombinedAnalysis(geometries, slicing) {
    let totalVolume = 0;
    const bbox = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Box3"]();
    geometries.forEach((geo)=>{
        totalVolume += calculateMeshVolume(geo);
        if (geo.boundingBox) bbox.union(geo.boundingBox);
    });
    const volumeCm3 = totalVolume / 1000;
    const density = 1.24;
    const infill = slicing?.infillDensity ? slicing.infillDensity / 100 : 0.2;
    const totalWeight = volumeCm3 * density * infill;
    let estimatedTime;
    if (slicing?.printTime) {
        estimatedTime = slicing.printTime;
    } else if (slicing?.filamentUsed) {
        const printSpeed = 5;
        estimatedTime = slicing.filamentUsed / printSpeed * 60;
    } else {
        const throughput = 8;
        const seconds = totalVolume / throughput;
        estimatedTime = Math.ceil(seconds / 60);
    }
    const filamentCost = totalWeight / 1000 * 120;
    const energyCost = 100 / 1000 * (estimatedTime / 60) * 0.85;
    return {
        totalVolume: Math.round(totalVolume),
        totalWeight: Number(totalWeight.toFixed(1)),
        estimatedTime: Math.round(estimatedTime),
        estimatedCost: Number((filamentCost + energyCost).toFixed(2)),
        dimensions: {
            x: Number((bbox.max.x - bbox.min.x).toFixed(1)),
            y: Number((bbox.max.y - bbox.min.y).toFixed(1)),
            z: Number((bbox.max.z - bbox.min.z).toFixed(1))
        }
    };
}
function calculateMeshVolume(geometry) {
    const position = geometry.attributes.position;
    const indices = geometry.index;
    if (!position) return 0;
    let volume = 0;
    const vA = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector3"]();
    const vB = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector3"]();
    const vC = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector3"]();
    if (indices) {
        for(let i = 0; i < indices.count; i += 3){
            vA.fromBufferAttribute(position, indices.getX(i));
            vB.fromBufferAttribute(position, indices.getX(i + 1));
            vC.fromBufferAttribute(position, indices.getX(i + 2));
            volume += signedVolume(vA, vB, vC);
        }
    } else {
        for(let i = 0; i < position.count; i += 3){
            vA.fromBufferAttribute(position, i);
            vB.fromBufferAttribute(position, i + 1);
            vC.fromBufferAttribute(position, i + 2);
            volume += signedVolume(vA, vB, vC);
        }
    }
    return Math.abs(volume);
}
function signedVolume(a, b, c) {
    return a.dot(b.cross(c)) / 6;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/stl-analyzer/STLViewer.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "STLViewer",
    ()=>STLViewer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$react$2d$three$2d$fiber$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@react-three/fiber/dist/react-three-fiber.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$5a94e5eb$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__ = __turbopack_context__.i("[project]/node_modules/@react-three/fiber/dist/events-5a94e5eb.esm.js [app-client] (ecmascript) <export D as useFrame>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$core$2f$Center$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@react-three/drei/core/Center.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$core$2f$Grid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@react-three/drei/core/Grid.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$core$2f$OrbitControls$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@react-three/drei/core/OrbitControls.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function Models({ geometries }) {
    _s();
    const meshRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$5a94e5eb$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__["useFrame"])({
        "Models.useFrame": (state)=>{
            if (meshRef.current) {
                meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
            }
        }
    }["Models.useFrame"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("group", {
        ref: meshRef,
        children: geometries.map((geometry, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$core$2f$Center$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Center"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("mesh", {
                    geometry: geometry,
                    castShadow: true,
                    receiveShadow: true,
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meshStandardMaterial", {
                        color: "#06B6D4",
                        roughness: 0.3,
                        metalness: 0.1,
                        emissive: "#0891B2",
                        emissiveIntensity: 0.1
                    }, void 0, false, {
                        fileName: "[project]/components/stl-analyzer/STLViewer.tsx",
                        lineNumber: 26,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/stl-analyzer/STLViewer.tsx",
                    lineNumber: 25,
                    columnNumber: 11
                }, this)
            }, idx, false, {
                fileName: "[project]/components/stl-analyzer/STLViewer.tsx",
                lineNumber: 24,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/components/stl-analyzer/STLViewer.tsx",
        lineNumber: 22,
        columnNumber: 5
    }, this);
}
_s(Models, "/vg1AmA8+P3+Fj0/y210JTVKtL0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$5a94e5eb$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__["useFrame"]
    ];
});
_c = Models;
function STLViewer({ geometries }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$react$2d$three$2d$fiber$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Canvas"], {
        camera: {
            position: [
                0,
                0,
                100
            ],
            fov: 50
        },
        shadows: true,
        gl: {
            antialias: true,
            alpha: true
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ambientLight", {
                intensity: 0.5
            }, void 0, false, {
                fileName: "[project]/components/stl-analyzer/STLViewer.tsx",
                lineNumber: 47,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("directionalLight", {
                position: [
                    10,
                    10,
                    5
                ],
                intensity: 1,
                castShadow: true
            }, void 0, false, {
                fileName: "[project]/components/stl-analyzer/STLViewer.tsx",
                lineNumber: 48,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pointLight", {
                position: [
                    -10,
                    -10,
                    -10
                ],
                intensity: 0.5,
                color: "#8B5CF6"
            }, void 0, false, {
                fileName: "[project]/components/stl-analyzer/STLViewer.tsx",
                lineNumber: 49,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$core$2f$Grid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Grid"], {
                position: [
                    0,
                    -20,
                    0
                ],
                args: [
                    200,
                    200
                ],
                cellSize: 10,
                cellThickness: 0.5,
                cellColor: "#334155",
                sectionSize: 50,
                sectionThickness: 1,
                sectionColor: "#475569",
                fadeDistance: 400,
                fadeStrength: 1,
                infiniteGrid: true
            }, void 0, false, {
                fileName: "[project]/components/stl-analyzer/STLViewer.tsx",
                lineNumber: 51,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Models, {
                geometries: geometries
            }, void 0, false, {
                fileName: "[project]/components/stl-analyzer/STLViewer.tsx",
                lineNumber: 65,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$core$2f$OrbitControls$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["OrbitControls"], {
                enablePan: true,
                enableZoom: true,
                enableRotate: true,
                minDistance: 50,
                maxDistance: 300
            }, void 0, false, {
                fileName: "[project]/components/stl-analyzer/STLViewer.tsx",
                lineNumber: 67,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/stl-analyzer/STLViewer.tsx",
        lineNumber: 42,
        columnNumber: 5
    }, this);
}
_c1 = STLViewer;
var _c, _c1;
__turbopack_context__.k.register(_c, "Models");
__turbopack_context__.k.register(_c1, "STLViewer");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/stl-analyzer/STLResults.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "STLResults",
    ()=>STLResults
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
function STLResults({ analysis, fileName, onApply }) {
    const stats = [
        {
            label: "Volume",
            value: `${analysis.volumeCm3} cm³`,
            sub: `${analysis.volume.toLocaleString()} mm³`
        },
        {
            label: "Peso estimado",
            value: `${analysis.weight} g`,
            sub: "PLA, 20% infill"
        },
        {
            label: "Tempo estimado",
            value: `${Math.floor(analysis.estimatedTime / 60)}h ${analysis.estimatedTime % 60}min`,
            sub: "Velocidade média"
        },
        {
            label: "Custo estimado",
            value: analysis.estimatedCost.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
            }),
            sub: "Material + energia"
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "text-lg font-semibold text-slate-100",
                                children: fileName || "modelo.stl"
                            }, void 0, false, {
                                fileName: "[project]/components/stl-analyzer/STLResults.tsx",
                                lineNumber: 42,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-slate-400",
                                children: [
                                    analysis.triangleCount.toLocaleString(),
                                    " triângulos •",
                                    " ",
                                    analysis.dimensions.x,
                                    " × ",
                                    analysis.dimensions.y,
                                    " × ",
                                    analysis.dimensions.z,
                                    " mm"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/stl-analyzer/STLResults.tsx",
                                lineNumber: 45,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/stl-analyzer/STLResults.tsx",
                        lineNumber: 41,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "rounded-full border border-cyan-500/50 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300",
                        children: "Análise STL"
                    }, void 0, false, {
                        fileName: "[project]/components/stl-analyzer/STLResults.tsx",
                        lineNumber: 50,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/stl-analyzer/STLResults.tsx",
                lineNumber: 40,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-2 gap-3",
                children: stats.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-2xl border border-slate-800 bg-slate-950/70 p-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400",
                                children: s.label
                            }, void 0, false, {
                                fileName: "[project]/components/stl-analyzer/STLResults.tsx",
                                lineNumber: 61,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-1 text-base font-semibold text-slate-50",
                                children: s.value
                            }, void 0, false, {
                                fileName: "[project]/components/stl-analyzer/STLResults.tsx",
                                lineNumber: 64,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-0.5 text-[11px] text-slate-500",
                                children: s.sub
                            }, void 0, false, {
                                fileName: "[project]/components/stl-analyzer/STLResults.tsx",
                                lineNumber: 65,
                                columnNumber: 13
                            }, this)
                        ]
                    }, s.label, true, {
                        fileName: "[project]/components/stl-analyzer/STLResults.tsx",
                        lineNumber: 57,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/stl-analyzer/STLResults.tsx",
                lineNumber: 55,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: onApply,
                className: "flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400",
                children: "Usar na calculadora"
            }, void 0, false, {
                fileName: "[project]/components/stl-analyzer/STLResults.tsx",
                lineNumber: 70,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-center text-[11px] text-slate-500",
                children: "Peso e tempo serão preenchidos automaticamente na calculadora."
            }, void 0, false, {
                fileName: "[project]/components/stl-analyzer/STLResults.tsx",
                lineNumber: 77,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/stl-analyzer/STLResults.tsx",
        lineNumber: 39,
        columnNumber: 5
    }, this);
}
_c = STLResults;
var _c;
__turbopack_context__.k.register(_c, "STLResults");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/stl-analyzer/STLAnalyzer.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "STLAnalyzer",
    ()=>STLAnalyzer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$dropzone$2f$dist$2f$es$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/react-dropzone/dist/es/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$stlParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/stlParser.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$threeMFParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/threeMFParser.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$stl$2d$analyzer$2f$STLViewer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/stl-analyzer/STLViewer.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$stl$2d$analyzer$2f$STLResults$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/stl-analyzer/STLResults.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$calculatorStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/store/calculatorStore.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
function STLAnalyzer() {
    _s();
    const [file, setFile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [geometries, setGeometries] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [analysis, setAnalysis] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const { setStlPreset } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$calculatorStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCalculatorStore"])();
    const onDrop = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "STLAnalyzer.useCallback[onDrop]": async (acceptedFiles)=>{
            const uploaded = acceptedFiles[0];
            if (!uploaded) return;
            setLoading(true);
            setFile(uploaded);
            const ext = uploaded.name.split(".").pop()?.toLowerCase();
            try {
                if (ext === "3mf") {
                    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$threeMFParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parse3MF"])(uploaded);
                    setGeometries(result.geometries);
                    setAnalysis({
                        volume: result.combinedAnalysis.totalVolume,
                        volumeCm3: Number((result.combinedAnalysis.totalVolume / 1000).toFixed(2)),
                        weight: result.combinedAnalysis.totalWeight,
                        dimensions: result.combinedAnalysis.dimensions,
                        triangleCount: result.geometries.reduce({
                            "STLAnalyzer.useCallback[onDrop]": (acc, g)=>{
                                const count = g.index ? g.index.count : g.attributes.position.count;
                                return acc + count / 3;
                            }
                        }["STLAnalyzer.useCallback[onDrop]"], 0),
                        estimatedTime: result.combinedAnalysis.estimatedTime,
                        estimatedCost: result.combinedAnalysis.estimatedCost,
                        fileType: "3mf"
                    });
                } else {
                    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$stlParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseSTL"])(uploaded);
                    setGeometries([
                        result.geometry
                    ]);
                    setAnalysis({
                        ...result.analysis,
                        fileType: "stl"
                    });
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error("Erro ao analisar arquivo 3D", error);
                alert("Não foi possível analisar este arquivo. Use STL ou 3MF exportado de um slicer.");
            } finally{
                setLoading(false);
            }
        }
    }["STLAnalyzer.useCallback[onDrop]"], []);
    const { getRootProps, getInputProps, isDragActive } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$dropzone$2f$dist$2f$es$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["useDropzone"])({
        onDrop,
        accept: {
            "model/stl": [
                ".stl"
            ],
            "model/3mf": [
                ".3mf"
            ],
            "application/vnd.ms-package.3dmanufacturing-3dmodel+xml": [
                ".3mf"
            ]
        },
        maxSize: 100 * 1024 * 1024,
        multiple: false
    });
    const applyToCalculator = ()=>{
        if (!analysis) return;
        setStlPreset({
            weightGrams: analysis.weight,
            estimatedMinutes: analysis.estimatedTime
        });
        alert("Peso e tempo enviados para a calculadora. Abra a aba Calculadora.");
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mx-auto w-full max-w-6xl space-y-6",
        children: [
            !geometries.length && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ...getRootProps(),
                className: `cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition ${isDragActive ? "border-cyan-500 bg-cyan-500/10 shadow-neon-cyan" : "border-slate-700 bg-slate-950/70 hover:border-slate-400"}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        ...getInputProps()
                    }, void 0, false, {
                        fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
                        lineNumber: 96,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col items-center gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 text-slate-950 shadow-neon-cyan",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xl font-bold",
                                    children: "3D"
                                }, void 0, false, {
                                    fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
                                    lineNumber: 99,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
                                lineNumber: 98,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-lg font-semibold text-slate-100",
                                        children: isDragActive ? "Solte o arquivo aqui" : "Arraste seu arquivo STL ou 3MF"
                                    }, void 0, false, {
                                        fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
                                        lineNumber: 102,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-2 text-sm text-slate-400",
                                        children: "ou clique para selecionar • Máx. 100MB • formatos .stl ou .3mf"
                                    }, void 0, false, {
                                        fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
                                        lineNumber: 105,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
                                lineNumber: 101,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
                        lineNumber: 97,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
                lineNumber: 88,
                columnNumber: 9
            }, this),
            loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col items-center gap-4 py-12",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "h-16 w-16 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"
                    }, void 0, false, {
                        fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
                        lineNumber: 115,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-slate-400",
                        children: "Analisando geometria 3D..."
                    }, void 0, false, {
                        fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
                        lineNumber: 116,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
                lineNumber: 114,
                columnNumber: 9
            }, this),
            geometries.length > 0 && analysis && !loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid gap-6 lg:grid-cols-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "border-b border-slate-800 px-4 py-3 text-sm font-semibold text-slate-100",
                                children: "Preview 3D"
                            }, void 0, false, {
                                fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
                                lineNumber: 123,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "h-96",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$stl$2d$analyzer$2f$STLViewer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STLViewer"], {
                                    geometries: geometries
                                }, void 0, false, {
                                    fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
                                    lineNumber: 127,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
                                lineNumber: 126,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
                        lineNumber: 122,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-2xl border border-slate-800 bg-slate-950/70 p-4",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$stl$2d$analyzer$2f$STLResults$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STLResults"], {
                            analysis: analysis,
                            fileName: file?.name,
                            onApply: applyToCalculator
                        }, void 0, false, {
                            fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
                            lineNumber: 131,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
                        lineNumber: 130,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
                lineNumber: 121,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/stl-analyzer/STLAnalyzer.tsx",
        lineNumber: 86,
        columnNumber: 5
    }, this);
}
_s(STLAnalyzer, "0PBOFz9AIx43Rqv/ZGKndOLdyAo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$calculatorStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCalculatorStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$dropzone$2f$dist$2f$es$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["useDropzone"]
    ];
});
_c = STLAnalyzer;
var _c;
__turbopack_context__.k.register(_c, "STLAnalyzer");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_0ea70a84._.js.map