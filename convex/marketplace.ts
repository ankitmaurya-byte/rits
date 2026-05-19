import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireCurrentUser } from "./authHelpers";

type DbCtx = QueryCtx | MutationCtx;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function formatPrice(priceInPaise: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(priceInPaise / 100);
}

function shapeProduct(product: Doc<"marketplaceProducts">, seller?: Doc<"users"> | null) {
  return {
    ...product,
    seller: seller
      ? {
          _id: seller._id,
          name: seller.name,
          image: seller.image,
          currentCompany: seller.currentCompany,
        }
      : null,
    formattedPrice: formatPrice(product.priceInPaise, product.currency),
  };
}

async function getSellerMap(ctx: DbCtx, products: Doc<"marketplaceProducts">[]) {
  const sellerIds = Array.from(new Set(products.map((product) => product.sellerId)));
  const sellers = await Promise.all(sellerIds.map((sellerId) => ctx.db.get(sellerId)));
  return new Map(sellerIds.map((sellerId, index) => [sellerId, sellers[index] ?? null]));
}

async function getCartRowsWithProducts(ctx: DbCtx, userId: Id<"users">) {
  const cartRows = await ctx.db
    .query("marketplaceCartItems")
    .withIndex("by_user_and_updated_at", (q) => q.eq("userId", userId))
    .order("desc")
    .take(200);

  const items = await Promise.all(
    cartRows.map(async (row: Doc<"marketplaceCartItems">) => {
      const product = await ctx.db.get(row.productId);
      return product ? { row, product } : null;
    }),
  );

  return items.filter((item): item is NonNullable<typeof item> => item !== null);
}

export const listProducts = query({
  args: {
    search: v.optional(v.string()),
    quickOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("marketplaceProducts")
      .withIndex("by_status_and_updated_at", (q) => q.eq("status", "published"))
      .order("desc")
      .take(200);

    const search = args.search?.trim().toLowerCase() ?? "";
    const filtered = rows.filter((row) => {
      if (args.quickOnly && !row.quickCommerceEnabled) return false;
      if (!search) return true;
      const haystack = [row.title, row.shortDescription, row.description, row.category, ...row.tags].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(search);
    });

    const sellerMap = await getSellerMap(ctx, filtered);
    return filtered.map((product) => shapeProduct(product, sellerMap.get(product.sellerId)));
  },
});

export const getProductBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("marketplaceProducts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!product || product.status !== "published") {
      return null;
    }

    const seller = await ctx.db.get(product.sellerId);
    return shapeProduct(product, seller);
  },
});

export const listSellerProducts = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    const products = await ctx.db
      .query("marketplaceProducts")
      .withIndex("by_seller_and_updated_at", (q) => q.eq("sellerId", user._id))
      .order("desc")
      .take(200);

    return products.map((product) => shapeProduct(product, user));
  },
});

