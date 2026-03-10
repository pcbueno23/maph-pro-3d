(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
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
"[project]/store/inventoryStore.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useInventoryStore",
    ()=>useInventoryStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
;
const STORAGE_KEY = "precifica3d-inventory";
const useInventoryStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
        items: [],
        hydrateFromStorage: ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            try {
                const raw = window.localStorage.getItem(STORAGE_KEY);
                if (!raw) return;
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    set({
                        items: parsed
                    });
                }
            } catch  {
            // ignore
            }
        },
        upsertFromProduct: (product, quantity, sku)=>{
            const now = new Date().toISOString();
            const existing = get().items.find((i)=>i.productId === product.id);
            let next;
            if (existing) {
                const updated = {
                    ...existing,
                    sku: sku ?? existing.sku,
                    quantity: existing.quantity + quantity,
                    price: product.price,
                    marginPercent: product.margin ?? existing.marginPercent,
                    suggestedPriceShopee: product.suggestedPriceShopee ?? existing.suggestedPriceShopee,
                    suggestedPriceML: product.suggestedPriceML ?? existing.suggestedPriceML,
                    productionCost: product.totalCost ?? existing.productionCost,
                    updatedAt: now
                };
                next = get().items.map((i)=>i.id === existing.id ? updated : i);
            } else {
                const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `inv_${Date.now()}`;
                const item = {
                    id,
                    productId: product.id,
                    name: product.name,
                    sku: sku ?? "",
                    quantity,
                    price: product.price,
                    marketplace: product.marketplace,
                    marginPercent: product.margin ?? 0,
                    suggestedPriceShopee: product.suggestedPriceShopee,
                    suggestedPriceML: product.suggestedPriceML,
                    productionCost: product.totalCost,
                    createdAt: now,
                    updatedAt: now
                };
                next = [
                    ...get().items,
                    item
                ];
            }
            set({
                items: next
            });
            if ("TURBOPACK compile-time truthy", 1) {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            }
        },
        updateItem: (item)=>{
            const next = get().items.map((i)=>i.id === item.id ? item : i);
            set({
                items: next
            });
            if ("TURBOPACK compile-time truthy", 1) {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            }
        },
        removeItem: (id)=>{
            const next = get().items.filter((i)=>i.id !== id);
            set({
                items: next
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
"[project]/app/inventory/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>InventoryPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$suppliesStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/store/suppliesStore.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$inventoryStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/store/inventoryStore.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function InventoryPage() {
    _s();
    const { supplies, hydrateFromStorage: hydrateSupplies, addSupply, updateSupply, removeSupply } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$suppliesStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSuppliesStore"])();
    const { items, hydrateFromStorage: hydrateInventory, updateItem, removeItem } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$inventoryStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useInventoryStore"])();
    const [tab, setTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("supplies");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "InventoryPage.useEffect": ()=>{
            hydrateSupplies();
            hydrateInventory();
        }
    }["InventoryPage.useEffect"], [
        hydrateSupplies,
        hydrateInventory
    ]);
    const [newSupplyName, setNewSupplyName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [newSupplyKind, setNewSupplyKind] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("filament");
    const [newSupplyUnit, setNewSupplyUnit] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("kg");
    const [newSupplyUnitCost, setNewSupplyUnitCost] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const handleAddSupply = ()=>{
        const name = newSupplyName.trim();
        if (!name || !Number.isFinite(newSupplyUnitCost) || newSupplyUnitCost <= 0) return;
        const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sup_${Date.now()}`;
        addSupply({
            id,
            name,
            kind: newSupplyKind,
            unit: newSupplyUnit,
            unitCost: newSupplyUnitCost,
            stockQty: 0
        });
        setNewSupplyName("");
        setNewSupplyUnitCost(0);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                className: "text-xl font-semibold tracking-tight text-slate-50 md:text-2xl",
                children: "Estoque & insumos"
            }, void 0, false, {
                fileName: "[project]/app/inventory/page.tsx",
                lineNumber: 50,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "inline-flex rounded-xl border border-slate-700 bg-slate-900/70 p-1 text-xs",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>setTab("supplies"),
                        className: `rounded-lg px-3 py-1.5 ${tab === "supplies" ? "bg-slate-800 text-cyan-400" : "text-slate-300"}`,
                        children: "Insumos"
                    }, void 0, false, {
                        fileName: "[project]/app/inventory/page.tsx",
                        lineNumber: 55,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>setTab("stock"),
                        className: `rounded-lg px-3 py-1.5 ${tab === "stock" ? "bg-slate-800 text-cyan-400" : "text-slate-300"}`,
                        children: "Peças produzidas"
                    }, void 0, false, {
                        fileName: "[project]/app/inventory/page.tsx",
                        lineNumber: 64,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/inventory/page.tsx",
                lineNumber: 54,
                columnNumber: 7
            }, this),
            tab === "supplies" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400",
                                children: "Novo insumo"
                            }, void 0, false, {
                                fileName: "[project]/app/inventory/page.tsx",
                                lineNumber: 78,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid gap-2 md:grid-cols-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "text",
                                        placeholder: "Nome (ex.: PLA Branco)",
                                        className: "rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                        value: newSupplyName,
                                        onChange: (e)=>setNewSupplyName(e.target.value)
                                    }, void 0, false, {
                                        fileName: "[project]/app/inventory/page.tsx",
                                        lineNumber: 82,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        className: "rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                        value: newSupplyKind,
                                        onChange: (e)=>setNewSupplyKind(e.target.value),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "filament",
                                                children: "Filamento"
                                            }, void 0, false, {
                                                fileName: "[project]/app/inventory/page.tsx",
                                                lineNumber: 94,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "ink",
                                                children: "Tinta"
                                            }, void 0, false, {
                                                fileName: "[project]/app/inventory/page.tsx",
                                                lineNumber: 95,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "other",
                                                children: "Outro"
                                            }, void 0, false, {
                                                fileName: "[project]/app/inventory/page.tsx",
                                                lineNumber: 96,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/inventory/page.tsx",
                                        lineNumber: 89,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "number",
                                        step: 0.01,
                                        placeholder: "Custo por unidade (R$)",
                                        className: "rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                        value: Number.isNaN(newSupplyUnitCost) ? "" : newSupplyUnitCost,
                                        onChange: (e)=>setNewSupplyUnitCost(Number(e.target.value) || 0)
                                    }, void 0, false, {
                                        fileName: "[project]/app/inventory/page.tsx",
                                        lineNumber: 98,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        className: "rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                        value: newSupplyUnit,
                                        onChange: (e)=>setNewSupplyUnit(e.target.value),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "kg",
                                                children: "kg"
                                            }, void 0, false, {
                                                fileName: "[project]/app/inventory/page.tsx",
                                                lineNumber: 111,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "g",
                                                children: "g"
                                            }, void 0, false, {
                                                fileName: "[project]/app/inventory/page.tsx",
                                                lineNumber: 112,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "ml",
                                                children: "ml"
                                            }, void 0, false, {
                                                fileName: "[project]/app/inventory/page.tsx",
                                                lineNumber: 113,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "un",
                                                children: "un"
                                            }, void 0, false, {
                                                fileName: "[project]/app/inventory/page.tsx",
                                                lineNumber: 114,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/inventory/page.tsx",
                                        lineNumber: 106,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/inventory/page.tsx",
                                lineNumber: 81,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: handleAddSupply,
                                className: "mt-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400",
                                children: "Adicionar insumo"
                            }, void 0, false, {
                                fileName: "[project]/app/inventory/page.tsx",
                                lineNumber: 117,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/inventory/page.tsx",
                        lineNumber: 77,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm",
                        children: supplies.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-slate-400",
                            children: "Nenhum insumo cadastrado ainda. Eles poderão ser usados como preset na calculadora."
                        }, void 0, false, {
                            fileName: "[project]/app/inventory/page.tsx",
                            lineNumber: 128,
                            columnNumber: 15
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                    className: "min-w-full text-left text-xs",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                            className: "border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-400",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-2 py-2",
                                                        children: "Nome"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/inventory/page.tsx",
                                                        lineNumber: 136,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-2 py-2",
                                                        children: "Tipo"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/inventory/page.tsx",
                                                        lineNumber: 137,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-2 py-2",
                                                        children: "Custo / unidade"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/inventory/page.tsx",
                                                        lineNumber: 138,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-2 py-2",
                                                        children: "Unidade"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/inventory/page.tsx",
                                                        lineNumber: 139,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-2 py-2",
                                                        children: "Estoque"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/inventory/page.tsx",
                                                        lineNumber: 140,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-2 py-2 text-right",
                                                        children: "Ações"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/inventory/page.tsx",
                                                        lineNumber: 141,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/inventory/page.tsx",
                                                lineNumber: 135,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/inventory/page.tsx",
                                            lineNumber: 134,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                            className: "divide-y divide-slate-800",
                                            children: supplies.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    className: "hover:bg-slate-900/60",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-2 py-2 text-slate-100",
                                                            children: s.name
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/inventory/page.tsx",
                                                            lineNumber: 147,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-2 py-2 text-slate-300",
                                                            children: s.kind === "filament" ? "Filamento" : s.kind === "ink" ? "Tinta" : "Outro"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/inventory/page.tsx",
                                                            lineNumber: 148,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-2 py-2 text-slate-100",
                                                            children: s.unitCost.toLocaleString("pt-BR", {
                                                                style: "currency",
                                                                currency: "BRL"
                                                            })
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/inventory/page.tsx",
                                                            lineNumber: 155,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-2 py-2 text-slate-300",
                                                            children: s.unit
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/inventory/page.tsx",
                                                            lineNumber: 161,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-2 py-2",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "number",
                                                                className: "w-20 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                                                value: s.stockQty,
                                                                onChange: (e)=>updateSupply({
                                                                        ...s,
                                                                        stockQty: Number(e.target.value) || 0
                                                                    })
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/inventory/page.tsx",
                                                                lineNumber: 163,
                                                                columnNumber: 27
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/inventory/page.tsx",
                                                            lineNumber: 162,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-2 py-2 text-right",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                type: "button",
                                                                onClick: ()=>removeSupply(s.id),
                                                                className: "text-xs text-rose-400 hover:text-rose-300",
                                                                children: "Remover"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/inventory/page.tsx",
                                                                lineNumber: 173,
                                                                columnNumber: 27
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/inventory/page.tsx",
                                                            lineNumber: 172,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, s.id, true, {
                                                    fileName: "[project]/app/inventory/page.tsx",
                                                    lineNumber: 146,
                                                    columnNumber: 23
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/app/inventory/page.tsx",
                                            lineNumber: 144,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/inventory/page.tsx",
                                    lineNumber: 133,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-3 border-t border-slate-800 pt-2 text-xs text-slate-300",
                                    children: (()=>{
                                        const totalValue = supplies.reduce((acc, s)=>acc + s.stockQty * s.unitCost, 0);
                                        const filament = supplies.filter((s)=>s.kind === "filament");
                                        const totalFilamentGrams = filament.reduce((acc, s)=>{
                                            if (s.unit === "kg") return acc + s.stockQty * 1000;
                                            if (s.unit === "g") return acc + s.stockQty;
                                            return acc;
                                        }, 0);
                                        const totalFilamentValue = filament.reduce((acc, s)=>acc + s.stockQty * s.unitCost, 0);
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    children: [
                                                        "Valor total em insumos:",
                                                        " ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "font-semibold text-slate-50",
                                                            children: totalValue.toLocaleString("pt-BR", {
                                                                style: "currency",
                                                                currency: "BRL"
                                                            })
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/inventory/page.tsx",
                                                            lineNumber: 206,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/inventory/page.tsx",
                                                    lineNumber: 204,
                                                    columnNumber: 25
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "mt-1",
                                                    children: [
                                                        "Filamentos em estoque:",
                                                        " ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "font-semibold text-slate-50",
                                                            children: [
                                                                totalFilamentGrams.toLocaleString("pt-BR", {
                                                                    maximumFractionDigits: 0
                                                                }),
                                                                " ",
                                                                "g"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/inventory/page.tsx",
                                                            lineNumber: 215,
                                                            columnNumber: 27
                                                        }, this),
                                                        " ",
                                                        "(",
                                                        totalFilamentValue.toLocaleString("pt-BR", {
                                                            style: "currency",
                                                            currency: "BRL"
                                                        }),
                                                        ")"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/inventory/page.tsx",
                                                    lineNumber: 213,
                                                    columnNumber: 25
                                                }, this)
                                            ]
                                        }, void 0, true);
                                    })()
                                }, void 0, false, {
                                    fileName: "[project]/app/inventory/page.tsx",
                                    lineNumber: 186,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true)
                    }, void 0, false, {
                        fileName: "[project]/app/inventory/page.tsx",
                        lineNumber: 126,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/inventory/page.tsx",
                lineNumber: 76,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm",
                children: items.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-slate-400",
                    children: "Nenhuma peça produzida cadastrada ainda. Use o botão “Produzida” na aba Produtos para lançar estoque."
                }, void 0, false, {
                    fileName: "[project]/app/inventory/page.tsx",
                    lineNumber: 239,
                    columnNumber: 13
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                    className: "min-w-full text-left text-xs",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                            className: "border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-400",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-2 py-2",
                                        children: "Nome"
                                    }, void 0, false, {
                                        fileName: "[project]/app/inventory/page.tsx",
                                        lineNumber: 247,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-2 py-2",
                                        children: "SKU"
                                    }, void 0, false, {
                                        fileName: "[project]/app/inventory/page.tsx",
                                        lineNumber: 248,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-2 py-2",
                                        children: "Qtd"
                                    }, void 0, false, {
                                        fileName: "[project]/app/inventory/page.tsx",
                                        lineNumber: 249,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-2 py-2",
                                        children: "Preço Shopee"
                                    }, void 0, false, {
                                        fileName: "[project]/app/inventory/page.tsx",
                                        lineNumber: 250,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-2 py-2",
                                        children: "Preço ML"
                                    }, void 0, false, {
                                        fileName: "[project]/app/inventory/page.tsx",
                                        lineNumber: 251,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-2 py-2",
                                        children: "Custo produção"
                                    }, void 0, false, {
                                        fileName: "[project]/app/inventory/page.tsx",
                                        lineNumber: 252,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-2 py-2",
                                        children: "% Margem (pior canal)"
                                    }, void 0, false, {
                                        fileName: "[project]/app/inventory/page.tsx",
                                        lineNumber: 253,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-2 py-2",
                                        children: "Canal"
                                    }, void 0, false, {
                                        fileName: "[project]/app/inventory/page.tsx",
                                        lineNumber: 254,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-2 py-2 text-right",
                                        children: "Ações"
                                    }, void 0, false, {
                                        fileName: "[project]/app/inventory/page.tsx",
                                        lineNumber: 255,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/inventory/page.tsx",
                                lineNumber: 246,
                                columnNumber: 17
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/inventory/page.tsx",
                            lineNumber: 245,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                            className: "divide-y divide-slate-800",
                            children: items.map((i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    className: "hover:bg-slate-900/60",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-2 py-2 text-slate-100",
                                            children: i.name
                                        }, void 0, false, {
                                            fileName: "[project]/app/inventory/page.tsx",
                                            lineNumber: 261,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-2 py-2",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "text",
                                                className: "w-28 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                                value: i.sku,
                                                onChange: (e)=>updateItem({
                                                        ...i,
                                                        sku: e.target.value,
                                                        updatedAt: new Date().toISOString()
                                                    })
                                            }, void 0, false, {
                                                fileName: "[project]/app/inventory/page.tsx",
                                                lineNumber: 263,
                                                columnNumber: 23
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/inventory/page.tsx",
                                            lineNumber: 262,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-2 py-2",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "number",
                                                className: "w-20 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
                                                value: i.quantity,
                                                onChange: (e)=>updateItem({
                                                        ...i,
                                                        quantity: Number(e.target.value) || 0,
                                                        updatedAt: new Date().toISOString()
                                                    })
                                            }, void 0, false, {
                                                fileName: "[project]/app/inventory/page.tsx",
                                                lineNumber: 277,
                                                columnNumber: 23
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/inventory/page.tsx",
                                            lineNumber: 276,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-2 py-2 text-slate-100",
                                            children: (i.suggestedPriceShopee ?? i.price).toLocaleString("pt-BR", {
                                                style: "currency",
                                                currency: "BRL"
                                            })
                                        }, void 0, false, {
                                            fileName: "[project]/app/inventory/page.tsx",
                                            lineNumber: 290,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-2 py-2 text-slate-100",
                                            children: (i.suggestedPriceML ?? i.price).toLocaleString("pt-BR", {
                                                style: "currency",
                                                currency: "BRL"
                                            })
                                        }, void 0, false, {
                                            fileName: "[project]/app/inventory/page.tsx",
                                            lineNumber: 296,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-2 py-2 text-slate-100",
                                            children: (i.productionCost ?? 0).toLocaleString("pt-BR", {
                                                style: "currency",
                                                currency: "BRL"
                                            })
                                        }, void 0, false, {
                                            fileName: "[project]/app/inventory/page.tsx",
                                            lineNumber: 302,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-2 py-2",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: i.marginPercent >= 0 ? "text-emerald-400" : "text-rose-400",
                                                children: [
                                                    i.marginPercent.toFixed(1),
                                                    "%"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/inventory/page.tsx",
                                                lineNumber: 309,
                                                columnNumber: 23
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/inventory/page.tsx",
                                            lineNumber: 308,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-2 py-2 text-slate-300",
                                            children: i.marketplace
                                        }, void 0, false, {
                                            fileName: "[project]/app/inventory/page.tsx",
                                            lineNumber: 317,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-2 py-2 text-right",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: ()=>removeItem(i.id),
                                                className: "text-xs text-rose-400 hover:text-rose-300",
                                                children: "Remover"
                                            }, void 0, false, {
                                                fileName: "[project]/app/inventory/page.tsx",
                                                lineNumber: 319,
                                                columnNumber: 23
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/inventory/page.tsx",
                                            lineNumber: 318,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, i.id, true, {
                                    fileName: "[project]/app/inventory/page.tsx",
                                    lineNumber: 260,
                                    columnNumber: 19
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/app/inventory/page.tsx",
                            lineNumber: 258,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/inventory/page.tsx",
                    lineNumber: 244,
                    columnNumber: 13
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/inventory/page.tsx",
                lineNumber: 237,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/inventory/page.tsx",
        lineNumber: 49,
        columnNumber: 5
    }, this);
}
_s(InventoryPage, "X+T2IQIeIoBKmJHH0Vv2kjHe0JE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$suppliesStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSuppliesStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$inventoryStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useInventoryStore"]
    ];
});
_c = InventoryPage;
var _c;
__turbopack_context__.k.register(_c, "InventoryPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_a1870007._.js.map