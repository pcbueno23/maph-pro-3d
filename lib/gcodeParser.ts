export interface GcodeParseResult {
  printTimeSeconds: number | null;
  weightGrams: number | null;
  filamentMm: number | null;
  slicer: string | null;
  productName: string | null;
  /** Linhas brutas que geraram os dados — útil para depuração */
  _raw: { timeMatch?: string; weightMatch?: string; filamentMatch?: string };
}

/**
 * Extrai tempo de impressão e peso do filamento de um arquivo .gcode.
 * Lê apenas as primeiras 200 e últimas 80 linhas (comentários do slicer ficam no cabeçalho/rodapé).
 * Funciona no browser (sem Node.js) — usa FileReader.
 */
export async function parseGcode(file: File): Promise<GcodeParseResult> {
  const text = await readFileHead(file, 200, 80);
  const lines = text.split("\n");

  const result: GcodeParseResult = {
    printTimeSeconds: null,
    weightGrams: null,
    filamentMm: null,
    slicer: null,
    productName: extractProductName(file.name),
    _raw: {},
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith(";")) continue;

    // ── Detectar slicer ────────────────────────────────────────────────────
    if (!result.slicer) {
      if (/cura/i.test(line))           result.slicer = "Cura";
      else if (/prusaslicer/i.test(line)) result.slicer = "PrusaSlicer";
      else if (/orcaslicer/i.test(line))  result.slicer = "OrcaSlicer";
      else if (/bambu/i.test(line))       result.slicer = "BambuStudio";
      else if (/simplify3d/i.test(line))  result.slicer = "Simplify3D";
      else if (/kisslicer/i.test(line))   result.slicer = "KISSlicer";
      else if (/ideamaker/i.test(line))   result.slicer = "IdeaMaker";
    }

    // ── Tempo de impressão ─────────────────────────────────────────────────

    // Cura: ;TIME:9015
    if (/^;TIME:\d+$/i.test(line)) {
      const s = parseInt(line.split(":")[1], 10);
      if (Number.isFinite(s)) { result.printTimeSeconds = s; result._raw.timeMatch = line; }
      continue;
    }

    // BambuStudio header:
    // ; model printing time: 41m 45s; total estimated time: 48m 55s
    {
      const m = line.match(/total estimated time:\s*(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?/i);
      if (m) {
        const h = parseInt(m[1] ?? "0", 10);
        const min = parseInt(m[2] ?? "0", 10);
        const s = parseInt(m[3] ?? "0", 10);
        const total = h * 3600 + min * 60 + s;
        if (total > 0) { result.printTimeSeconds = total; result._raw.timeMatch = line; }
        continue;
      }
    }

    // PrusaSlicer / OrcaSlicer / Bambu:
    // ; estimated printing time (normal mode) = 2h 30m 15s
    {
      const m = line.match(/estimated printing time.*=\s*(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?/i);
      if (m) {
        const d = parseInt(m[1] ?? "0", 10);
        const h = parseInt(m[2] ?? "0", 10);
        const min = parseInt(m[3] ?? "0", 10);
        const s = parseInt(m[4] ?? "0", 10);
        const total = d * 86400 + h * 3600 + min * 60 + s;
        if (total > 0) { result.printTimeSeconds = total; result._raw.timeMatch = line; }
        continue;
      }
    }

    // Simplify3D: ; Build time: 1 hours 30 minutes
    {
      const m = line.match(/Build time[:\s]+(?:(\d+)\s*hour[s]?)?\s*(?:(\d+)\s*minute[s]?)?/i);
      if (m) {
        const h = parseInt(m[1] ?? "0", 10);
        const min = parseInt(m[2] ?? "0", 10);
        const total = h * 3600 + min * 60;
        if (total > 0) { result.printTimeSeconds = total; result._raw.timeMatch = line; }
        continue;
      }
    }

    // KISSlicer: ; Estimated Build Time: 1.5 hour
    {
      const m = line.match(/Estimated Build Time[:\s]+([\d.]+)\s*hour/i);
      if (m) {
        const total = Math.round(parseFloat(m[1]) * 3600);
        if (total > 0) { result.printTimeSeconds = total; result._raw.timeMatch = line; }
        continue;
      }
    }

    // IdeaMaker: ;Print Time: 5400
    {
      const m = line.match(/^;Print Time:\s*(\d+)/i);
      if (m) {
        const s = parseInt(m[1], 10);
        if (s > 0) { result.printTimeSeconds = s; result._raw.timeMatch = line; }
        continue;
      }
    }

    // ── Peso do filamento ──────────────────────────────────────────────────

    // BambuStudio header: ; total filament weight [g] : 20.12
    {
      const m = line.match(/total filament weight \[g\]\s*:\s*([\d.]+)/i);
      if (m) {
        const g = parseFloat(m[1]);
        if (g > 0) { result.weightGrams = g; result._raw.weightMatch = line; }
        continue;
      }
    }

    // PrusaSlicer / OrcaSlicer / Bambu: ; filament used [g] = 12.94
    {
      const m = line.match(/filament used \[g\]\s*=\s*([\d.]+)/i);
      if (m) {
        const g = parseFloat(m[1]);
        if (g > 0) { result.weightGrams = g; result._raw.weightMatch = line; }
        continue;
      }
    }

    // Simplify3D: ; Filament weight: 12.9 g
    {
      const m = line.match(/Filament weight[:\s]+([\d.]+)\s*g/i);
      if (m) {
        const g = parseFloat(m[1]);
        if (g > 0) { result.weightGrams = g; result._raw.weightMatch = line; }
        continue;
      }
    }

    // IdeaMaker: ;Filament Weight: 12.9
    {
      const m = line.match(/^;Filament Weight[:\s]+([\d.]+)/i);
      if (m) {
        const g = parseFloat(m[1]);
        if (g > 0) { result.weightGrams = g; result._raw.weightMatch = line; }
        continue;
      }
    }

    // ── Comprimento do filamento (mm) ──────────────────────────────────────

    // BambuStudio header: ; total filament length [mm] : 6745.84
    {
      const m = line.match(/total filament length \[mm\]\s*:\s*([\d.]+)/i);
      if (m) {
        const mm = parseFloat(m[1]);
        if (mm > 0) { result.filamentMm = mm; result._raw.filamentMatch = line; }
        continue;
      }
    }

    // PrusaSlicer / OrcaSlicer: ; filament used [mm] = 4500.50
    {
      const m = line.match(/filament used \[mm\]\s*=\s*([\d.]+)/i);
      if (m) {
        const mm = parseFloat(m[1]);
        if (mm > 0) { result.filamentMm = mm; result._raw.filamentMatch = line; }
        continue;
      }
    }

    // Cura: ;Filament used: 1.5m  ou  ;FILAMENT_USED:1500
    {
      const mMeters = line.match(/^;Filament used:\s*([\d.]+)m$/i);
      if (mMeters) {
        result.filamentMm = parseFloat(mMeters[1]) * 1000;
        result._raw.filamentMatch = line;
        continue;
      }
      const mMm = line.match(/^;FILAMENT_USED:([\d.]+)/i);
      if (mMm) {
        result.filamentMm = parseFloat(mMm[1]);
        result._raw.filamentMatch = line;
        continue;
      }
    }

    // Simplify3D: ; Filament length: 4500.0 mm
    {
      const m = line.match(/Filament length[:\s]+([\d.]+)\s*mm/i);
      if (m) {
        result.filamentMm = parseFloat(m[1]);
        result._raw.filamentMatch = line;
        continue;
      }
    }
  }

  // Derivar peso a partir de mm se ainda não temos (filamento 1.75mm, densidade PLA ~1.24 g/cm³)
  if (result.weightGrams === null && result.filamentMm !== null) {
    const radius = 1.75 / 2;
    const volumeCm3 = (Math.PI * radius * radius * result.filamentMm) / 1000;
    result.weightGrams = Math.round(volumeCm3 * 1.24 * 10) / 10;
  }

  return result;
}

/** Formata segundos em "2h 30min" */
export function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Lê os primeiros `headLines` e últimos `tailLines` de um arquivo de texto.
 * Evita ler arquivos grandes inteiros na memória.
 */
async function readFileHead(file: File, headLines: number, tailLines: number): Promise<string> {
  // Lê até 32 KB do início + 8 KB do fim — suficiente para comentários de slicer
  const HEAD_BYTES = 32_768;
  const TAIL_BYTES = 8_192;

  const headBlob = file.slice(0, HEAD_BYTES);
  const tailBlob = file.slice(Math.max(0, file.size - TAIL_BYTES));

  const [headText, tailText] = await Promise.all([
    blobToText(headBlob),
    blobToText(tailBlob),
  ]);

  const headResult = headText.split("\n").slice(0, headLines).join("\n");
  const tailResult = tailText.split("\n").slice(-tailLines).join("\n");
  return headResult + "\n" + tailResult;
}

/**
 * Extrai o nome do produto do nome do arquivo .gcode.
 * Remove extensão e sufixos do slicer como "_PLA_48m55s", "_PETG_1h20m10s", "_0.20mm_PLA" etc.
 */
function extractProductName(filename: string): string {
  let name = filename.replace(/\.gcode$/i, "");
  // Remove sufixos comuns: _PLA_48m55s | _PETG_1h20m | _0.20mm_PLA_1h | _PLA_HF_2h10m etc.
  name = name.replace(/_(?:\d+\.\d+mm_)?(?:[A-Z_]{2,10}_?)?(?:\d+h)?(?:\d+m)?(?:\d+s)?$/i, "");
  // Remove trailing underscores/dashes
  name = name.replace(/[_\-]+$/, "").trim();
  return name || filename.replace(/\.gcode$/i, "");
}

function blobToText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob, "utf-8");
  });
}
