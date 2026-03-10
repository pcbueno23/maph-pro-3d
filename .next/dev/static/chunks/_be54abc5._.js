(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/store/settingsStore.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useSettingsStore",
    ()=>useSettingsStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
;
// Chave única para as configurações no localStorage
const STORAGE_KEY = "precifica3d-settings-v3";
const defaultSettings = {
    currency: "BRL",
    defaults: {
        kwhPrice: 1.2,
        printerCost: 2500,
        residualValue: 0,
        lifetimeHours: 4000,
        annualMaintenance: 0,
        infrastructureYear: 0,
        yearlyPrintHours: 1000,
        packaging: 3,
        desiredMargin: 45,
        shippingEstimateDefault: 0,
        shopeeFreeShippingDefault: false,
        taxMode: "net_marketplace",
        mlClassic: false
    },
    printer: {
        presetId: "",
        customName: "",
        customPowerW: undefined,
        customPrinterCost: undefined,
        customLifetimeHours: undefined,
        customAnnualMaintenance: undefined,
        customYearlyPrintHours: undefined,
        customPresets: []
    }
};
const useSettingsStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])((set)=>({
        settings: ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : (()=>{
            try {
                const raw = window.localStorage.getItem(STORAGE_KEY);
                if (!raw) return defaultSettings;
                const parsed = JSON.parse(raw);
                return {
                    ...defaultSettings,
                    ...parsed,
                    defaults: {
                        ...defaultSettings.defaults,
                        ...parsed.defaults ?? defaultSettings.defaults
                    },
                    printer: {
                        ...defaultSettings.printer,
                        ...parsed.printer ?? defaultSettings.printer
                    }
                };
            } catch  {
                return defaultSettings;
            }
        })(),
        updateSettings: (next)=>{
            set({
                settings: next
            });
            if ("TURBOPACK compile-time truthy", 1) {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            }
        }
    }));
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/store/suppliesStore.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useSuppliesStore",
    ()=>useSuppliesStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
;
const STORAGE_KEY = "precifica3d-supplies";
function persist(next) {
    if ("TURBOPACK compile-time truthy", 1) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
}
const useSuppliesStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
        supplies: [],
        hydrateFromStorage: ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            try {
                const raw = window.localStorage.getItem(STORAGE_KEY);
                if (!raw) return;
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    set({
                        supplies: parsed
                    });
                }
            } catch  {
            // ignore
            }
        },
        addSupply: (s)=>{
            const next = [
                ...get().supplies,
                s
            ];
            set({
                supplies: next
            });
            persist(next);
        },
        updateSupply: (s)=>{
            const next = get().supplies.map((x)=>x.id === s.id ? s : x);
            set({
                supplies: next
            });
            persist(next);
        },
        removeSupply: (id)=>{
            const next = get().supplies.filter((x)=>x.id !== id);
            set({
                supplies: next
            });
            persist(next);
        },
        consumeFilamentGrams: (grams)=>{
            if (grams <= 0) return;
            const current = [
                ...get().supplies
            ];
            let remaining = grams;
            for(let i = 0; i < current.length && remaining > 0; i += 1){
                const s = current[i];
                if (s.kind !== "filament") continue;
                // converte estoque para gramas
                let stockGrams = 0;
                if (s.unit === "kg") stockGrams = s.stockQty * 1000;
                else if (s.unit === "g") stockGrams = s.stockQty;
                else continue;
                if (stockGrams <= 0) continue;
                const consume = Math.min(stockGrams, remaining);
                stockGrams -= consume;
                remaining -= consume;
                const newStock = s.unit === "kg" ? stockGrams / 1000 : stockGrams; // mantém unidade original
                current[i] = {
                    ...s,
                    stockQty: newStock
                };
            }
            set({
                supplies: current
            });
            persist(current);
        }
    }));
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/calculator/InputPanel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "InputPanel",
    ()=>InputPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$settingsStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/store/settingsStore.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$suppliesStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/store/suppliesStore.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
