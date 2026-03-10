(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
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
"[project]/components/products/ProductTable.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProductTable",
    ()=>ProductTable
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$productsStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/store/productsStore.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$calculatorStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/store/calculatorStore.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$authStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/store/authStore.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseProducts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseProducts.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$inventoryStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/store/inventoryStore.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$suppliesStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/store/suppliesStore.ts [app-client] (ecmascript)");
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
;
function ProductTable({ products }) {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const removeProduct = (0, __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$productsStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProductsStore"])({
        "ProductTable.useProductsStore[removeProduct]": (s)=>s.removeProduct
    }["ProductTable.useProductsStore[removeProduct]"]);
    const setProductToLoad = (0, __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$calculatorStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCalculatorStore"])({
        "ProductTable.useCalculatorStore[setProductToLoad]": (s)=>s.setProductToLoad
    }["ProductTable.useCalculatorStore[setProductToLoad]"]);
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$authStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"])();
    const { upsertFromProduct } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$inventoryStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useInventoryStore"])();
    const { consumeFilamentGrams } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$suppliesStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSuppliesStore"])();
    function handleLoadInCalculator(product) {
        setProductToLoad(product);
        router.push("/calculator");
    }
    function handleRemove(product) {
        if (("TURBOPACK compile-time value", "object") !== "undefined" && !window.confirm(`Remover "${product.name}" da lista?`)) return;
        removeProduct(product.id);
        if (user) {
            const list = __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$productsStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProductsStore"].getState().products;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseProducts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["upsertProductsForUser"])(user.id, list).catch(()=>{});
        }
    }
    if (products.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400",
            children: "Nenhum produto salvo ainda. Após calcular um produto, você poderá salvá-lo aqui para reutilizar parâmetros, duplicar e exportar."
        }, void 0, false, {
            fileName: "[project]/components/products/ProductTable.tsx",
            lineNumber: 40,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
            className: "min-w-full text-left text-sm",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                    className: "bg-slate-950/80 text-xs uppercase tracking-[0.15em] text-slate-400",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                className: "px-4 py-3",
                                children: "Nome"
                            }, void 0, false, {
                                fileName: "[project]/components/products/ProductTable.tsx",
                                lineNumber: 52,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                className: "px-2 py-3",
                                children: "Peso (g)"
                            }, void 0, false, {
                                fileName: "[project]/components/products/ProductTable.tsx",
                                lineNumber: 53,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                className: "px-2 py-3",
                                children: "Preço"
                            }, void 0, false, {
                                fileName: "[project]/components/products/ProductTable.tsx",
                                lineNumber: 54,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                className: "px-2 py-3",
                                children: "% Margem"
                            }, void 0, false, {
                                fileName: "[project]/components/products/ProductTable.tsx",
                                lineNumber: 55,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                className: "px-2 py-3",
                                children: "Marketplace"
                            }, void 0, false, {
                                fileName: "[project]/components/products/ProductTable.tsx",
                                lineNumber: 56,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                className: "px-2 py-3 text-right",
                                children: "Ações"
                            }, void 0, false, {
                                fileName: "[project]/components/products/ProductTable.tsx",
                                lineNumber: 57,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/products/ProductTable.tsx",
                        lineNumber: 51,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/products/ProductTable.tsx",
                    lineNumber: 50,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                    className: "divide-y divide-slate-800",
                    children: products.map((product)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                            className: "hover:bg-slate-900/60",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                    className: "px-4 py-2",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>handleLoadInCalculator(product),
                                        className: "text-left font-medium text-cyan-400 underline decoration-cyan-400/50 underline-offset-2 transition hover:text-cyan-300 hover:decoration-cyan-300",
                                        title: "Abrir na calculadora para editar",
                                        children: product.name
                                    }, void 0, false, {
                                        fileName: "[project]/components/products/ProductTable.tsx",
                                        lineNumber: 64,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/products/ProductTable.tsx",
                                    lineNumber: 63,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                    className: "px-2 py-2 text-slate-200",
                                    children: product.weight
                                }, void 0, false, {
                                    fileName: "[project]/components/products/ProductTable.tsx",
                                    lineNumber: 73,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                    className: "px-2 py-2 text-slate-100",
                                    children: product.price.toLocaleString("pt-BR", {
                                        style: "currency",
                                        currency: product.currency
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/components/products/ProductTable.tsx",
                                    lineNumber: 74,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                    className: "px-2 py-2",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: (product.margin ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400",
                                        children: [
                                            (product.margin ?? 0).toFixed(1),
                                            "%"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/products/ProductTable.tsx",
                                        lineNumber: 81,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/products/ProductTable.tsx",
                                    lineNumber: 80,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                    className: "px-2 py-2 text-slate-300",
                                    children: product.marketplace
                                }, void 0, false, {
                                    fileName: "[project]/components/products/ProductTable.tsx",
                                    lineNumber: 91,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                    className: "px-2 py-2 text-right",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>{
                                                const qtyStr = ("TURBOPACK compile-time truthy", 1) ? window.prompt("Quantidade produzida para estoque:", "1") : "TURBOPACK unreachable";
                                                if (!qtyStr) return;
                                                const qty = Number(qtyStr);
                                                if (!Number.isFinite(qty) || qty <= 0) return;
                                                const sku = ("TURBOPACK compile-time truthy", 1) ? window.prompt("SKU da peça (opcional):", "") : "TURBOPACK unreachable";
                                                upsertFromProduct(product, qty, sku ?? undefined);
                                                // baixa filamento do estoque (aproxima usando primeiro insumo de filamento)
                                                if (product.weight > 0) {
                                                    const grams = product.weight * qty;
                                                    consumeFilamentGrams(grams);
                                                }
                                            },
                                            className: "mr-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-500/10 hover:text-emerald-200",
                                            children: "Produzida"
                                        }, void 0, false, {
                                            fileName: "[project]/components/products/ProductTable.tsx",
                                            lineNumber: 95,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>handleRemove(product),
                                            className: "inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-400",
                                            title: "Remover item",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                    className: "h-3.5 w-3.5"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/products/ProductTable.tsx",
                                                    lineNumber: 126,
                                                    columnNumber: 19
                                                }, this),
                                                "Remover"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/products/ProductTable.tsx",
                                            lineNumber: 120,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/products/ProductTable.tsx",
                                    lineNumber: 94,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, product.id, true, {
                            fileName: "[project]/components/products/ProductTable.tsx",
                            lineNumber: 62,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/components/products/ProductTable.tsx",
                    lineNumber: 60,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/products/ProductTable.tsx",
            lineNumber: 49,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/products/ProductTable.tsx",
        lineNumber: 48,
        columnNumber: 5
    }, this);
}
_s(ProductTable, "9EqlIT1HWqz7Oj7nXfI+PwIQgPw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$productsStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProductsStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$calculatorStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCalculatorStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$authStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$inventoryStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useInventoryStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$suppliesStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSuppliesStore"]
    ];
});
_c = ProductTable;
var _c;
__turbopack_context__.k.register(_c, "ProductTable");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/products/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ProductsPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$products$2f$ProductTable$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/products/ProductTable.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$productsStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/store/productsStore.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function ProductsPage() {
    _s();
    const { products, hydrateFromStorage } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$productsStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProductsStore"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ProductsPage.useEffect": ()=>{
            hydrateFromStorage();
        }
    }["ProductsPage.useEffect"], [
        hydrateFromStorage
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                className: "text-xl font-semibold tracking-tight text-slate-50 md:text-2xl",
                children: "Produtos salvos"
            }, void 0, false, {
                fileName: "[project]/app/products/page.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$products$2f$ProductTable$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ProductTable"], {
                products: products
            }, void 0, false, {
                fileName: "[project]/app/products/page.tsx",
                lineNumber: 19,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/products/page.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
_s(ProductsPage, "kAanQhT8V+CN+DEJoruC2PPRiPI=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$productsStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProductsStore"]
    ];
});
_c = ProductsPage;
var _c;
__turbopack_context__.k.register(_c, "ProductsPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>Trash2
]);
/**
 * @license lucide-react v0.577.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "path",
        {
            d: "M10 11v6",
            key: "nco0om"
        }
    ],
    [
        "path",
        {
            d: "M14 11v6",
            key: "outv1u"
        }
    ],
    [
        "path",
        {
            d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
            key: "miytrc"
        }
    ],
    [
        "path",
        {
            d: "M3 6h18",
            key: "d0wm0j"
        }
    ],
    [
        "path",
        {
            d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
            key: "e791ji"
        }
    ]
];
const Trash2 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("trash-2", __iconNode);
;
 //# sourceMappingURL=trash-2.js.map
}),
"[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript) <export default as Trash2>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Trash2",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript)");
}),
]);

//# sourceMappingURL=_3426d633._.js.map