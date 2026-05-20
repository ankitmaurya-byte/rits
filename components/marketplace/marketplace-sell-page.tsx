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
  quickCommerceServiceAreas: "",
  quickCommerceInventoryReserve: "0",
};

export function MarketplaceSellPage() {
  const { user } = useUser();
  const productsQuery = useQuery(api.marketplace.listSellerProducts, user ? {} : "skip");
  const products = productsQuery ?? [];
  const orders = useQuery(api.marketplace.listSellerOrders, user ? {} : "skip") ?? [];
  const buyerOrders = useQuery(api.marketplace.listBuyerOrders, user ? {} : "skip") ?? [];
  const settlements = useQuery(api.marketplace.getSellerSettlementSummary, user ? {} : "skip");
  const createProduct = useMutation(api.marketplace.createProduct);
  const updateProduct = useMutation(api.marketplace.updateProduct);
  const updateProductStatus = useMutation(api.marketplace.updateProductStatus);
  const updateOrderFulfillmentStatus = useMutation(api.marketplace.updateOrderFulfillmentStatus);
  const createPayoutRequest = useMutation(api.marketplace.createPayoutRequest);
  const sellerProfile = useQuery(api.marketplace.getMySellerProfile, user ? {} : "skip");
  const registerSeller = useMutation(api.marketplace.registerSeller);

  const [form, setForm] = useState(emptyForm);
  const [kycForm, setKycForm] = useState({ companyName: "", storeDescription: "", registrationDetails: "" });
  const [kycInitialized, setKycInitialized] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"images" | "videos" | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [savingKyc, setSavingKyc] = useState(false);

  const publishedCount = useMemo(() => products.filter((product) => product.status === "published").length, [products]);

  if (sellerProfile?.kyc && !kycInitialized) {
    setKycForm({
      companyName: sellerProfile.kyc.companyName,
      storeDescription: sellerProfile.kyc.storeDescription,
      registrationDetails: sellerProfile.kyc.registrationDetails || "",
    });
    setKycInitialized(true);
  }

  const handleSaveKyc = async () => {
    if (!kycForm.companyName.trim() || !kycForm.storeDescription.trim()) {
      toast.error("Company name and description are required.");
      return;
    }
    setSavingKyc(true);
    try {
      await registerSeller(kycForm);
      toast.success("Store details saved.");
    } catch (e) {
      toast.error("Failed to save store details.");
    } finally {
      setSavingKyc(false);
    }
  };

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
      const payload = {
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
        quickCommerceServiceAreas: form.quickCommerceEnabled ? form.quickCommerceServiceAreas.split(",").map((area) => area.trim()).filter(Boolean) : [],
        quickCommerceInventoryReserve: form.quickCommerceEnabled ? Number(form.quickCommerceInventoryReserve || 0) : undefined,
        shippingCity: form.shippingCity || undefined,
        shippingNotes: form.shippingNotes || undefined,
      };

      if (editingProductId) {
        await updateProduct({ productId: editingProductId as never, status: publishNow ? "published" : "draft", ...payload });
      } else {
        await createProduct({ ...payload, publishNow });
      }
      setForm(emptyForm);
      setImageUrls([]);
      setVideoUrls([]);
      setEditingProductId(null);
      toast.success(publishNow ? "Product published." : "Draft saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditProduct = (product: (typeof products)[number]) => {
    setEditingProductId(product._id);
    setForm({
      title: product.title,
      shortDescription: product.shortDescription ?? "",
      description: product.description,
      category: product.category,
      tags: product.tags.join(", "),
      price: String(product.priceInPaise / 100),
      condition: product.condition,
      inventoryCount: String(product.inventoryCount),
      demoUrl: product.demoUrl ?? "",
      shippingCity: product.shippingCity ?? "",
      shippingNotes: product.shippingNotes ?? "",
      quickCommerceEnabled: product.quickCommerceEnabled,
      quickCommerceEtaMinutes: String(product.quickCommerceEtaMinutes ?? 30),
      quickCommerceServiceAreas: product.quickCommerceServiceAreas.join(", "),
      quickCommerceInventoryReserve: String(product.quickCommerceInventoryReserve ?? 0),
    });
    setImageUrls(product.imageUrls);
    setVideoUrls(product.videoUrls);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreatePayout = async () => {
    const orderIds = settlements?.availableOrders.map((order) => order._id) ?? [];
    if (!orderIds.length) {
      toast.error("No available orders to request payout for.");
      return;
    }
    try {
      await createPayoutRequest({ orderIds });
      toast.success("Payout request created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create payout request.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KYC / Store Settings */}
      <section className="feature-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium" style={{ color: "var(--ink)" }}>Store Registration & KYC</h2>
          {sellerProfile?.kyc && (
            <span className={`text-xs px-2 py-1 rounded-full border ${sellerProfile.kyc.kycStatus === 'approved' ? 'bg-[rgba(17,255,153,0.1)] text-[var(--accent-green)] border-[rgba(17,255,153,0.22)]' : 'bg-transparent text-[var(--charcoal)] border-[var(--hairline)]'}`}>
              Status: {sellerProfile.kyc.kycStatus}
            </span>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <input value={kycForm.companyName} onChange={(e) => setKycForm(c => ({...c, companyName: e.target.value}))} className="input-field" placeholder="Company / Store Name" />
          <input value={kycForm.registrationDetails} onChange={(e) => setKycForm(c => ({...c, registrationDetails: e.target.value}))} className="input-field" placeholder="Registration ID / GST / Tax Info" />
        </div>
        <textarea value={kycForm.storeDescription} onChange={(e) => setKycForm(c => ({...c, storeDescription: e.target.value}))} className="input-field min-h-[80px]" placeholder="Store Description & Return Policy" />
        <button type="button" onClick={() => void handleSaveKyc()} disabled={savingKyc} className="btn-primary">
          {savingKyc ? "Saving..." : "Save Store Details"}
        </button>
      </section>

      {buyerOrders.length > 0 && (
        <section className="feature-card p-5 space-y-4">
          <h2 className="text-lg font-medium" style={{ color: "var(--ink)" }}>Resell Purchased Items</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {buyerOrders.flatMap(order => order.items).map(item => (
              <div key={item._id} className="rounded-2xl border p-4 flex flex-col justify-between" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
                <div>
                  <p className="text-sm font-medium line-clamp-2" style={{ color: "var(--ink)" }}>{item.titleSnapshot}</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--charcoal)" }}>Purchased for INR {(item.priceInPaise / 100).toLocaleString("en-IN")}</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    setForm({
                      ...emptyForm,
                      title: item.titleSnapshot,
                      description: `Selling my used ${item.titleSnapshot}.`,
                      price: String(Math.floor((item.priceInPaise / 100) * 0.7)),
                      condition: "used",
                    });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    toast.success("Listing pre-filled! Add images to continue.");
                  }}
                  className="btn-outline mt-3 w-full text-xs py-1.5"
                >
                  Resell item
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

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
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input value={form.quickCommerceServiceAreas} onChange={(event) => setForm((current) => ({ ...current, quickCommerceServiceAreas: event.target.value }))} className="input-field" placeholder="Service areas: Mumbai, Pune, Bangalore" disabled={!form.quickCommerceEnabled} />
              <input value={form.quickCommerceInventoryReserve} onChange={(event) => setForm((current) => ({ ...current, quickCommerceInventoryReserve: event.target.value }))} className="input-field" placeholder="Reserve stock for instant delivery" type="number" min="0" disabled={!form.quickCommerceEnabled} />
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
            <button type="button" onClick={() => void handleSubmit(false)} disabled={saving} className="btn-outline"><Upload size={15} /> {saving ? "Saving..." : editingProductId ? "Update draft" : "Save draft"}</button>
            <button type="button" onClick={() => void handleSubmit(true)} disabled={saving} className="btn-primary"><Upload size={15} /> {saving ? "Publishing..." : editingProductId ? "Update product" : "Publish product"}</button>
            {editingProductId ? <button type="button" onClick={() => { setEditingProductId(null); setForm(emptyForm); setImageUrls([]); setVideoUrls([]); }} className="btn-outline">Cancel edit</button> : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="feature-card p-5 space-y-4">
            <h2 className="text-lg font-medium" style={{ color: "var(--ink)" }}>Settlement</h2>
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
              <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Available amount</p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--ink)" }}>{((settlements?.availableAmountInPaise ?? 0) / 100).toLocaleString("en-IN", { style: "currency", currency: "INR" })}</p>
            </div>
            <button type="button" onClick={() => void handleCreatePayout()} className="btn-outline w-full">Create payout request</button>
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
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => handleEditProduct(product)} className="btn-outline text-xs">Edit</button>
                </div>
              </div>
            )) : <p className="text-sm" style={{ color: "var(--charcoal)" }}>No products uploaded yet.</p>}
          </div>
          </div>

          <div className="feature-card p-5 space-y-4">
            <h2 className="text-lg font-medium" style={{ color: "var(--ink)" }}>Seller orders</h2>
            <div className="space-y-3">
              {orders.length ? orders.map((order) => (
                <div key={order._id} className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{order.buyer?.name ?? "Buyer"}</p>
                      <p className="mt-1 text-xs" style={{ color: "var(--charcoal)" }}>{order.formattedTotal} · {order.paymentStatus} · {order.fulfillmentStatus}</p>
                    </div>
                    <select value={order.fulfillmentStatus} onChange={(event) => void updateOrderFulfillmentStatus({ orderId: order._id, fulfillmentStatus: event.target.value as never })} className="input-field w-40 text-xs">
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              )) : <p className="text-sm" style={{ color: "var(--charcoal)" }}>No seller orders yet.</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