function InputPanel({ form }) {
    _s();
    const { register, setValue, formState: { errors } } = form;
    const { settings } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$settingsStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSettingsStore"])();
    const customPresets = settings.printer?.customPresets ?? [];
    const { supplies, hydrateFromStorage } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$suppliesStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSuppliesStore"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "InputPanel.useEffect": ()=>{
            hydrateFromStorage();
        }
    }["InputPanel.useEffect"], [
        hydrateFromStorage
    ]);
    const defaultPresetValue = settings.printer?.presetId ?? "";
    const [selectedPrinterId, setSelectedPrinterId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(defaultPresetValue);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "InputPanel.useEffect": ()=>{
            setSelectedPrinterId(defaultPresetValue);
        }
    }["InputPanel.useEffect"], [
        defaultPresetValue
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                className: "text-sm font-semibold text-slate-100",
                children: "Parâmetros da impressão"
            }, void 0, false, {
                fileName: "[project]/components/calculator/InputPanel.tsx",
                lineNumber: 37,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "mb-1 block text-xs text-slate-300",
                        children: "Nome do item"
                    }, void 0, false, {
                        fileName: "[project]/components/calculator/InputPanel.tsx",
                        lineNumber: 42,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "text",
                        placeholder: "Ex: Suporte de celular, Organizador de bits",
                        className: "w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                        ...register("productName")
                    }, void 0, false, {
                        fileName: "[project]/components/calculator/InputPanel.tsx",
                        lineNumber: 45,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-0.5 text-[11px] text-slate-500",
                        children: "Nome usado ao salvar na lista de produtos"
                    }, void 0, false, {
                        fileName: "[project]/components/calculator/InputPanel.tsx",
                        lineNumber: 51,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/calculator/InputPanel.tsx",
                lineNumber: 41,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid gap-4 md:grid-cols-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs font-medium uppercase tracking-[0.18em] text-slate-400",
                                children: "Material"
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 58,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-2 text-sm",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "mb-1 block text-xs text-slate-300",
                                                children: "Filamento (preset de insumo)"
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 63,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                className: "w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                                onChange: (e)=>{
                                                    const id = e.target.value;
                                                    if (!id) return;
                                                    const sup = supplies.find((s)=>s.id === id);
                                                    if (!sup) return;
                                                    setValue("material.pricePerKg", sup.unitCost, {
                                                        shouldDirty: true
                                                    });
                                                },
                                                defaultValue: "",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "",
                                                        children: "Selecionar (opcional)"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                                        lineNumber: 77,
                                                        columnNumber: 17
                                                    }, this),
                                                    supplies.filter((s)=>s.kind === "filament").map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: s.id,
                                                            children: [
                                                                s.name,
                                                                " · ",
                                                                s.unitCost.toLocaleString("pt-BR", {
                                                                    style: "currency",
                                                                    currency: "BRL"
                                                                }),
                                                                "/",
                                                                s.unit
                                                            ]
                                                        }, s.id, true, {
                                                            fileName: "[project]/components/calculator/InputPanel.tsx",
                                                            lineNumber: 81,
                                                            columnNumber: 21
                                                        }, this))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 66,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 62,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "mb-1 block text-xs text-slate-300",
                                                children: "Peso da peça (g)"
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 89,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "number",
                                                step: "0.1",
                                                className: "w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                                ...register("material.weight", {
                                                    valueAsNumber: true
                                                })
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 92,
                                                columnNumber: 15
                                            }, this),
                                            errors.material?.weight && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "mt-1 text-xs text-rose-400",
                                                children: errors.material.weight.message
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 99,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 88,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "mb-1 block text-xs text-slate-300",
                                                children: "Custo do filamento (R$/kg)"
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 106,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "number",
                                                step: "0.1",
                                                className: "w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                                ...register("material.pricePerKg", {
                                                    valueAsNumber: true
                                                })
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 109,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 105,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "mb-1 block text-xs text-slate-300",
                                                children: "Tipo de material"
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 118,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                className: "w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                                ...register("material.type"),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "PLA",
                                                        children: "PLA"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                                        lineNumber: 125,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "ABS",
                                                        children: "ABS"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                                        lineNumber: 126,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "PETG",
                                                        children: "PETG"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                                        lineNumber: 127,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 121,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 117,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 61,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calculator/InputPanel.tsx",
                        lineNumber: 57,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs font-medium uppercase tracking-[0.18em] text-slate-400",
                                children: "Tempo & energia"
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 134,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-2 gap-2 text-sm",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-1.5",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "mb-1 block text-xs text-slate-300",
                                                children: "Duração (h/min)"
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 139,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "number",
                                                        min: 0,
                                                        step: 1,
                                                        className: "w-16 bg-transparent text-sm text-slate-100 outline-none",
                                                        value: Math.floor(Math.max(0, form.watch("time.hours") ?? 0)),
                                                        onChange: (e)=>{
                                                            const h = Math.max(0, parseInt(e.target.value, 10) || 0);
                                                            const total = form.getValues("time.hours") ?? 0;
                                                            const m = Math.min(59, Math.max(0, Math.round(total % 1 * 60)));
                                                            setValue("time.hours", h + m / 60, {
                                                                shouldDirty: true
                                                            });
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                                        lineNumber: 143,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-xs text-slate-400",
                                                        children: "h"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                                        lineNumber: 159,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "h-4 w-px bg-slate-800"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                                        lineNumber: 160,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "number",
                                                        min: 0,
                                                        max: 59,
                                                        step: 1,
                                                        className: "w-16 bg-transparent text-sm text-slate-100 outline-none",
                                                        value: Math.min(59, Math.max(0, Math.round((form.watch("time.hours") ?? 0) % 1 * 60))),
                                                        onChange: (e)=>{
                                                            const m = Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0));
                                                            const total = form.getValues("time.hours") ?? 0;
                                                            const h = Math.floor(Math.max(0, total));
                                                            setValue("time.hours", h + m / 60, {
                                                                shouldDirty: true
                                                            });
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                                        lineNumber: 161,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-xs text-slate-400",
                                                        children: "min"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                                        lineNumber: 184,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 142,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 138,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-1.5",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "mb-1 block text-xs text-slate-300",
                                                children: "Impressora / potência média"
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 188,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                className: "w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                                value: selectedPrinterId,
                                                onChange: (e)=>{
                                                    const value = e.target.value;
                                                    setSelectedPrinterId(value);
                                                    if (value === "") return;
                                                    if (value.startsWith("custom:")) {
                                                        const id = value.slice("custom:".length);
                                                        const preset = customPresets.find((p)=>p.id === id);
                                                        if (preset) {
                                                            setValue("time.powerW", preset.averagePowerW, {
                                                                shouldDirty: true
                                                            });
                                                            setValue("costs.printerCost", preset.printerCost, {
                                                                shouldDirty: true
                                                            });
                                                            setValue("costs.lifetimeHours", preset.lifetimeHours, {
                                                                shouldDirty: true
                                                            });
                                                            setValue("costs.annualMaintenance", preset.annualMaintenance ?? settings.defaults.annualMaintenance ?? 0, {
                                                                shouldDirty: true
                                                            });
                                                            setValue("costs.yearlyPrintHours", preset.yearlyPrintHours ?? settings.defaults.yearlyPrintHours ?? 1000, {
                                                                shouldDirty: true
                                                            });
                                                        }
                                                        return;
                                                    }
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "",
                                                        children: "Selecionar"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                                        lineNumber: 226,
                                                        columnNumber: 17
                                                    }, this),
                                                    customPresets.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("optgroup", {
                                                        label: "Personalizados",
                                                        children: customPresets.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: `custom:${p.id}`,
                                                                children: [
                                                                    p.name,
                                                                    " · ",
                                                                    p.averagePowerW,
                                                                    "W"
                                                                ]
                                                            }, p.id, true, {
                                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                                lineNumber: 230,
                                                                columnNumber: 23
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                                        lineNumber: 228,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 191,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "number",
                                                step: "1",
                                                className: "w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                                value: form.watch("time.powerW") ?? "",
                                                onChange: (e)=>{
                                                    const v = e.target.value === "" ? 0 : Number(e.target.value);
                                                    setValue("time.powerW", Number.isFinite(v) ? v : 0, {
                                                        shouldDirty: true
                                                    });
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 237,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 187,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 137,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-2 gap-2 text-sm",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "mb-1 block text-xs text-slate-300",
                                                children: "Energia (R$/kWh)"
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 254,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "number",
                                                step: "0.01",
                                                className: "w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                                ...register("costs.kwhPrice", {
                                                    valueAsNumber: true
                                                })
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 257,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 253,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "mb-1 block text-xs text-slate-300",
                                                children: "Embalagem (R$)"
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 265,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "number",
                                                step: "0.1",
                                                className: "w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                                ...register("costs.packaging", {
                                                    valueAsNumber: true
                                                })
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 268,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 264,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 252,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-2 gap-2 text-sm",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "mb-1 block text-xs text-slate-300",
                                                children: "Custo da impressora (R$)"
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 279,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "number",
                                                step: "10",
                                                className: "w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                                ...register("costs.printerCost", {
                                                    valueAsNumber: true
                                                })
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 282,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 278,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "mb-1 block text-xs text-slate-300",
                                                children: "Vida útil (h)"
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 290,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "number",
                                                step: "10",
                                                className: "w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                                ...register("costs.lifetimeHours", {
                                                    valueAsNumber: true
                                                })
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 293,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 289,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 277,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calculator/InputPanel.tsx",
                        lineNumber: 133,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/calculator/InputPanel.tsx",
                lineNumber: 56,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid items-start gap-4 md:grid-cols-2 lg:grid-cols-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-2 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs font-medium uppercase tracking-[0.18em] text-slate-400",
                                children: "Tipo de conta (CPF/CNPJ)"
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 306,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        className: "w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                        ...register("pricing.personType"),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "CPF",
                                                children: "Pessoa Física (CPF)"
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 314,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "CNPJ",
                                                children: "Pessoa Jurídica (CNPJ)"
                                            }, void 0, false, {
                                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                                lineNumber: 315,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 310,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-0.5 text-[11px] text-slate-500",
                                        children: "Vale para Shopee e Mercado Livre (taxa fixa e comissão)"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 317,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 309,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calculator/InputPanel.tsx",
                        lineNumber: 305,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-2 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs font-medium uppercase tracking-[0.18em] text-slate-400",
                                children: "Margem desejada"
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 324,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "mb-1 block text-xs text-slate-300",
                                        children: "Margem alvo (%)"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 328,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "number",
                                        step: "0.1",
                                        className: "w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                        ...register("pricing.desiredMargin", {
                                            valueAsNumber: true
                                        })
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 331,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 327,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calculator/InputPanel.tsx",
                        lineNumber: 323,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-2 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs font-medium uppercase tracking-[0.18em] text-slate-400",
                                children: "Comparar preço"
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 341,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "mb-1 block text-xs text-slate-300",
                                        children: "Preço desejado (R$)"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 345,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "number",
                                        step: "0.01",
                                        min: 0,
                                        placeholder: "Ex: 49,90",
                                        className: "w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                        ...register("pricing.comparePrice", {
                                            valueAsNumber: true
                                        })
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 348,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-0.5 text-[11px] text-slate-500",
                                        children: "Quanto você ganharia vendendo a esse preço"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 356,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 344,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calculator/InputPanel.tsx",
                        lineNumber: 340,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-2 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs font-medium uppercase tracking-[0.18em] text-slate-400",
                                children: "Promoção"
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 363,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "mb-1 block text-xs text-slate-300",
                                        children: "Desconto promo (%)"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 367,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "number",
                                        step: "1",
                                        min: 0,
                                        max: 99,
                                        placeholder: "0",
                                        className: "w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                        ...register("pricing.discountPercent", {
                                            valueAsNumber: true
                                        })
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 370,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-0.5 text-[11px] text-slate-500",
                                        children: "Preço a anunciar calculado para manter margem"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 379,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 366,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calculator/InputPanel.tsx",
                        lineNumber: 362,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/calculator/InputPanel.tsx",
                lineNumber: 304,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid items-start gap-4 md:grid-cols-2 lg:grid-cols-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "mb-1 block text-xs text-slate-300",
                                children: "Frete estimado (R$)"
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 388,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "number",
                                step: "0.01",
                                min: 0,
                                className: "w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                ...register("pricing.shippingEstimate", {
                                    valueAsNumber: true
                                })
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 391,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calculator/InputPanel.tsx",
                        lineNumber: 387,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "mb-1 block text-xs text-slate-300",
                                children: "Imposto sobre venda (%)"
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 400,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "number",
                                step: "0.1",
                                min: 0,
                                max: 100,
                                className: "w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                ...register("pricing.taxPercent", {
                                    valueAsNumber: true
                                })
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 403,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calculator/InputPanel.tsx",
                        lineNumber: 399,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col justify-end",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "mb-1 flex items-center gap-2 text-xs text-slate-300",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "checkbox",
                                        className: "rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500",
                                        ...register("pricing.freeShipping")
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 414,
                                        columnNumber: 13
                                    }, this),
                                    "Frete Grátis (Shopee)"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 413,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[11px] text-slate-500",
                                children: "Taxa 20% quando ativo"
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 421,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calculator/InputPanel.tsx",
                        lineNumber: 412,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col justify-end",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "mb-1 flex items-center gap-2 text-xs text-slate-300",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "checkbox",
                                        className: "rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500",
                                        ...register("pricing.mlClassic")
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/InputPanel.tsx",
                                        lineNumber: 427,
                                        columnNumber: 17
                                    }, this),
                                    "Mercado Livre Clássico (13% + R$ 6,50)"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 426,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[11px] text-slate-500",
                                children: "Desmarcado = Premium 16% com taxa fixa por faixa."
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/InputPanel.tsx",
                                lineNumber: 434,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calculator/InputPanel.tsx",
                        lineNumber: 425,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/calculator/InputPanel.tsx",
                lineNumber: 386,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/calculator/InputPanel.tsx",
        lineNumber: 36,
        columnNumber: 5
    }, this);
}
_s(InputPanel, "li9eunSRk4usLQNcFVK68eoyecg=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$settingsStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSettingsStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$suppliesStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSuppliesStore"]
    ];
});
_c = InputPanel;
var _c;
__turbopack_context__.k.register(_c, "InputPanel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/charts/CostBreakdownChart.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CostBreakdownChart",
    ()=>CostBreakdownChart
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/ResponsiveContainer.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$BarChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/chart/BarChart.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Bar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/Bar.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/XAxis.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/YAxis.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Tooltip.js [app-client] (ecmascript)");
;
;
const formatCurrency = (value)=>value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
function CostBreakdownChart({ items }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "h-56 rounded-xl bg-slate-950/60 p-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400",
                children: "Distribuição dos custos"
            }, void 0, false, {
                fileName: "[project]/components/charts/CostBreakdownChart.tsx",
                lineNumber: 26,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ResponsiveContainer"], {
                width: "100%",
                height: "100%",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$BarChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BarChart"], {
                    data: items,
                    margin: {
                        left: -20
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["XAxis"], {
                            dataKey: "name",
                            tick: {
                                fontSize: 10,
                                fill: "#9ca3af"
                            },
                            axisLine: false,
                            tickLine: false
                        }, void 0, false, {
                            fileName: "[project]/components/charts/CostBreakdownChart.tsx",
                            lineNumber: 31,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["YAxis"], {
                            tick: {
                                fontSize: 10,
                                fill: "#6b7280"
                            },
                            axisLine: false,
                            tickLine: false,
                            tickFormatter: formatCurrency
                        }, void 0, false, {
                            fileName: "[project]/components/charts/CostBreakdownChart.tsx",
                            lineNumber: 37,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Tooltip"], {
                            cursor: {
                                fill: "rgba(15,23,42,0.6)"
                            },
                            contentStyle: {
                                backgroundColor: "#020617",
                                borderColor: "#1f2937",
                                borderRadius: 12,
                                fontSize: 11
                            },
                            formatter: (value)=>formatCurrency(value)
                        }, void 0, false, {
                            fileName: "[project]/components/charts/CostBreakdownChart.tsx",
                            lineNumber: 43,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Bar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Bar"], {
                            dataKey: "value",
                            radius: [
                                8,
                                8,
                                0,
                                0
                            ],
                            label: false,
                            style: {
                                transition: "all 0.2s ease-out"
                            },
                            children: items.map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("cell", {
                                    fill: entry.color
                                }, entry.name, false, {
                                    fileName: "[project]/components/charts/CostBreakdownChart.tsx",
                                    lineNumber: 60,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/components/charts/CostBreakdownChart.tsx",
                            lineNumber: 53,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/charts/CostBreakdownChart.tsx",
                    lineNumber: 30,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/charts/CostBreakdownChart.tsx",
                lineNumber: 29,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/charts/CostBreakdownChart.tsx",
        lineNumber: 25,
        columnNumber: 5
    }, this);
}
_c = CostBreakdownChart;
var _c;
__turbopack_context__.k.register(_c, "CostBreakdownChart");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/calculator/ResultsPanel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ResultsPanel",
    ()=>ResultsPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$charts$2f$CostBreakdownChart$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/charts/CostBreakdownChart.tsx [app-client] (ecmascript)");
;
;
const fmt = (v)=>v.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
function ResultsPanel({ results, isDirty }) {
    if (!results) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-4 text-center text-sm text-slate-400",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: "Preencha os dados da impressão à esquerda para ver o custo completo, preço sugerido e lucro por venda."
            }, void 0, false, {
                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                lineNumber: 16,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/calculator/ResultsPanel.tsx",
            lineNumber: 15,
            columnNumber: 7
        }, this);
    }
    const { totalCost, minimumPrice, suggestedPrice, suggestedPriceShopee, suggestedPriceML, profitPerSale, margin, cascataShopee, cascataML, priceToAnnounceForPromo, profitPerHour, compareAtPriceResult } = results;
    const worstChannel = cascataShopee.netProfit <= cascataML.netProfit ? cascataShopee : cascataML;
    const costChartItems = [
        {
            name: "Filamento",
            value: results.filamentCost,
            color: "#22d3ee"
        },
        {
            name: "Energia",
            value: results.energyCost,
            color: "#a855f7"
        },
        {
            name: "Depreciação + fixos",
            value: results.depreciationCost,
            color: "#10b981"
        },
        {
            name: "Embalagem",
            value: results.packagingCost,
            color: "#64748b"
        },
        {
            name: "Taxa % marketplace",
            value: worstChannel.commissionAmount,
            color: "#fb7185"
        },
        {
            name: "Taxa fixa",
            value: worstChannel.fixedFeeAmount,
            color: "#f97316"
        },
        {
            name: "Frete",
            value: worstChannel.shippingAmount,
            color: "#eab308"
        },
        {
            name: "Imposto",
            value: worstChannel.taxAmount,
            color: "#facc15"
        }
    ];
    const profitPositive = profitPerSale >= 0;
    const CascataBlock = ({ title, c, isShopee })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400",
                    children: title
                }, void 0, false, {
                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                    lineNumber: 97,
                    columnNumber: 7
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                    className: "space-y-1 text-slate-300",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            className: "flex justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Venda"
                                }, void 0, false, {
                                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                    lineNumber: 102,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "font-medium text-slate-100",
                                    children: fmt(c.sellingPrice)
                                }, void 0, false, {
                                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                    lineNumber: 103,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/calculator/ResultsPanel.tsx",
                            lineNumber: 101,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            className: "flex justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Taxa % (venda × taxa)"
                                }, void 0, false, {
                                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                    lineNumber: 106,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-rose-400",
                                    children: [
                                        "− ",
                                        fmt(c.commissionAmount)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                    lineNumber: 107,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/calculator/ResultsPanel.tsx",
                            lineNumber: 105,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            className: "flex justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: isShopee ? "Taxa fixa (automática)" : "Taxa fixa"
                                }, void 0, false, {
                                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                    lineNumber: 112,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-rose-400",
                                    children: [
                                        "− ",
                                        fmt(c.fixedFeeAmount)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                    lineNumber: 113,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/calculator/ResultsPanel.tsx",
                            lineNumber: 111,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            className: "flex justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Frete"
                                }, void 0, false, {
                                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                    lineNumber: 116,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-rose-400",
                                    children: [
                                        "− ",
                                        fmt(c.shippingAmount)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                    lineNumber: 117,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/calculator/ResultsPanel.tsx",
                            lineNumber: 115,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            className: "flex justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Embalagem"
                                }, void 0, false, {
                                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                    lineNumber: 120,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-rose-400",
                                    children: [
                                        "− ",
                                        fmt(c.packagingCost)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                    lineNumber: 121,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/calculator/ResultsPanel.tsx",
                            lineNumber: 119,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            className: "flex justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Imposto"
                                }, void 0, false, {
                                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                    lineNumber: 124,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-rose-400",
                                    children: [
                                        "− ",
                                        fmt(c.taxAmount)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                    lineNumber: 125,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/calculator/ResultsPanel.tsx",
                            lineNumber: 123,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            className: "flex justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Custo do produto (produção)"
                                }, void 0, false, {
                                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                    lineNumber: 128,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-rose-400",
                                    children: [
                                        "− ",
                                        fmt(c.totalCost)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                    lineNumber: 129,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/calculator/ResultsPanel.tsx",
                            lineNumber: 127,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            className: "flex justify-between border-t border-slate-800 pt-2 font-medium",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Lucro líquido"
                                }, void 0, false, {
                                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                    lineNumber: 132,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: c.netProfit >= 0 ? "text-emerald-400" : "text-rose-400",
                                    children: fmt(c.netProfit)
                                }, void 0, false, {
                                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                    lineNumber: 133,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/calculator/ResultsPanel.tsx",
                            lineNumber: 131,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            className: "flex justify-between font-medium",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Margem líquida (Lucro / Venda)"
                                }, void 0, false, {
                                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                    lineNumber: 138,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: c.netProfit >= 0 ? "text-emerald-400" : "text-rose-400",
                                    children: [
                                        c.marginPercent.toFixed(1),
                                        "%"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                    lineNumber: 139,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/calculator/ResultsPanel.tsx",
                            lineNumber: 137,
                            columnNumber: 9
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/calculator/ResultsPanel.tsx",
                    lineNumber: 100,
                    columnNumber: 7
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/calculator/ResultsPanel.tsx",
            lineNumber: 96,
            columnNumber: 5
        }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col gap-4 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950/80 via-slate-950/70 to-slate-900/80 p-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap items-start justify-between gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs uppercase tracking-[0.18em] text-slate-400",
                                children: "Resultado da simulação"
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 151,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-1 text-2xl font-semibold text-slate-50",
                                children: fmt(suggestedPrice)
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 154,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-slate-400",
                                children: "Preços sugeridos por canal para a mesma margem alvo."
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 155,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                        lineNumber: 150,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-xl bg-emerald-500/10 px-3 py-2 text-right text-xs text-emerald-400",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "font-semibold",
                                children: profitPositive ? "Lucro líquido (pior canal)" : "Prejuízo"
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 160,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-slate-50",
                                children: [
                                    fmt(profitPerSale),
                                    " (",
                                    margin.toFixed(1),
                                    "%)"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 163,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-0.5 text-[10px] text-slate-400",
                                children: [
                                    fmt(profitPerHour),
                                    "/h"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 166,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                        lineNumber: 159,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-xl bg-slate-950/40 px-3 py-2 text-right text-xs text-slate-300",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "font-semibold text-slate-100",
                                children: "Sugestões"
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 171,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-0.5",
                                children: [
                                    "Shopee: ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold text-slate-50",
                                        children: fmt(suggestedPriceShopee)
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                        lineNumber: 173,
                                        columnNumber: 21
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 172,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-0.5",
                                children: [
                                    "ML: ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold text-slate-50",
                                        children: fmt(suggestedPriceML)
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                        lineNumber: 176,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 175,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                        lineNumber: 170,
                        columnNumber: 9
                    }, this),
                    compareAtPriceResult && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-xl bg-cyan-500/10 px-3 py-2 text-right text-xs text-cyan-400",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "font-semibold",
                                children: "Preço desejado"
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 181,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-slate-50",
                                children: fmt(compareAtPriceResult.sellingPrice)
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 182,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-0.5 text-slate-300",
                                children: [
                                    "Shopee:",
                                    " ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: compareAtPriceResult.shopee.netProfit >= 0 ? "text-emerald-400" : "text-rose-400",
                                        children: [
                                            fmt(compareAtPriceResult.shopee.netProfit),
                                            " (",
                                            compareAtPriceResult.shopee.marginPercent.toFixed(1),
                                            "%)"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                        lineNumber: 187,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 185,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-0.5 text-slate-300",
                                children: [
                                    "ML:",
                                    " ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: compareAtPriceResult.ml.netProfit >= 0 ? "text-emerald-400" : "text-rose-400",
                                        children: [
                                            fmt(compareAtPriceResult.ml.netProfit),
                                            " (",
                                            compareAtPriceResult.ml.marginPercent.toFixed(1),
                                            "%)"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                        lineNumber: 193,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 191,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-0.5 text-[10px] text-slate-400",
                                children: [
                                    fmt(Math.min(compareAtPriceResult.shopee.profitPerHour, compareAtPriceResult.ml.profitPerHour)),
                                    "/h"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 197,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                        lineNumber: 180,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                lineNumber: 149,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid gap-4 md:grid-cols-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CascataBlock, {
                        title: "Detalhamento do cálculo (Shopee)",
                        c: cascataShopee,
                        isShopee: true
                    }, void 0, false, {
                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                        lineNumber: 205,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CascataBlock, {
                        title: "Detalhamento do cálculo (ML)",
                        c: cascataML,
                        isShopee: false
                    }, void 0, false, {
                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                        lineNumber: 206,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                lineNumber: 204,
                columnNumber: 7
            }, this),
            priceToAnnounceForPromo != null && priceToAnnounceForPromo > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 text-xs",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mb-1 font-semibold text-purple-300",
                        children: "Promoção com lucro preservado"
                    }, void 0, false, {
                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                        lineNumber: 211,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-slate-300",
                        children: [
                            "Anuncie por ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                className: "text-slate-100",
                                children: fmt(priceToAnnounceForPromo)
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 215,
                                columnNumber: 25
                            }, this),
                            " para que, após o desconto, o cliente pague ",
                            fmt(suggestedPrice),
                            " e sua margem se mantenha."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                        lineNumber: 214,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                lineNumber: 210,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid gap-4 text-xs md:grid-cols-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-2 rounded-xl bg-slate-950/50 p-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400",
                                children: "Custo total"
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 222,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-lg font-semibold text-slate-100",
                                children: fmt(totalCost)
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 225,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                        lineNumber: 221,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-2 rounded-xl bg-slate-950/50 p-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400",
                                children: "Preço mínimo"
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 228,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-lg font-semibold text-slate-100",
                                children: fmt(minimumPrice)
                            }, void 0, false, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 231,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                        lineNumber: 227,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                lineNumber: 220,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400",
                        children: "Detalhamento do custo do produto (produção)"
                    }, void 0, false, {
                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                        lineNumber: 236,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "space-y-1 text-slate-300",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                className: "flex justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Energia elétrica"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                        lineNumber: 241,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-slate-100",
                                        children: fmt(results.energyCost)
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                        lineNumber: 242,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 240,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                className: "flex justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Filamento"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                        lineNumber: 245,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-slate-100",
                                        children: fmt(results.filamentCost)
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                        lineNumber: 246,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 244,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                className: "flex justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Depreciação + fixos"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                        lineNumber: 249,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-slate-100",
                                        children: fmt(results.depreciationCost)
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                        lineNumber: 250,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 248,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                className: "flex justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Embalagem"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                        lineNumber: 253,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-slate-100",
                                        children: fmt(results.packagingCost)
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                        lineNumber: 254,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 252,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                className: "flex justify-between border-t border-slate-800 pt-2 font-medium text-slate-100",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Custo total"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                        lineNumber: 257,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: fmt(totalCost)
                                    }, void 0, false, {
                                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                        lineNumber: 258,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                                lineNumber: 256,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calculator/ResultsPanel.tsx",
                        lineNumber: 239,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                lineNumber: 235,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$charts$2f$CostBreakdownChart$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CostBreakdownChart"], {
                items: costChartItems
            }, void 0, false, {
                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                lineNumber: 263,
                columnNumber: 7
            }, this),
            !isDirty && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-[11px] text-slate-500",
                children: "Dica: ajuste os parâmetros nas configurações (kWh, impressora, margem)."
            }, void 0, false, {
                fileName: "[project]/components/calculator/ResultsPanel.tsx",
                lineNumber: 266,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/calculator/ResultsPanel.tsx",
        lineNumber: 148,
        columnNumber: 5
    }, this);
}
_c = ResultsPanel;
var _c;
__turbopack_context__.k.register(_c, "ResultsPanel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/constants.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_MARKETPLACE_FEES",
    ()=>DEFAULT_MARKETPLACE_FEES,
    "MARKETPLACES",
    ()=>MARKETPLACES,
    "PRINTER_PRESETS",
    ()=>PRINTER_PRESETS
]);
const MARKETPLACES = [
    "Shopee",
    "Mercado Livre",
    "Amazon"
];
const PRINTER_PRESETS = [
    {
        id: "bambu-x1c",
        name: "Bambu Lab X1 Carbon",
        averagePowerW: 105,
        peakPowerW: 400
    },
    {
        id: "bambu-p1s",
        name: "Bambu Lab P1S",
        averagePowerW: 105,
        peakPowerW: 280
    },
    {
        id: "bambu-p1p",
        name: "Bambu Lab P1P",
        averagePowerW: 110,
        peakPowerW: 300
    },
    {
        id: "bambu-a1",
        name: "Bambu Lab A1",
        averagePowerW: 95,
        peakPowerW: 350
    },
    {
        id: "bambu-a1-mini",
        name: "Bambu Lab A1 Mini",
        averagePowerW: 85,
        peakPowerW: 280
    },
    {
        id: "prusa-mk4",
        name: "Prusa MK4",
        averagePowerW: 100,
        peakPowerW: 160
    },
    {
        id: "elegoo-neptune-4",
        name: "Elegoo Neptune 4",
        averagePowerW: 275,
        peakPowerW: 350
    },
    {
        id: "elegoo-neptune-4-pro",
        name: "Elegoo Neptune 4 Pro",
        averagePowerW: 325,
        peakPowerW: 400
    },
    {
        id: "creality-ender-3",
        name: "Creality Ender 3 Pro/V2",
        averagePowerW: 125,
        peakPowerW: 360
    },
    {
        id: "creality-k1-max",
        name: "Creality K1 Max",
        averagePowerW: 990,
        peakPowerW: 1093
    },
    {
        id: "anycubic-kobra-2",
        name: "Anycubic Kobra 2",
        averagePowerW: 150,
        peakPowerW: 400
    }
];
const DEFAULT_MARKETPLACE_FEES = {
    Shopee: {
        // Ex.: 12% + taxa fixa diluída para tickets médios sem frete grátis.
        CPF: 18,
        // CNPJ geralmente tem comissão próxima de 14% + taxa fixa → média ~20%.
        CNPJ: 20
    },
    "Mercado Livre": {
        // CPF (anúncio Clássico em categorias comuns).
        CPF: 16,
        // CNPJ tende a operar mais em anúncios Premium e full → margem maior.
        CNPJ: 18
    },
    Amazon: {
        CPF: 15,
        CNPJ: 15
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/types/index.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "calculatorSchema",
    ()=>calculatorSchema,
    "settingsSchema",
    ()=>settingsSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-client] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/constants.ts [app-client] (ecmascript)");
;
;
const calculatorSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    productName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    material: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        weight: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(1, "Informe o peso da peça"),
        pricePerKg: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(1, "Informe o custo do filamento/kg"),
        type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            "PLA",
            "ABS",
            "PETG"
        ])
    }),
    time: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        hours: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0, "Tempo de impressão inválido"),
        powerW: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(10, "Potência inválida")
    }),
    costs: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        kwhPrice: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0.01),
        printerCost: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0),
        lifetimeHours: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(1),
        residualValue: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).default(0),
        annualMaintenance: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).default(0),
        infrastructureYear: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).default(0),
        yearlyPrintHours: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).default(1),
        packaging: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0)
    }),
    pricing: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        marketplace: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MARKETPLACES"]),
        personType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            "CPF",
            "CNPJ"
        ]),
        marketplaceFee: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).max(100),
        desiredMargin: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).max(90),
        shippingEstimate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan()
        ]).transform((n)=>typeof n === "number" && !Number.isNaN(n) ? n : 0).pipe(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0)),
        taxPercent: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan()
        ]).transform((n)=>typeof n === "number" && !Number.isNaN(n) ? n : 0).pipe(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).max(100)),
        taxMode: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            "gross",
            "net_marketplace"
        ]).default("net_marketplace"),
        mlClassic: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(false),
        freeShipping: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(false),
        discountPercent: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan()
        ]).transform((n)=>typeof n === "number" && !Number.isNaN(n) ? n : 0).pipe(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).max(99)),
        /** Preço de venda desejado para comparar (ex.: preço do concorrente). Opcional. */ comparePrice: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].undefined()
        ]).optional().transform((n)=>typeof n === "number" && !Number.isNaN(n) && n > 0 ? n : undefined)
    })
});
const settingsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    currency: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "BRL",
        "USD"
    ]),
    defaults: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        kwhPrice: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan()
        ]).transform((n)=>typeof n === "number" && !Number.isNaN(n) ? n : 0),
        printerCost: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan()
        ]).transform((n)=>typeof n === "number" && !Number.isNaN(n) ? n : 0),
        residualValue: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan()
        ]).transform((n)=>typeof n === "number" && !Number.isNaN(n) ? n : 0).default(0),
        lifetimeHours: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan()
        ]).transform((n)=>typeof n === "number" && !Number.isNaN(n) ? n : 0),
        annualMaintenance: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan()
        ]).transform((n)=>typeof n === "number" && !Number.isNaN(n) ? n : 0).default(0),
        infrastructureYear: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan()
        ]).transform((n)=>typeof n === "number" && !Number.isNaN(n) ? n : 0).default(0),
        yearlyPrintHours: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan()
        ]).transform((n)=>typeof n === "number" && !Number.isNaN(n) ? n : 0).default(1000),
        packaging: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan()
        ]).transform((n)=>typeof n === "number" && !Number.isNaN(n) ? n : 0),
        desiredMargin: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan()
        ]).transform((n)=>typeof n === "number" && !Number.isNaN(n) ? n : 0),
        shippingEstimateDefault: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan()
        ]).transform((n)=>typeof n === "number" && !Number.isNaN(n) ? n : 0).default(0),
        shopeeFreeShippingDefault: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(false),
        taxMode: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            "gross",
            "net_marketplace"
        ]).default("net_marketplace"),
        mlClassic: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(false)
    }),
    printer: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        presetId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
        customName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
        customPowerW: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].undefined()
        ]).transform((n)=>typeof n === "number" && !Number.isNaN(n) ? n : undefined).optional(),
        customPrinterCost: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].undefined()
        ]).transform((n)=>typeof n === "number" && !Number.isNaN(n) ? n : undefined).optional(),
        customLifetimeHours: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].undefined()
        ]).transform((n)=>typeof n === "number" && !Number.isNaN(n) ? n : undefined).optional(),
        customAnnualMaintenance: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].undefined()
        ]).transform((n)=>typeof n === "number" && !Number.isNaN(n) ? n : undefined).optional(),
        customYearlyPrintHours: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].nan(),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].undefined()
        ]).transform((n)=>typeof n === "number" && !Number.isNaN(n) ? n : undefined).optional(),
        customPresets: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
            id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
            name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1),
            averagePowerW: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(1),
            printerCost: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0),
            lifetimeHours: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(1),
            annualMaintenance: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).default(0),
            yearlyPrintHours: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).default(1)
        })).default([])
    })
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/marketplaceFees.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Motor de taxas 2026 – Shopee e Mercado Livre.
 *
 * Shopee:
 * - Padrão: 14% comissão, taxa fixa R$ 4 (CNPJ) / R$ 7 (CPF), teto comissão R$ 100.
 * - Frete Grátis: 20% (14%+6%), mesma taxa fixa.
 * - Produtos < R$ 10: taxa fixa proporcional (até metade do valor) = preço/2.
 *
 * Mercado Livre:
 * - Clássico ~10–14%, Premium ~16–19%. Taxa fixa histórica < R$ 79 (a partir mar/2026 é variável).
 */ __turbopack_context__.s([
    "getEffectiveMarketplaceFeePercent",
    ()=>getEffectiveMarketplaceFeePercent,
    "getMLFeeBreakdown",
    ()=>getMLFeeBreakdown,
    "getMLSuggestedPrice",
    ()=>getMLSuggestedPrice,
    "getMercadoLivreEffectiveFeePercent",
    ()=>getMercadoLivreEffectiveFeePercent,
    "getShopeeEffectiveFeePercent",
    ()=>getShopeeEffectiveFeePercent,
    "getShopeeFeeBreakdown",
    ()=>getShopeeFeeBreakdown,
    "getShopeeSuggestedPrice",
    ()=>getShopeeSuggestedPrice
]);
const SHOPEE_COMMISSION_CAP = 100;
// Shopee: taxa fixa sempre R$ 4 (configuração do app).
function getShopeeFixedFee() {
    return 4;
}
function getShopeeCommissionPercent(freeShipping) {
    return freeShipping ? 20 : 14; // Padrão 14%; Frete Grátis 20%
}
function getShopeeEffectiveFeePercent(personType, price, freeShipping) {
    if (price <= 0) return 20;
    const commissionPct = getShopeeCommissionPercent(freeShipping);
    const fixedFee = getShopeeFixedFee();
    const commissionAmount = Math.min(price * commissionPct / 100, SHOPEE_COMMISSION_CAP);
    const totalFee = commissionAmount + fixedFee;
    return totalFee / price * 100;
}
// Mercado Livre: taxa fixa histórica (até fev/2026). A partir mar/2026 é variável para itens < R$ 79.
const ML_FIXED_FEE_BANDS = [
    {
        max: 12.5,
        fee: 6.25
    },
    {
        max: 29,
        fee: 6.25
    },
    {
        max: 50,
        fee: 6.5
    },
    {
        max: 79,
        fee: 6.75
    }
];
function getMLFixedFee(price) {
    if (price >= 79) return 0;
    const band = ML_FIXED_FEE_BANDS.find((b)=>price <= b.max);
    return band ? band.fee : price / 2; // < R$ 12,50: 50% do valor
}
function getMercadoLivreEffectiveFeePercent(personType, price, options = {}) {
    if (price <= 0) return 16;
    const isClassic = options.classic ?? false;
    const basePct = isClassic ? 13 : 16;
    const fixedFee = isClassic ? 6.5 : getMLFixedFee(price);
    const commissionAmount = price * basePct / 100;
    const totalFee = commissionAmount + fixedFee;
    return totalFee / price * 100;
}
function getEffectiveMarketplaceFeePercent(marketplace, personType, price, options = {}) {
    if (marketplace === "Shopee") {
        return getShopeeEffectiveFeePercent(personType, price, options.freeShipping ?? false);
    }
    if (marketplace === "Mercado Livre") {
        return getMercadoLivreEffectiveFeePercent(personType, price, {
            classic: options.classicML ?? false
        });
    }
    return 15;
}
function getShopeeFeeBreakdown(price, personType, freeShipping) {
    const commissionPct = getShopeeCommissionPercent(freeShipping);
    const commissionAmount = Math.min(price * commissionPct / 100, SHOPEE_COMMISSION_CAP);
    const fixedFeeAmount = getShopeeFixedFee();
    return {
        commissionRateDecimal: commissionPct / 100,
        commissionAmount,
        fixedFeeAmount
    };
}
function getMLFeeBreakdown(price, personType, classic = false) {
    const basePct = classic ? 13 : 16;
    const commissionAmount = price * basePct / 100;
    const fixedFeeAmount = classic ? 6.5 : getMLFixedFee(price);
    return {
        commissionRateDecimal: basePct / 100,
        commissionAmount,
        fixedFeeAmount
    };
}
function getShopeeSuggestedPrice(params) {
    const { totalCost, shippingAmount, taxPercent, desiredMarginPercent, freeShipping, personType } = params;
    const commissionPct = getShopeeCommissionPercent(freeShipping);
    const fee = commissionPct / 100;
    const tax = taxPercent / 100;
    const margin = desiredMarginPercent / 100;
    const divisor = 1 - fee - tax - margin;
    if (divisor <= 0) return totalCost + shippingAmount;
    const fixedFee = getShopeeFixedFee();
    return (totalCost + shippingAmount + fixedFee) / divisor;
}
function getMLSuggestedPrice(params) {
    const { totalCost, shippingAmount, taxPercent, desiredMarginPercent, personType, classic } = params;
    const tax = taxPercent / 100;
    const targetMargin = Math.max(0, Math.min(desiredMarginPercent / 100, 0.9));
    function marginAtPrice(price) {
        if (price <= 0) return 0;
        const feePct = getMercadoLivreEffectiveFeePercent(personType, price, {
            classic
        });
        const feeRate = feePct / 100;
        const netProfit = price * (1 - feeRate - tax) - shippingAmount - totalCost;
        return netProfit / price;
    }
    // Intervalo de busca: de custo+frete até 10x esse valor.
    let low = totalCost + shippingAmount;
    let high = low * 10;
    // Se mesmo em high não atinge a margem desejada, retorna high.
    if (marginAtPrice(high) < targetMargin) {
        return high;
    }
    // Busca binária para encontrar o menor preço que atinge a margem alvo.
    for(let i = 0; i < 40; i++){
        const mid = (low + high) / 2;
        const m = marginAtPrice(mid);
        if (m >= targetMargin) {
            high = mid;
        } else {
            low = mid;
        }
    }
    return high;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/calculations.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "calcDepreciation",
    ()=>calcDepreciation,
    "calcEnergyCost",
    ()=>calcEnergyCost,
    "calcFilamentCost",
    ()=>calcFilamentCost,
    "calcMarginPercentage",
    ()=>calcMarginPercentage,
    "calcMinimumPrice",
    ()=>calcMinimumPrice,
    "calcPriceToAnnounceForPromo",
    ()=>calcPriceToAnnounceForPromo,
    "calcProfit",
    ()=>calcProfit,
    "calcSuggestedPrice",
    ()=>calcSuggestedPrice,
    "calcTotalCost",
    ()=>calcTotalCost,
    "calculateAll",
    ()=>calculateAll,
    "simulateProfitFromCompetitor",
    ()=>simulateProfitFromCompetitor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$marketplaceFees$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/marketplaceFees.ts [app-client] (ecmascript)");
;
function calcFilamentCost(weight, pricePerKg) {
    return weight / 1000 * pricePerKg;
}
function calcEnergyCost(powerW, hours, kwhPrice) {
    return powerW / 1000 * hours * kwhPrice;
}
function calcDepreciation(params) {
    const { printerCost, residualValue, lifetimeHours, annualMaintenance, infrastructureYear, yearlyPrintHours, printHours } = params;
    if (!printHours || printHours <= 0) return 0;
    if (!lifetimeHours || lifetimeHours <= 0) return 0;
    const depreciationPerHour = (printerCost - residualValue) / lifetimeHours;
    const dilutionBase = yearlyPrintHours && yearlyPrintHours > 0 ? yearlyPrintHours : 0;
    const maintenancePerHour = dilutionBase > 0 ? annualMaintenance / dilutionBase : 0;
    const infrastructurePerHour = dilutionBase > 0 ? infrastructureYear / dilutionBase : 0;
    const machineHourCost = depreciationPerHour + maintenancePerHour + infrastructurePerHour;
    return machineHourCost * printHours;
}
function calcTotalCost(params) {
    const { filamentCost, energyCost, depreciationCost, packagingCost } = params;
    return filamentCost + energyCost + depreciationCost + packagingCost;
}
function calcSuggestedPrice(params) {
    const { totalCost, marketplaceFeePercent, desiredMarginPercent, shippingAmount = 0, taxPercent = 0 } = params;
    const fee = marketplaceFeePercent / 100;
    const margin = desiredMarginPercent / 100;
    const tax = taxPercent / 100;
    const divisor = 1 - fee - tax - margin;
    if (divisor <= 0) return totalCost + shippingAmount;
    return (totalCost + shippingAmount) / divisor;
}
function calcMinimumPrice(params) {
    const { totalCost, marketplaceFeePercent } = params;
    const fee = marketplaceFeePercent / 100;
    const divisor = 1 - fee;
    if (divisor <= 0) return totalCost;
    return totalCost / divisor;
}
function calcProfit(price, cost) {
    return price - cost;
}
function calcMarginPercentage(price, cost) {
    if (price === 0) return 0;
    return (price - cost) / price * 100;
}
function calcPriceToAnnounceForPromo(priceAfterDiscount, discountPercent) {
    if (discountPercent <= 0 || discountPercent >= 100) return priceAfterDiscount;
    return priceAfterDiscount / (1 - discountPercent / 100);
}
function buildCascata(params) {
    const { sellingPrice, feePercent, shippingAmount, taxPercent, taxAmount, energyCost, filamentCost, depreciationCost, packagingCost, totalCost, commissionRateDecimal, commissionAmount, fixedFeeAmount } = params;
    const marketplaceFeeAmount = sellingPrice * feePercent / 100;
    const netProfit = sellingPrice - marketplaceFeeAmount - shippingAmount - taxAmount - totalCost;
    const marginPercent = sellingPrice > 0 ? netProfit / sellingPrice * 100 : 0;
    return {
        sellingPrice,
        marketplaceFeePercent: feePercent,
        marketplaceFeeAmount,
        commissionRateDecimal,
        commissionAmount,
        fixedFeeAmount,
        shippingAmount,
        taxPercent,
        taxAmount,
        energyCost,
        filamentCost,
        depreciationCost,
        packagingCost,
        totalCost,
        netProfit,
        marginPercent
    };
}
function calculateAll(input) {
    const filamentCost = calcFilamentCost(input.material.weight, input.material.pricePerKg);
    const energyCost = calcEnergyCost(input.time.powerW, input.time.hours, input.costs.kwhPrice);
    const depreciationCost = calcDepreciation({
        printerCost: input.costs.printerCost,
        residualValue: input.costs.residualValue ?? 0,
        lifetimeHours: input.costs.lifetimeHours,
        annualMaintenance: input.costs.annualMaintenance ?? 0,
        infrastructureYear: input.costs.infrastructureYear ?? 0,
        yearlyPrintHours: input.costs.yearlyPrintHours ?? 0,
        printHours: input.time.hours
    });
    const packagingCost = input.costs.packaging;
    const totalCost = calcTotalCost({
        filamentCost,
        energyCost,
        depreciationCost,
        packagingCost
    });
    const shippingAmount = input.pricing.shippingEstimate ?? 0;
    const taxPercent = input.pricing.taxPercent ?? 0;
    const taxMode = input.pricing.taxMode ?? "net_marketplace";
    const computeTaxAmount = (price, commissionRateDecimal)=>{
        const rate = (taxPercent ?? 0) / 100;
        if (rate <= 0 || price <= 0) return 0;
        if (taxMode === "net_marketplace") {
            const netBase = price * (1 - commissionRateDecimal);
            return netBase * rate;
        }
        // modo bruto (legado)
        return price * rate;
    };
    // Preço sugerido por canal (mesma margem alvo, preços podem ser diferentes)
    const suggestedPriceShopee = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$marketplaceFees$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getShopeeSuggestedPrice"])({
        totalCost,
        shippingAmount,
        taxPercent,
        desiredMarginPercent: input.pricing.desiredMargin,
        freeShipping: input.pricing.freeShipping ?? false,
        personType: input.pricing.personType
    });
    const suggestedPriceML = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$marketplaceFees$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMLSuggestedPrice"])({
        totalCost,
        shippingAmount,
        taxPercent,
        desiredMarginPercent: input.pricing.desiredMargin,
        personType: input.pricing.personType,
        classic: input.pricing.mlClassic ?? false
    });
    const suggestedPrice = Math.max(suggestedPriceShopee, suggestedPriceML);
    // Shopee no preço sugerido dela
    const feePercentShopee = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$marketplaceFees$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEffectiveMarketplaceFeePercent"])("Shopee", input.pricing.personType, suggestedPriceShopee, {
        freeShipping: input.pricing.freeShipping ?? false
    });
    const shopeeBreakdown = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$marketplaceFees$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getShopeeFeeBreakdown"])(suggestedPriceShopee, input.pricing.personType, input.pricing.freeShipping ?? false);
    const taxAmountShopee = computeTaxAmount(suggestedPriceShopee, shopeeBreakdown.commissionRateDecimal);
    const cascataShopee = buildCascata({
        sellingPrice: suggestedPriceShopee,
        feePercent: feePercentShopee,
        shippingAmount,
        taxPercent,
        taxAmount: taxAmountShopee,
        energyCost,
        filamentCost,
        depreciationCost,
        packagingCost,
        totalCost,
        commissionRateDecimal: shopeeBreakdown.commissionRateDecimal,
        commissionAmount: shopeeBreakdown.commissionAmount,
        fixedFeeAmount: shopeeBreakdown.fixedFeeAmount
    });
    // Mercado Livre no preço sugerido dele
    const feePercentML = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$marketplaceFees$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEffectiveMarketplaceFeePercent"])("Mercado Livre", input.pricing.personType, suggestedPriceML, {
        classicML: input.pricing.mlClassic ?? false
    });
    const mlBreakdown = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$marketplaceFees$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMLFeeBreakdown"])(suggestedPriceML, input.pricing.personType, input.pricing.mlClassic ?? false);
    const taxAmountML = computeTaxAmount(suggestedPriceML, mlBreakdown.commissionRateDecimal);
    const cascataML = buildCascata({
        sellingPrice: suggestedPriceML,
        feePercent: feePercentML,
        shippingAmount,
        taxPercent,
        taxAmount: taxAmountML,
        energyCost,
        filamentCost,
        depreciationCost,
        packagingCost,
        totalCost,
        commissionRateDecimal: mlBreakdown.commissionRateDecimal,
        commissionAmount: mlBreakdown.commissionAmount,
        fixedFeeAmount: mlBreakdown.fixedFeeAmount
    });
    const margin = Math.min(cascataShopee.marginPercent, cascataML.marginPercent);
    const profitPerSale = Math.min(cascataShopee.netProfit, cascataML.netProfit);
    const profitPerHour = input.time.hours > 0 ? Math.min(cascataShopee.netProfit / input.time.hours, cascataML.netProfit / input.time.hours) : 0;
    const discountPercent = input.pricing.discountPercent ?? 0;
    const priceToAnnounceForPromo = discountPercent > 0 ? calcPriceToAnnounceForPromo(suggestedPrice, discountPercent) : null;
    // Preço mínimo conservador (maior dos dois canais)
    const minFeeShopee = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$marketplaceFees$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEffectiveMarketplaceFeePercent"])("Shopee", input.pricing.personType, totalCost + 5, {
        freeShipping: false
    });
    const minFeeML = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$marketplaceFees$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEffectiveMarketplaceFeePercent"])("Mercado Livre", input.pricing.personType, totalCost + 5, {
        classicML: input.pricing.mlClassic ?? false
    });
    const minimumPrice = Math.max(calcMinimumPrice({
        totalCost,
        marketplaceFeePercent: minFeeShopee
    }), calcMinimumPrice({
        totalCost,
        marketplaceFeePercent: minFeeML
    }));
    let compareAtPriceResult = null;
    const comparePrice = input.pricing.comparePrice;
    if (comparePrice != null && comparePrice > 0) {
        const feeShopee = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$marketplaceFees$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEffectiveMarketplaceFeePercent"])("Shopee", input.pricing.personType, comparePrice, {
            freeShipping: input.pricing.freeShipping ?? false
        });
        const feeML = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$marketplaceFees$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEffectiveMarketplaceFeePercent"])("Mercado Livre", input.pricing.personType, comparePrice, {
            classicML: input.pricing.mlClassic ?? false
        });
        const buildCompare = (feePercent, commissionRateDecimal)=>{
            const feeAmount = comparePrice * feePercent / 100;
            const taxAmt = taxMode === "net_marketplace" ? computeTaxAmount(comparePrice, commissionRateDecimal) : comparePrice * taxPercent / 100;
            const net = comparePrice - feeAmount - shippingAmount - taxAmt - totalCost;
            const marginPct = comparePrice > 0 ? net / comparePrice * 100 : 0;
            const perHour = input.time.hours > 0 ? net / input.time.hours : 0;
            return {
                marketplaceFeePercent: feePercent,
                marketplaceFeeAmount: feeAmount,
                netProfit: net,
                marginPercent: marginPct,
                profitPerHour: perHour
            };
        };
        compareAtPriceResult = {
            sellingPrice: comparePrice,
            shopee: buildCompare(feeShopee, shopeeBreakdown.commissionRateDecimal),
            ml: buildCompare(feeML, mlBreakdown.commissionRateDecimal)
        };
    }
    return {
        filamentCost,
        energyCost,
        depreciationCost,
        packagingCost,
        totalCost,
        minimumPrice,
        suggestedPrice,
        suggestedPriceShopee,
        suggestedPriceML,
        profitPerSale,
        margin,
        cascataShopee,
        cascataML,
        priceToAnnounceForPromo,
        profitPerHour,
        compareAtPriceResult
    };
}
function simulateProfitFromCompetitor(params) {
    const { competitorPrice, yourCost } = params;
    const profit = calcProfit(competitorPrice, yourCost);
    const margin = calcMarginPercentage(competitorPrice, yourCost);
    let recommendation;
    if (margin < 0) {
        recommendation = "A este preço você tem prejuízo. Considere subir o valor ou reduzir custos antes de competir.";
    } else if (margin < 15) {
        recommendation = "Margem muito apertada. Só vale competir se for um produto de grande volume ou para ganhar reputação.";
    } else if (margin < 30) {
        recommendation = "Margem razoável. Avalie benefícios de ficar um pouco acima ou abaixo do concorrente.";
    } else {
        recommendation = "Margem saudável. Você pode competir por valor agregado (kit, combo, prazo, frete) sem sacrificar lucro.";
    }
    return {
        profit,
        margin,
        recommendation
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/hooks/useDebounce.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useDebounce",
    ()=>useDebounce
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
function useDebounce(value, delay = 300) {
    _s();
    const [debounced, setDebounced] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(value);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useDebounce.useEffect": ()=>{
            const timeout = setTimeout({
                "useDebounce.useEffect.timeout": ()=>setDebounced(value)
            }["useDebounce.useEffect.timeout"], delay);
            return ({
                "useDebounce.useEffect": ()=>clearTimeout(timeout)
            })["useDebounce.useEffect"];
        }
    }["useDebounce.useEffect"], [
        value,
        delay
    ]);
    return debounced;
}
_s(useDebounce, "33bQBlXg6j7MFSTRBeGy5/ui5G8=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/hooks/useCalculator.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useCalculator",
    ()=>useCalculator
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-hook-form/dist/index.esm.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$hookform$2f$resolvers$2f$zod$2f$dist$2f$zod$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@hookform/resolvers/zod/dist/zod.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/types/index.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/constants.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/calculations.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$settingsStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/store/settingsStore.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$calculatorStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/store/calculatorStore.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$productsStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/store/productsStore.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$authStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/store/authStore.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$useDebounce$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/hooks/useDebounce.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseProducts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseProducts.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
;
;
;
;
function getDefaultValues(settings, printerSettings) {
    const customPresets = printerSettings.customPresets ?? [];
    const fromCustom = typeof printerSettings.presetId === "string" && printerSettings.presetId.startsWith("custom:") ? customPresets.find((p)=>p.id === printerSettings.presetId.slice("custom:".length))?.averagePowerW : undefined;
    const powerW = printerSettings.customPowerW ?? fromCustom ?? 250;
    return {
        productName: "",
        material: {
            weight: 50,
            pricePerKg: 120,
            type: "PLA"
        },
        time: {
            hours: 3,
            powerW
        },
        costs: {
            kwhPrice: settings.defaults.kwhPrice,
            printerCost: settings.defaults.printerCost,
            lifetimeHours: settings.defaults.lifetimeHours,
            residualValue: settings.defaults.residualValue ?? 0,
            annualMaintenance: settings.defaults.annualMaintenance ?? 0,
            infrastructureYear: settings.defaults.infrastructureYear ?? 0,
            yearlyPrintHours: settings.defaults.yearlyPrintHours ?? 1000,
            packaging: settings.defaults.packaging
        },
        pricing: {
            marketplace: "Shopee",
            personType: "CPF",
            marketplaceFee: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_MARKETPLACE_FEES"]["Shopee"].CPF,
            desiredMargin: settings.defaults.desiredMargin,
            shippingEstimate: settings.defaults.shippingEstimateDefault ?? 0,
            taxPercent: 0,
            taxMode: settings.defaults.taxMode ?? "net_marketplace",
            mlClassic: settings.defaults.mlClassic ?? false,
            freeShipping: settings.defaults.shopeeFreeShippingDefault ?? false,
            discountPercent: 0,
            comparePrice: undefined
        }
    };
}
function useCalculator() {
    _s();
    const { settings } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$settingsStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSettingsStore"])();
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$authStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"])();
    const { setLastCalculation, saveRequested, clearSaveRequested, lastInput, lastResults, productToLoad, setProductToLoad, stlPreset, setStlPreset } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$calculatorStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCalculatorStore"])();
    const addProduct = (0, __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$productsStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProductsStore"])({
        "useCalculator.useProductsStore[addProduct]": (s)=>s.addProduct
    }["useCalculator.useProductsStore[addProduct]"]);
    const printerSettings = settings.printer ?? {
        presetId: undefined,
        customPowerW: undefined,
        customPresets: []
    };
    const defaultValues = getDefaultValues(settings, printerSettings);
    const form = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useForm"])({
        resolver: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$hookform$2f$resolvers$2f$zod$2f$dist$2f$zod$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["zodResolver"])(__TURBOPACK__imported__module__$5b$project$5d2f$types$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculatorSchema"]),
        mode: "onChange",
        defaultValues
    });
    const watched = form.watch();
    const debouncedValues = (0, __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$useDebounce$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useDebounce"])(watched, 300);
    const results = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "useCalculator.useMemo[results]": ()=>{
            try {
                const parsed = __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculatorSchema"].parse(debouncedValues);
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateAll"])(parsed);
            } catch  {
                return null;
            }
        }
    }["useCalculator.useMemo[results]"], [
        debouncedValues
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useCalculator.useEffect": ()=>{
            if (results) {
                try {
                    const parsed = __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculatorSchema"].parse(debouncedValues);
                    setLastCalculation(parsed, results);
                } catch  {
                // ignore
                }
            }
        }
    }["useCalculator.useEffect"], [
        debouncedValues,
        results,
        setLastCalculation
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useCalculator.useEffect": ()=>{
            if (!saveRequested || !lastInput || !lastResults) {
                if (saveRequested) clearSaveRequested();
                return;
            }
            const customName = typeof lastInput.productName === "string" ? lastInput.productName.trim() : "";
            const name = customName || "Simulação " + new Date().toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
            });
            const product = {
                id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `prod_${Date.now()}`,
                name,
                weight: lastInput.material.weight,
                price: lastResults.suggestedPrice,
                margin: Math.min(lastResults.cascataShopee.marginPercent, lastResults.cascataML.marginPercent),
                marketplace: "Shopee",
                currency: settings.currency ?? "BRL",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                suggestedPriceShopee: lastResults.suggestedPriceShopee,
                suggestedPriceML: lastResults.suggestedPriceML,
                totalCost: lastResults.totalCost
            };
            addProduct(product);
            if (user && ("TURBOPACK compile-time value", "object") !== "undefined") {
                const list = __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$productsStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProductsStore"].getState().products;
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseProducts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["upsertProductsForUser"])(user.id, list).catch({
                    "useCalculator.useEffect": ()=>{}
                }["useCalculator.useEffect"]);
            }
            form.reset(getDefaultValues(settings, printerSettings));
            clearSaveRequested();
        }
    }["useCalculator.useEffect"], [
        saveRequested,
        lastInput,
        lastResults,
        clearSaveRequested,
        addProduct,
        user,
        settings,
        form,
        printerSettings
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useCalculator.useEffect": ()=>{
            const customPresets = printerSettings.customPresets ?? [];
            const resolvedPowerW = ({
                "useCalculator.useEffect.resolvedPowerW": ()=>{
                    if (printerSettings.customPowerW) return printerSettings.customPowerW;
                    if (typeof printerSettings.presetId === "string" && printerSettings.presetId.startsWith("custom:")) {
                        const id = printerSettings.presetId.slice("custom:".length);
                        const preset = customPresets.find({
                            "useCalculator.useEffect.resolvedPowerW.preset": (p)=>p.id === id
                        }["useCalculator.useEffect.resolvedPowerW.preset"]);
                        if (preset) return preset.averagePowerW;
                    }
                    return form.getValues("time.powerW");
                }
            })["useCalculator.useEffect.resolvedPowerW"]();
            form.reset({
                ...form.getValues(),
                costs: {
                    ...form.getValues("costs"),
                    kwhPrice: settings.defaults.kwhPrice,
                    printerCost: settings.defaults.printerCost,
                    lifetimeHours: settings.defaults.lifetimeHours,
                    residualValue: settings.defaults.residualValue ?? 0,
                    annualMaintenance: settings.defaults.annualMaintenance ?? 0,
                    infrastructureYear: settings.defaults.infrastructureYear ?? 0,
                    yearlyPrintHours: settings.defaults.yearlyPrintHours ?? 1000,
                    packaging: settings.defaults.packaging
                },
                time: {
                    ...form.getValues("time"),
                    powerW: resolvedPowerW
                },
                pricing: {
                    ...form.getValues("pricing"),
                    shippingEstimate: settings.defaults.shippingEstimateDefault ?? 0,
                    taxMode: settings.defaults.taxMode ?? "net_marketplace",
                    mlClassic: settings.defaults.mlClassic ?? false,
                    freeShipping: settings.defaults.shopeeFreeShippingDefault ?? false
                }
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["useCalculator.useEffect"], [
        settings
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useCalculator.useEffect": ()=>{
            if (productToLoad) {
                const fee = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_MARKETPLACE_FEES"][productToLoad.marketplace]?.CPF ?? defaultValues.pricing.marketplaceFee;
                form.reset({
                    ...defaultValues,
                    productName: productToLoad.name ?? "",
                    material: {
                        ...defaultValues.material,
                        weight: productToLoad.weight
                    },
                    pricing: {
                        ...defaultValues.pricing,
                        marketplace: productToLoad.marketplace,
                        desiredMargin: productToLoad.margin ?? defaultValues.pricing.desiredMargin,
                        marketplaceFee: fee
                    }
                });
                setProductToLoad(null);
            }
        }
    }["useCalculator.useEffect"], [
        productToLoad,
        setProductToLoad,
        form,
        defaultValues
    ]);
    // Aplicar preset vindo do analisador STL
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useCalculator.useEffect": ()=>{
            if (!stlPreset) return;
            const current = form.getValues();
            const hours = Math.max(0, Math.floor((stlPreset.estimatedMinutes ?? 0) / 60));
            const minutes = Math.max(0, (stlPreset.estimatedMinutes ?? 0) % 60);
            const totalHours = hours + minutes / 60;
            form.reset({
                ...current,
                material: {
                    ...current.material,
                    weight: stlPreset.weightGrams
                },
                time: {
                    ...current.time,
                    hours: totalHours
                }
            });
            setStlPreset(null);
        }
    }["useCalculator.useEffect"], [
        stlPreset,
        form,
        setStlPreset
    ]);
    const isDirty = form.formState.isDirty;
    return {
        form,
        results,
        isDirty
    };
}
_s(useCalculator, "G7UEFdysOAreWE1fUT/iotAkSas=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$settingsStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSettingsStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$authStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$calculatorStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCalculatorStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$productsStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProductsStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useForm"],
        __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$useDebounce$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useDebounce"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/calculator/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CalculatorPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calculator$2f$InputPanel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/calculator/InputPanel.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calculator$2f$ResultsPanel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/calculator/ResultsPanel.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$useCalculator$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/hooks/useCalculator.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function CalculatorPage() {
    _s();
    const { form, results, isDirty } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$useCalculator$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCalculator"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calculator$2f$InputPanel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["InputPanel"], {
                form: form
            }, void 0, false, {
                fileName: "[project]/app/calculator/page.tsx",
                lineNumber: 12,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calculator$2f$ResultsPanel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ResultsPanel"], {
                results: results,
                isDirty: isDirty
            }, void 0, false, {
                fileName: "[project]/app/calculator/page.tsx",
                lineNumber: 13,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/calculator/page.tsx",
        lineNumber: 11,
        columnNumber: 5
    }, this);
}
_s(CalculatorPage, "BV+73KWlyaPu19JAInufjejMM7k=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$useCalculator$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCalculator"]
    ];
});
_c = CalculatorPage;
var _c;
__turbopack_context__.k.register(_c, "CalculatorPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_be54abc5._.js.map