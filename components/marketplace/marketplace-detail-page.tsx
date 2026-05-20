"use client";

import Image from "next/image";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { ShoppingCart, Truck, Video, Star, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";

export function MarketplaceDetailPage({ slug }: { slug: string }) {
  const { user } = useUser();
  const product = useQuery(api.marketplace.getProductBySlug, { slug });
  const addToCart = useMutation(api.marketplace.addToCart);
  const reviews = useQuery(api.marketplace.listReviews, product ? { productId: product._id as never } : "skip");
  const sellerProfile = useQuery(api.marketplace.getSellerProfile, product?.seller ? { sellerId: product.seller._id as never } : "skip");
  const upsellProducts = useQuery(api.marketplace.getUpsellProducts, product ? { productId: product._id as never } : "skip");
  const addReview = useMutation(api.marketplace.addReview);
  const cart = useQuery(api.marketplace.getCart, {});
  const updateQuantity = useMutation(api.marketplace.updateCartItemQuantity);
  const removeCartItem = useMutation(api.marketplace.removeCartItem);
  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  const cartItem = cart?.items.find((item) => item.product._id === product?._id);

  const handleAddToCart = async () => {
    if (!product) return;
    if (!user) {
      toast.error("Sign in to add products to cart.");
      return;
    }
    try {
      await addToCart({ productId: product._id, quantity: 1 });
      toast.success("Added to cart.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add to cart.");
    }
  };

  if (product === undefined) {
    return <div><div className="skeleton h-96 rounded-3xl" /></div>;
  }

  if (!product) {
    return <div><div className="feature-card p-10 text-center text-sm" style={{ color: "var(--charcoal)" }}>Product not found.</div></div>;
  }

  return (
    <div className="space-y-12">
      <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
        <section>
          <div className="grid gap-4">
            <div className="relative h-[420px] overflow-hidden rounded-3xl" style={{ backgroundColor: "var(--surface-deep)" }}>
              {product.coverImageUrl ? <Image src={product.coverImageUrl} alt={product.title} fill className="object-cover" unoptimized /> : null}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {product.imageUrls.slice(0, 3).map((url) => (
                <div key={url} className="relative h-28 overflow-hidden rounded-2xl" style={{ backgroundColor: "var(--surface-deep)" }}>
                  <Image src={url} alt={product.title} fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>{product.category}</p>
            <h1 className="mt-2 text-3xl font-medium" style={{ color: "var(--ink)" }}>{product.title}</h1>
            <p className="mt-3 text-sm leading-7" style={{ color: "var(--body)" }}>{product.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {product.tags.map((tag) => <span key={tag} className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--mute)" }}>{tag}</span>)}
          </div>
          <div className="py-2">
            <p className="text-3xl font-semibold" style={{ color: "var(--ink)" }}>{product.formattedPrice}</p>
            <p className="mt-2 text-sm" style={{ color: "var(--charcoal)" }}>{product.quickCommerceEnabled ? `${product.quickCommerceEtaMinutes ?? 30} minute delivery available in ${product.shippingCity ?? "supported cities"}` : `${product.inventoryCount} in stock`}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 py-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Seller</p>
              <p className="mt-2 text-sm font-medium" style={{ color: "var(--ink)" }}>{product.seller?.name ?? "Marketplace seller"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Delivery</p>
              <p className="mt-2 text-sm font-medium" style={{ color: "var(--ink)" }}>{product.quickCommerceEnabled ? <span className="inline-flex items-center gap-2"><Truck size={14} /> Quick commerce</span> : "Standard shipping"}</p>
              {product.quickCommerceEnabled && product.quickCommerceServiceAreas?.length ? <p className="mt-2 text-xs" style={{ color: "var(--charcoal)" }}>{product.quickCommerceServiceAreas.join(", ")}</p> : null}
            </div>
          </div>
          {product.videoUrls.length ? (
            <div className="py-2">
              <p className="mb-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}><Video size={14} /> Product videos</p>
              <div className="space-y-2">
                {product.videoUrls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="block text-sm" style={{ color: "var(--accent-blue)" }}>{url}</a>)}
              </div>
            </div>
          ) : null}
          {cartItem ? (
            <div className="flex items-center justify-between gap-4 p-1 rounded-md border" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
              <button type="button" onClick={() => cartItem.quantity > 1 ? updateQuantity({ cartItemId: cartItem._id, quantity: cartItem.quantity - 1 }) : removeCartItem({ cartItemId: cartItem._id })} className="btn-ghost flex-1">
                {cartItem.quantity > 1 ? <Minus size={16} /> : <Trash2 size={16} style={{ color: "var(--accent-red)" }} />}
              </button>
              <span className="text-base font-medium min-w-[2rem] text-center" style={{ color: "var(--ink)" }}>{cartItem.quantity}</span>
              <button type="button" disabled={cartItem.quantity >= product.inventoryCount} title={cartItem.quantity >= product.inventoryCount ? "Max stock reached" : ""} onClick={() => updateQuantity({ cartItemId: cartItem._id, quantity: cartItem.quantity + 1 })} className={`btn-ghost flex-1 ${cartItem.quantity >= product.inventoryCount ? "opacity-50 cursor-not-allowed" : ""}`}>
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => void handleAddToCart()} className="btn-primary w-full"><ShoppingCart size={15} /> Add to cart</button>
          )}
        </section>
      </div>

      {/* Seller Profile & Other Products */}
      {sellerProfile?.user && (
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-12 w-12 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-deep)" }}>
              {sellerProfile.user.image ? <Image src={sellerProfile.user.image} alt="Seller" width={48} height={48} /> : null}
            </div>
            <div>
              <h3 className="text-lg font-medium" style={{ color: "var(--ink)" }}>{sellerProfile.user.name}</h3>
              {sellerProfile.kyc?.companyName && <p className="text-sm" style={{ color: "var(--charcoal)" }}>{sellerProfile.kyc.companyName} {sellerProfile.kyc.kycStatus === "approved" ? "✓ Verified" : ""}</p>}
            </div>
          </div>
          <h4 className="text-sm font-medium mb-4" style={{ color: "var(--ink)" }}>More from this seller</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sellerProfile.products.filter(p => p._id !== product._id).slice(0, 4).map(p => (
              <a href={`?product=${p.slug}`} key={p._id} className="block group">
                <div className="relative h-32 rounded-xl overflow-hidden mb-2" style={{ backgroundColor: "var(--surface-deep)" }}>
                  {p.coverImageUrl ? <Image src={p.coverImageUrl} alt={p.title} fill className="object-cover group-hover:scale-105 transition-transform" /> : null}
                </div>
                <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>{p.title}</p>
                <p className="text-xs" style={{ color: "var(--charcoal)" }}>{p.formattedPrice}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Discussion */}
      <section>
        <h3 className="text-lg font-medium mb-6" style={{ color: "var(--ink)" }}>Discussion</h3>
        <div className="space-y-6">
          <div className="space-y-4">
            {reviews?.length ? reviews.filter(r => !r.parentId).map((review) => (
              <div key={review._id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full overflow-hidden shrink-0" style={{ backgroundColor: "var(--surface-deep)" }}>
                    {review.user?.image ? <Image src={review.user.image} alt={review.user.name ?? "User"} width={32} height={32} /> : null}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{review.user?.name ?? "User"}</span>
                      <span className="text-xs" style={{ color: "var(--mute)" }}>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "var(--charcoal)" }}>{review.comment}</p>
                    {user && (
                      <button type="button" onClick={() => setReplyingTo({ id: review._id, name: review.user?.name ?? "User" })} className="text-xs font-medium hover:underline" style={{ color: "var(--accent-blue)" }}>
                        Reply
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Replies */}
                {reviews.filter(r => r.parentId === review._id).length > 0 && (
                  <div className="pl-11 space-y-3 mt-3 border-l-2" style={{ borderColor: "var(--hairline)" }}>
                    {reviews.filter(r => r.parentId === review._id).map(reply => (
                      <div key={reply._id} className="flex items-start gap-3 pl-3">
                        <div className="h-6 w-6 rounded-full overflow-hidden shrink-0" style={{ backgroundColor: "var(--surface-deep)" }}>
                          {reply.user?.image ? <Image src={reply.user.image} alt={reply.user.name ?? "User"} width={24} height={24} /> : null}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>{reply.user?.name ?? "User"}</span>
                          </div>
                          <p className="text-[13px]" style={{ color: "var(--charcoal)" }}>{reply.comment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )) : <p className="text-sm" style={{ color: "var(--charcoal)" }}>No comments yet. Start the conversation!</p>}
          </div>

          {user && (
            <div className="pt-4 border-t" style={{ borderColor: "var(--hairline)" }}>
              {replyingTo && (
                <div className="flex items-center justify-between bg-[var(--surface-elevated)] p-2 rounded-t-md border-b" style={{ borderColor: "var(--hairline)" }}>
                  <span className="text-xs" style={{ color: "var(--charcoal)" }}>Replying to <span className="font-medium text-[var(--ink)]">{replyingTo.name}</span></span>
                  <button type="button" onClick={() => setReplyingTo(null)} className="text-xs hover:underline" style={{ color: "var(--mute)" }}>Cancel</button>
                </div>
              )}
              <div className="relative">
                <textarea 
                  value={comment} 
                  onChange={(e) => setComment(e.target.value)} 
                  placeholder={replyingTo ? "Write a reply..." : "Ask a question or leave a comment..."} 
                  className={`input-field min-h-[60px] resize-y ${replyingTo ? 'rounded-t-none border-t-0' : ''}`}
                />
                <button 
                  className="btn-primary text-xs absolute right-2 bottom-2" 
                  disabled={!comment.trim() || submittingReview}
                  onClick={async () => {
                    setSubmittingReview(true);
                    try {
                      await addReview({ 
                        productId: product._id as never, 
                        parentId: replyingTo?.id as never | undefined,
                        comment 
                      });
                      setComment("");
                      setReplyingTo(null);
                      toast.success(replyingTo ? "Reply posted." : "Comment posted.");
                    } catch (e) {
                      toast.error("Failed to post.");
                    } finally {
                      setSubmittingReview(false);
                    }
                  }}
                >
                  Post
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Upsell / Recommended Products */}
      {upsellProducts?.length ? (
        <section>
          <h3 className="text-lg font-medium mb-4" style={{ color: "var(--ink)" }}>Recommended for you</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {upsellProducts.filter(p => p._id !== product._id).slice(0, 4).map(p => (
              <a href={`?product=${p.slug}`} key={p._id} className="block group">
                <div className="relative h-32 rounded-xl overflow-hidden mb-2" style={{ backgroundColor: "var(--surface-deep)" }}>
                  {p.coverImageUrl ? <Image src={p.coverImageUrl} alt={p.title} fill className="object-cover group-hover:scale-105 transition-transform" /> : null}
                </div>
                <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>{p.title}</p>
                <p className="text-xs" style={{ color: "var(--charcoal)" }}>{p.formattedPrice}</p>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