export const createProduct = mutation({
  args: {
    title: v.string(),
    shortDescription: v.optional(v.string()),
    description: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    priceInPaise: v.number(),
    currency: v.string(),
    condition: v.union(v.literal("new"), v.literal("refurbished"), v.literal("used")),
    inventoryCount: v.number(),
    coverImageUrl: v.optional(v.string()),
    imageUrls: v.array(v.string()),
    videoUrls: v.array(v.string()),
    demoUrl: v.optional(v.string()),
    quickCommerceEnabled: v.boolean(),
    quickCommerceEtaMinutes: v.optional(v.number()),
    shippingCity: v.optional(v.string()),
    shippingNotes: v.optional(v.string()),
    publishNow: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);

    const title = args.title.trim();
    if (!title) throw new ConvexError("Product title is required");
    if (args.priceInPaise <= 0) throw new ConvexError("Price must be greater than zero");
    if (args.inventoryCount < 0) throw new ConvexError("Inventory cannot be negative");
    if (args.quickCommerceEnabled && !args.quickCommerceEtaMinutes) {
      throw new ConvexError("Quick commerce ETA is required when quick commerce is enabled");
    }

    const slugBase = slugify(title);
    const existing = await ctx.db
      .query("marketplaceProducts")
      .withIndex("by_slug", (q) => q.eq("slug", slugBase))
      .unique();

    const slug = existing ? `${slugBase}-${Date.now().toString().slice(-6)}` : slugBase;
    const now = Date.now();

    return await ctx.db.insert("marketplaceProducts", {
      sellerId: user._id,
      title,
      slug,
      shortDescription: args.shortDescription?.trim() || undefined,
      description: args.description.trim(),
      category: args.category.trim(),
      tags: args.tags.map((tag) => tag.trim()).filter(Boolean),
      priceInPaise: args.priceInPaise,
      currency: args.currency.trim().toUpperCase(),
      status: args.publishNow ? "published" : "draft",
      condition: args.condition,
      inventoryCount: args.inventoryCount,
      coverImageUrl: args.coverImageUrl?.trim() || args.imageUrls[0],
      imageUrls: args.imageUrls,
      videoUrls: args.videoUrls,
      demoUrl: args.demoUrl?.trim() || undefined,
      quickCommerceEnabled: args.quickCommerceEnabled,
      quickCommerceEtaMinutes: args.quickCommerceEnabled ? args.quickCommerceEtaMinutes : undefined,
      shippingCity: args.shippingCity?.trim() || undefined,
      shippingNotes: args.shippingNotes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateProductStatus = mutation({
  args: {
    productId: v.id("marketplaceProducts"),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const product = await ctx.db.get(args.productId);
    if (!product) throw new ConvexError("Product not found");
    if (product.sellerId !== user._id) throw new ConvexError("Only the seller can update product status");

    await ctx.db.patch(args.productId, { status: args.status, updatedAt: Date.now() });
    return args.productId;
  },
});

export const addToCart = mutation({
  args: {
    productId: v.id("marketplaceProducts"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const product = await ctx.db.get(args.productId);
    if (!product || product.status !== "published") throw new ConvexError("Product is unavailable");
    if (args.quantity <= 0) throw new ConvexError("Quantity must be at least 1");
    if (product.inventoryCount < args.quantity) throw new ConvexError("Not enough stock available");

    const existing = await ctx.db
      .query("marketplaceCartItems")
      .withIndex("by_user_and_product", (q) => q.eq("userId", user._id).eq("productId", args.productId))
      .unique();

    const now = Date.now();
    if (existing) {
      const quantity = existing.quantity + args.quantity;
      if (product.inventoryCount < quantity) throw new ConvexError("Not enough stock available");
      await ctx.db.patch(existing._id, { quantity, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("marketplaceCartItems", {
      userId: user._id,
      productId: args.productId,
      quantity: args.quantity,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getCart = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    const rows = await getCartRowsWithProducts(ctx, user._id);
    const sellerMap = await getSellerMap(ctx, rows.map((item) => item.product));

    const items = rows.map(({ row, product }) => ({
      _id: row._id,
      quantity: row.quantity,
      product: shapeProduct(product, sellerMap.get(product.sellerId)),
      lineTotalInPaise: row.quantity * product.priceInPaise,
    }));

    const subtotalInPaise = items.reduce((sum, item) => sum + item.lineTotalInPaise, 0);
    return {
      items,
      subtotalInPaise,
      formattedSubtotal: formatPrice(subtotalInPaise, "INR"),
    };
  },
});

export const updateCartItemQuantity = mutation({
  args: {
    cartItemId: v.id("marketplaceCartItems"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const cartItem = await ctx.db.get(args.cartItemId);
    if (!cartItem || cartItem.userId !== user._id) throw new ConvexError("Cart item not found");
    const product = await ctx.db.get(cartItem.productId);
    if (!product) throw new ConvexError("Product not found");
    if (args.quantity <= 0) {
      await ctx.db.delete(args.cartItemId);
      return null;
    }
    if (product.inventoryCount < args.quantity) throw new ConvexError("Not enough stock available");
    await ctx.db.patch(args.cartItemId, { quantity: args.quantity, updatedAt: Date.now() });
    return args.cartItemId;
  },
});

export const removeCartItem = mutation({
  args: { cartItemId: v.id("marketplaceCartItems") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const cartItem = await ctx.db.get(args.cartItemId);
    if (!cartItem || cartItem.userId !== user._id) throw new ConvexError("Cart item not found");
    await ctx.db.delete(args.cartItemId);
    return null;
  },
});

export const getCheckoutSnapshotByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId)).first();
    if (!user) return null;

    const rows = await getCartRowsWithProducts(ctx, user._id);
    if (!rows.length) return { items: [], subtotalInPaise: 0, currency: "INR" };

    return {
      items: rows.map(({ row, product }) => ({
        productId: product._id,
        title: product.title,
        quantity: row.quantity,
        priceInPaise: product.priceInPaise,
        currency: product.currency,
        coverImageUrl: product.coverImageUrl,
      })),
      subtotalInPaise: rows.reduce((sum, item) => sum + item.row.quantity * item.product.priceInPaise, 0),
      currency: rows[0]?.product.currency ?? "INR",
    };
  },
});

export const createPendingOrdersFromCart = mutation({
  args: {
    clerkId: v.string(),
    shippingName: v.string(),
    shippingPhone: v.optional(v.string()),
    shippingAddress: v.string(),
    checkoutProvider: v.optional(v.string()),
    checkoutSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId)).first();
    if (!user) throw new ConvexError("User not found");

    const rows = await getCartRowsWithProducts(ctx, user._id);
    if (!rows.length) throw new ConvexError("Cart is empty");

    const grouped = new Map<Id<"users">, typeof rows>();
    for (const row of rows) {
      const current = grouped.get(row.product.sellerId) ?? [];
      current.push(row);
      grouped.set(row.product.sellerId, current);
    }

    const createdOrderIds: Id<"marketplaceOrders">[] = [];
    const now = Date.now();
    for (const [sellerId, sellerRows] of grouped.entries()) {
      const totalAmountInPaise = sellerRows.reduce((sum, item) => sum + item.row.quantity * item.product.priceInPaise, 0);
      const quickCommerce = sellerRows.some((item) => item.product.quickCommerceEnabled);

      const orderId = await ctx.db.insert("marketplaceOrders", {
        buyerId: user._id,
        sellerId,
        totalAmountInPaise,
        currency: sellerRows[0]?.product.currency ?? "INR",
        paymentStatus: "pending",
        fulfillmentStatus: "pending",
        checkoutProvider: args.checkoutProvider,
        checkoutSessionId: args.checkoutSessionId,
        shippingName: args.shippingName.trim(),
        shippingPhone: args.shippingPhone?.trim() || undefined,
        shippingAddress: args.shippingAddress.trim(),
        quickCommerce,
        createdAt: now,
        updatedAt: now,
      });

      createdOrderIds.push(orderId);

      for (const { row, product } of sellerRows) {
        await ctx.db.insert("marketplaceOrderItems", {
          orderId,
          buyerId: user._id,
          sellerId,
          productId: product._id,
          titleSnapshot: product.title,
          quantity: row.quantity,
          priceInPaise: product.priceInPaise,
          coverImageUrl: product.coverImageUrl,
          quickCommerceEnabled: product.quickCommerceEnabled,
          createdAt: now,
        });

        await ctx.db.patch(product._id, {
          inventoryCount: Math.max(0, product.inventoryCount - row.quantity),
          updatedAt: now,
        });

        await ctx.db.delete(row._id);
      }
    }

    return createdOrderIds;
  },
});

export const listBuyerOrders = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    const orders = await ctx.db
      .query("marketplaceOrders")
      .withIndex("by_buyer_and_created_at", (q) => q.eq("buyerId", user._id))
      .order("desc")
      .take(100);

    return orders.map((order) => ({
      ...order,
      formattedTotal: formatPrice(order.totalAmountInPaise, order.currency),
    }));
  },
});
