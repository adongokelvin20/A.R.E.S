"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, X, Upload, Image as ImageIcon, Loader2, Search, Package, Sparkles, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProductField {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  price: number;
  currency: string;
  stock: number;
  lowStockThreshold: number;
  imageUrl?: string | null;
  imageAlt?: string | null;
  attributes: any;
  status: string;
}

/** Product image with graceful error handling.
 *  If the stored URL fails to load (file missing, 404, etc.),
 *  we swap to a clean placeholder instead of showing alt text. */
function ProductImage({ src, alt, name }: { src: string; alt: string; name: string }) {
  const [errored, setErrored] = useState(false);
  if (errored || !src) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
        <ImageIcon className="h-8 w-8" />
        <span className="mt-1 text-[10px]">No image</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      onError={() => setErrored(true)}
    />
  );
}

export function AresProducts({ data, onChanged }: { data: any; onChanged: () => void }) {
  const products: Product[] = data.products ?? [];
  const productFields: ProductField[] = data.business.productFields ?? [];
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = products.filter((p) =>
    !search ? true : `${p.name} ${p.description ?? ""} ${p.category ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Product deleted", description: "The product has been removed from your catalog." });
      onChanged();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ares-navy">Products</h2>
          <p className="text-xs text-muted-foreground">{products.length} item{products.length === 1 ? "" : "s"} in your catalog</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-ares-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-ares-sea-deep">
          <Plus className="h-4 w-4" /> Add product
        </button>
      </div>

      {products.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-xl border border-ares-line bg-white py-2.5 pl-10 pr-3 text-sm text-ares-navy placeholder:text-muted-foreground focus:border-ares-sea/40 focus:outline-none focus:ring-2 focus:ring-ares-sea/15"
          />
        </div>
      )}

      {products.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ares-line bg-white p-10 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold text-ares-navy">Your catalog is empty</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Add products with images. {data.business.agentName} will analyze each image so it can recognize products when customers describe them.
          </p>
          <button onClick={() => setShowForm(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-ares-navy px-4 py-2 text-xs font-semibold text-white hover:bg-ares-sea-deep">
            <Plus className="h-3.5 w-3.5" /> Add your first product
          </button>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const attrs = p.attributes || {};
            const attrEntries = Object.entries(attrs).filter(([, v]) => v);
            return (
              <div key={p.id} className="group overflow-hidden rounded-2xl border border-ares-line bg-white transition-all hover:border-ares-sea/30 hover:shadow-sm">
                <div className="relative aspect-square bg-ares-mist">
                  <ProductImage src={p.imageUrl ?? ""} alt={p.imageAlt || p.name} name={p.name} />
                  <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-rose-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white disabled:opacity-50" aria-label="Delete">
                    {deletingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                  {p.imageUrl && p.imageAlt && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ares-navy/80 to-transparent p-2">
                      <div className="flex items-center gap-1 text-[9px] text-white/80">
                        <Sparkles className="h-2.5 w-2.5" /> AI: {p.imageAlt}
                      </div>
                    </div>
                  )}
                  {p.stock <= p.lowStockThreshold && (
                    <span className="absolute left-2 top-2 rounded-md bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">Low stock</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="truncate text-sm font-semibold text-ares-navy">{p.name}</div>
                  {p.category && <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{p.category}</div>}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="font-mono text-sm font-bold text-ares-sea-deep">{p.currency === "GHS" ? "GH₵" : p.currency} {p.price.toFixed(2)}</div>
                    <div className="text-[11px] text-muted-foreground">Stock: <span className="font-mono font-semibold text-ares-navy">{p.stock}</span></div>
                  </div>
                  {attrEntries.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {attrEntries.map(([k, v]) => (
                        <span key={k} className="rounded bg-ares-mist px-1.5 py-0.5 text-[10px] font-medium text-ares-navy">{k}: {String(v)}</span>
                      ))}
                    </div>
                  )}
                  {/* Update button -- always visible */}
                  <button
                    onClick={() => { setEditingProduct(p); setShowForm(true); }}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-ares-line bg-white px-3 py-1.5 text-xs font-semibold text-ares-navy transition-colors hover:border-ares-sea/40 hover:bg-ares-foam"
                  >
                    <Pencil className="h-3 w-3" />
                    Update
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ProductForm
          agentName={data.business.agentName}
          productFields={productFields}
          editingProduct={editingProduct}
          onClose={() => { setShowForm(false); setEditingProduct(null); }}
          onSaved={() => { setShowForm(false); setEditingProduct(null); onChanged(); }}
        />
      )}
    </div>
  );
}

function ProductForm({ agentName, productFields, editingProduct, onClose, onSaved }: { agentName: string; productFields: ProductField[]; editingProduct: Product | null; onClose: () => void; onSaved: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isEditing = !!editingProduct;
  const [name, setName] = useState(editingProduct?.name ?? "");
  const [description, setDescription] = useState(editingProduct?.description ?? "");
  const [category, setCategory] = useState(editingProduct?.category ?? "");
  const [price, setPrice] = useState(editingProduct ? String(editingProduct.price) : "");
  const [stock, setStock] = useState(editingProduct ? String(editingProduct.stock) : "10");
  const [lowStockThreshold, setLowStockThreshold] = useState(editingProduct ? String(editingProduct.lowStockThreshold) : "5");
  const [imageAlt, setImageAlt] = useState(editingProduct?.imageAlt ?? "");
  const [imagePreview, setImagePreview] = useState<string | null>(editingProduct?.imageUrl ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>(() => {
    if (editingProduct?.attributes) {
      const attrs = typeof editingProduct.attributes === "string" ? JSON.parse(editingProduct.attributes) : editingProduct.attributes;
      return attrs;
    }
    return {};
  });
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalyzed, setAiAnalyzed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setAiAnalyzed(false);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Product name is required."); return; }
    const priceNum = parseFloat(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) { setError("Enter a valid price."); return; }
    setLoading(true);
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.set("name", name.trim());
      fd.set("description", description.trim());
      fd.set("category", category.trim());
      fd.set("price", String(priceNum));
      fd.set("stock", stock);
      fd.set("lowStockThreshold", lowStockThreshold);
      fd.set("imageAlt", imageAlt.trim());
      for (const [k, v] of Object.entries(dynamicFields)) {
        if (v.trim()) fd.set(k, v.trim());
      }
      if (file) fd.set("image", file);

      const url = isEditing && editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(url, { method, body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to save product");
      toast({ title: isEditing ? "Product updated" : "Product saved", description: `${name} has been ${isEditing ? "updated" : "added"}.` });
      onSaved();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
      setLoading(false);
      setAnalyzing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ares-navy/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto ares-scroll rounded-3xl border border-ares-line bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-ares-line bg-white px-6 py-4">
          <h3 className="text-sm font-semibold text-ares-navy">{isEditing ? "Update product" : "Add a product"}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-ares-mist"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          {/* Image upload */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ares-navy">Product image</label>
            <div className="flex gap-3">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ares-line bg-ares-mist">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
                <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-ares-line bg-white px-3 py-2 text-xs font-medium text-ares-navy hover:border-ares-sea/40">
                  <Upload className="h-3.5 w-3.5" /> {file ? "Change image" : "Upload image"}
                </button>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {file && !aiAnalyzed && analyzing ? (
                    <span className="inline-flex items-center gap-1 text-ares-sea-deep"><Loader2 className="h-3 w-3 animate-spin" /> {agentName} is analyzing the image…</span>
                  ) : aiAnalyzed ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600"><Sparkles className="h-3 w-3" /> {agentName} analyzed the image</span>
                  ) : (
                    <>PNG or JPG, max 5MB. {agentName} will analyze the image to recognize the product when customers describe it.</>
                  )}
                </p>
                <input
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Describe this image (or leave blank for automatic analysis)"
                  className="mt-2 w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-xs text-ares-navy placeholder:text-muted-foreground focus:border-ares-sea/40 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ares-navy">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jollof Rice & Chicken" className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ares-navy">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What is this product?" className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ares-navy">Price (GHS) *</label>
              <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ares-navy">Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Main" className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none" />
            </div>
          </div>

          {/* Dynamic fields based on sector */}
          {productFields.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ares-navy">Product details</label>
              <div className="grid grid-cols-2 gap-3">
                {productFields.map((f) => (
                  <div key={f.key}>
                    <label className="mb-0.5 block text-[11px] text-muted-foreground">{f.label}</label>
                    {f.type === "select" ? (
                      <select
                        value={dynamicFields[f.key] ?? ""}
                        onChange={(e) => setDynamicFields((s) => ({ ...s, [f.key]: e.target.value }))}
                        className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none"
                      >
                        <option value="">Select…</option>
                        {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={f.type === "number" ? "number" : "text"}
                        value={dynamicFields[f.key] ?? ""}
                        onChange={(e) => setDynamicFields((s) => ({ ...s, [f.key]: e.target.value }))}
                        placeholder={f.placeholder ?? f.label}
                        className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy placeholder:text-muted-foreground focus:border-ares-sea/40 focus:outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ares-navy">Stock</label>
              <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ares-navy">Low stock alert</label>
              <input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none" />
            </div>
          </div>

          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-ares-line bg-white px-4 py-2 text-sm font-medium text-ares-navy hover:border-ares-sea/40">Cancel</button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg bg-ares-navy px-4 py-2 text-sm font-semibold text-white hover:bg-ares-sea-deep disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? (analyzing ? "Analyzing image..." : "Saving...") : isEditing ? "Update product" : "Save product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
