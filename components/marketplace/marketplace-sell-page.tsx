"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { ImagePlus, Upload, Video } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";

const emptyForm = {
  title: "",
  shortDescription: "",
  description: "",
  category: "AI Hardware",
  tags: "",
  price: "",
  condition: "new",
  inventoryCount: "1",
  demoUrl: "",
  shippingCity: "",
  shippingNotes: "",
  quickCommerceEnabled: false,
  quickCommerceEtaMinutes: "30",
};

export function MarketplaceSellPage() {
  const { user } = useUser();
  const productsQuery = useQuery(api.marketplace.listSellerProducts, user ? {} : "skip");
  const products = productsQuery ?? [];
  const createProduct = useMutation(api.marketplace.createProduct);
  const updateProductStatus = useMutation(api.marketplace.updateProductStatus);
  const [form, setForm] = useState(emptyForm);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"images" | "videos" | null>(null);

  const publishedCount = useMemo(() => products.filter((product) => product.status === "published").length, [products]);

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setUploading("images");
    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/cloudinary/upload", { method: "POST", body: formData });
        const data = await response.json() as { url?: string; error?: string };
        if (!response.ok || !data.url) throw new Error(data.error ?? "Image upload failed.");
        return data.url;
      }));
      setImageUrls((current) => [...current, ...uploaded]);
      toast.success("Images uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(null);
      event.target.value = "";
    }
  };

  const handleVideoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setUploading("videos");
    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/cloudinary/upload-video", { method: "POST", body: formData });
        const data = await response.json() as { url?: string; error?: string };
        if (!response.ok || !data.url) throw new Error(data.error ?? "Video upload failed.");
        return data.url;
      }));
      setVideoUrls((current) => [...current, ...uploaded]);
      toast.success("Videos uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Video upload failed.");
    } finally {
      setUploading(null);
      event.target.value = "";
    }
  };

  const handleSubmit = async (publishNow: boolean) => {
    if (!user) {
      toast.error("Sign in to sell products.");
      return;
    }
    setSaving(true);
    try {
      await createProduct({
        title: form.title,
        shortDescription: form.shortDescription || undefined,
        description: form.description,
        category: form.category,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        priceInPaise: Math.round(Number(form.price || 0) * 100),
        currency: "INR",
        condition: form.condition as "new" | "refurbished" | "used",
        inventoryCount: Number(form.inventoryCount || 0),
        coverImageUrl: imageUrls[0],
        imageUrls,
        videoUrls,
        demoUrl: form.demoUrl || undefined,
        quickCommerceEnabled: form.quickCommerceEnabled,
        quickCommerceEtaMinutes: form.quickCommerceEnabled ? Number(form.quickCommerceEtaMinutes || 30) : undefined,
        shippingCity: form.shippingCity || undefined,
        shippingNotes: form.shippingNotes || undefined,
        publishNow,
      });
      setForm(emptyForm);
      setImageUrls([]);
      setVideoUrls([]);
      toast.success(publishNow ? "Product published." : "Draft saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container animate-fade-in-up space-y-6">
      <section className="feature-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--mute)" }}>Seller hub</p>
            <h1 className="text-3xl font-medium" style={{ color: "var(--ink)" }}>Upload tech products, stock them, and flag quick-commerce inventory.</h1>
          </div>
          <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
            <p className="text-xs" style={{ color: "var(--mute)" }}>Published</p>
            <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--ink)" }}>{publishedCount}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="feature-card p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="input-field" placeholder="Product title" />
            <input value={form.shortDescription} onChange={(event) => setForm((current) => ({ ...current, shortDescription: event.target.value }))} className="input-field" placeholder="Short description" />
          </div>
          <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="input-field min-h-[140px] resize-y" placeholder="Full product description" />
          <div className="grid gap-4 md:grid-cols-4">
            <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="input-field" placeholder="Category" />
            <input value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} className="input-field" placeholder="ai, creator, gadget" />
            <input value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} className="input-field" placeholder="Price INR" type="number" min="0" />
            <input value={form.inventoryCount} onChange={(event) => setForm((current) => ({ ...current, inventoryCount: event.target.value }))} className="input-field" placeholder="Inventory" type="number" min="0" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <select value={form.condition} onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))} className="input-field">
              <option value="new">New</option>
              <option value="refurbished">Refurbished</option>
              <option value="used">Used</option>
            </select>
            <input value={form.demoUrl} onChange={(event) => setForm((current) => ({ ...current, demoUrl: event.target.value }))} className="input-field" placeholder="Demo URL" />
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
            <label className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--ink)" }}>
              <input type="checkbox" checked={form.quickCommerceEnabled} onChange={(event) => setForm((current) => ({ ...current, quickCommerceEnabled: event.target.checked }))} />
              Enable quick commerce
            </label>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <input value={form.quickCommerceEtaMinutes} onChange={(event) => setForm((current) => ({ ...current, quickCommerceEtaMinutes: event.target.value }))} className="input-field" placeholder="ETA minutes" type="number" min="1" disabled={!form.quickCommerceEnabled} />
              <input value={form.shippingCity} onChange={(event) => setForm((current) => ({ ...current, shippingCity: event.target.value }))} className="input-field" placeholder="Delivery city" disabled={!form.quickCommerceEnabled} />
              <input value={form.shippingNotes} onChange={(event) => setForm((current) => ({ ...current, shippingNotes: event.target.value }))} className="input-field" placeholder="Shipping note" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="btn-outline cursor-pointer"><ImagePlus size={15} /> {uploading === "images" ? "Uploading..." : "Upload images"}<input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} /></label>
            <label className="btn-outline cursor-pointer"><Video size={15} /> {uploading === "videos" ? "Uploading..." : "Upload videos"}<input type="file" accept="video/*" multiple className="hidden" onChange={handleVideoUpload} /></label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
              <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Images</p>
              <div className="mt-3 space-y-2 text-xs" style={{ color: "var(--charcoal)" }}>{imageUrls.length ? imageUrls.map((url) => <p key={url} className="truncate">{url}</p>) : <p>No images uploaded yet.</p>}</div>
            </div>
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
              <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Videos</p>
              <div className="mt-3 space-y-2 text-xs" style={{ color: "var(--charcoal)" }}>{videoUrls.length ? videoUrls.map((url) => <p key={url} className="truncate">{url}</p>) : <p>No videos uploaded yet.</p>}</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => void handleSubmit(false)} disabled={saving} className="btn-outline"><Upload size={15} /> {saving ? "Saving..." : "Save draft"}</button>
            <button type="button" onClick={() => void handleSubmit(true)} disabled={saving} className="btn-primary"><Upload size={15} /> {saving ? "Publishing..." : "Publish product"}</button>
          </div>
        </div>

        <div className="feature-card p-5 space-y-4">
          <h2 className="text-lg font-medium" style={{ color: "var(--ink)" }}>Your products</h2>
          <div className="space-y-3">
            {products.length ? products.map((product) => (
              <div key={product._id} className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{product.title}</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--charcoal)" }}>{product.formattedPrice} · {product.inventoryCount} units</p>
                  </div>
                  <button type="button" onClick={() => void updateProductStatus({ productId: product._id, status: product.status === "published" ? "draft" : "published" })} className="btn-outline text-xs">
                    {product.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                </div>
              </div>
            )) : <p className="text-sm" style={{ color: "var(--charcoal)" }}>No products uploaded yet.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
