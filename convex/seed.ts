import { v } from "convex/values";

import { mutation } from "./_generated/server";

export const all = mutation({
  args: {
    confirmProduction: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const deployment = process.env.CONVEX_DEPLOYMENT ?? "";
    const isProductionDeployment = deployment.startsWith("prod:");

    if (isProductionDeployment && args.confirmProduction !== true) {
      throw new Error(
        "Refusing to seed production without confirmProduction: true.",
      );
    }

    // 1. Find a real user to assign most data to, so they can see it.
    // Try to find the first user that has a clerkId and isn't one of our fake ones.
    const realUsers = await ctx.db.query("users").collect();
    const realUser = realUsers.find(u => !u.clerkId.startsWith("fake_"));
    
    if (!realUser) {
      throw new Error("No real user found in the database. Please log in to the application at least once before running this seed script.");
    }

    const userId = realUser._id;
    const now = Date.now();

    // ==========================================
    // WORKSPACES
    // ==========================================
    const ws1 = await ctx.db.insert("workspaces", {
      name: "Engineering Team",
      description: "Main workspace for product engineering",
      ownerId: userId,
      inviteToken: "seed_token_1",
      status: "active",
    });

    const ws2 = await ctx.db.insert("workspaces", {
      name: "Personal Projects",
      description: "My side hustles and personal ideas",
      ownerId: userId,
      inviteToken: "seed_token_2",
      status: "active",
    });

    await ctx.db.insert("workspaceMembers", { workspaceId: ws1, userId, role: "owner" });
    await ctx.db.insert("workspaceMembers", { workspaceId: ws2, userId, role: "owner" });

    // ==========================================
    // IDEAS
    // ==========================================
    await ctx.db.insert("ideas", {
      title: "AI Powered Coffee Machine",
      description: "A machine that learns when you wake up and prepares coffee with the exact temperature and beans you prefer.",
      tags: ["hardware", "ai", "smart-home"],
      createdBy: userId,
      scope: "private",
      createdAt: now,
    });

    await ctx.db.insert("ideas", {
      title: "Marketplace for Freelance Robots",
      description: "A platform to rent out autonomous robots for household chores.",
      tags: ["platform", "robotics", "marketplace"],
      createdBy: userId,
      workspaceId: ws1,
      scope: "workspace",
      createdAt: now,
    });

    // ==========================================
    // TODOS & TODO GROUPS
    // ==========================================
    const tg1 = await ctx.db.insert("todoGroups", {
      name: "Q3 Launch Goals",
      workspaceId: ws1,
      createdBy: userId,
      createdAt: now,
    });

    await ctx.db.insert("todos", {
      title: "Finalize AI Model Training",
      description: "Need to finish training the V2 model on the new dataset.",
      scope: "workspace",
      workspaceId: ws1,
      groupId: tg1,
      completed: false,
      priority: "high",
      status: "in-progress",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("todos", {
      title: "Update Landing Page Copy",
      description: "Make the headline more punchy.",
      scope: "workspace",
      workspaceId: ws1,
      groupId: tg1,
      completed: true,
      priority: "medium",
      status: "done",
      createdBy: userId,
      createdAt: now - 86400000,
      updatedAt: now,
    });

    await ctx.db.insert("todos", {
      title: "Buy Groceries",
      description: "Milk, Eggs, Bread",
      scope: "private",
      completed: false,
      priority: "low",
      status: "todo",
      createdBy: userId,
      createdAt: now,
    });

    // ==========================================
    // NOTES
    // ==========================================
    await ctx.db.insert("notes", {
      title: "Meeting Notes: Product Strategy",
      content: "## Product Strategy\n\nWe need to focus on **user retention**.\n\n- Improve onboarding\n- Add gamification\n- Faster load times",
      scope: "workspace",
      workspaceId: ws1,
      createdBy: userId,
      updatedAt: now,
    });

    await ctx.db.insert("notes", {
      title: "My Secret Recipes",
      content: "1. Pasta Carbonara\n2. Tiramisu",
      scope: "private",
      createdBy: userId,
      updatedAt: now,
    });

    // ==========================================
    // VAULTS & FILES
    // ==========================================
    const vaultId = await ctx.db.insert("vaults", {
      name: "Engineering Assets",
      description: "Design files, diagrams, and assets.",
      scope: "workspace",
      workspaceId: ws1,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const folderId = await ctx.db.insert("vaultEntries", {
      vaultId,
      kind: "folder",
      name: "Q3 Designs",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("vaultEntries", {
      vaultId,
      parentEntryId: folderId,
      kind: "file",
      name: "logo_v2.png",
      fileUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800",
      mimeType: "image/png",
      sizeBytes: 102400,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // ==========================================
    // GITHUB TOOLS
    // ==========================================
    await ctx.db.insert("githubTools", {
      sourceType: "manual",
      repoFullName: "facebook/react",
      owner: "facebook",
      name: "react",
      htmlUrl: "https://github.com/facebook/react",
      description: "The library for web and native user interfaces.",
      stars: 210000,
      forks: 43000,
      openIssues: 1200,
      topics: ["react", "frontend", "javascript", "ui"],
      isArchived: false,
      aiSummary: "A popular JavaScript library for building user interfaces.",
      aiUseCases: "Web apps, mobile apps (via React Native).",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("githubTools", {
      sourceType: "manual",
      repoFullName: "vercel/next.js",
      owner: "vercel",
      name: "next.js",
      htmlUrl: "https://github.com/vercel/next.js",
      description: "The React Framework",
      stars: 110000,
      forks: 24000,
      openIssues: 1500,
      topics: ["react", "nextjs", "framework", "ssr"],
      isArchived: false,
      aiSummary: "A framework for React that provides SSR, routing, and optimization out of the box.",
      aiUseCases: "Fullstack React applications, SEO-heavy websites.",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // ==========================================
    // ROADMAPS
    // ==========================================
    await ctx.db.insert("roadmaps", {
      title: "Frontend Developer 2024",
      topic: "Frontend Development",
      topics: ["HTML", "CSS", "JavaScript", "React", "Next.js"],
      scope: "private",
      nodes: [
        { id: "1", label: "Internet Fundamentals", description: "How the web works", topic: "Internet", x: 100, y: 100, width: 200, height: 80, tone: "core" },
        { id: "2", label: "HTML/CSS", description: "Building blocks", topic: "HTML/CSS", x: 100, y: 250, width: 200, height: 80, tone: "core" },
      ],
      edges: [
        { id: "e1", from: "1", to: "2" },
      ],
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // ==========================================
    // CHAT / SOCIAL
    // ==========================================
    const chatConvId = await ctx.db.insert("chatConversations", {
      ownerId: userId,
      title: "Brainstorming Session",
      scopeMode: "private",
      lastMessagePreview: "That sounds like a great idea! Let's refine the features.",
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("chatMessages", {
      conversationId: chatConvId,
      ownerId: userId,
      role: "user",
      content: "I want to build an AI powered coffee machine. What are some good features to include?",
      createdAt: now - 60000,
    });

    await ctx.db.insert("chatMessages", {
      conversationId: chatConvId,
      ownerId: userId,
      role: "assistant",
      content: "That sounds like a great idea! Let's refine the features.\n1. Personalized brewing profiles.\n2. Wake-up prediction.\n3. Bean inventory tracking.",
      createdAt: now,
    });

    const room1 = await ctx.db.insert("socialChatRooms", {
      scope: "workspace",
      roomType: "workspace",
      workspaceId: ws1,
      title: "Engineering General",
      createdBy: userId,
      lastMessagePreview: "Welcome to the team!",
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("socialChatParticipants", {
      roomId: room1,
      userId: userId,
      role: "owner",
      lastReadAt: now,
      createdAt: now,
    });

    await ctx.db.insert("socialChatMessages", {
      roomId: room1,
      senderId: userId,
      senderKind: "user",
      body: "Welcome to the team!",
      messageType: "text",
      createdAt: now,
    });

    // ==========================================
    // MARKETPLACE (FAKE SELLERS, PRODUCTS, REVIEWS)
    // ==========================================
    const sellerIds = [];
    for (let i = 1; i <= 3; i++) {
      const id = await ctx.db.insert("users", {
        clerkId: `fake_seller_all_${i}`,
        name: `Pro Seller ${i}`,
        email: `pro_seller${i}@example.com`,
        image: `https://i.pravatar.cc/150?u=pro_seller${i}`,
        currentCompany: `Tech Store ${i}`,
      });
      sellerIds.push(id);

      await ctx.db.insert("marketplaceSellers", {
        userId: id,
        companyName: `Tech Store ${i} Inc`,
        storeDescription: `Premium electronics and gadgets from top brands. Fast delivery guaranteed.`,
        registrationDetails: `GSTIN987654321${i}`,
        kycStatus: "approved",
        createdAt: now,
        updatedAt: now,
      });
    }

    // Assign one product to the REAL user so they see something in "Your Products"
    await ctx.db.insert("marketplaceSellers", {
      userId: userId,
      companyName: `My Personal Store`,
      storeDescription: `Selling some of my used electronics.`,
      kycStatus: "approved",
      createdAt: now,
      updatedAt: now,
    });

    const myProductId = await ctx.db.insert("marketplaceProducts", {
      sellerId: userId,
      title: "My Used MacBook Pro M1",
      slug: "my-used-macbook-pro-m1",
      shortDescription: "Excellent condition, barely used.",
      description: "Selling my trusty MacBook Pro. No scratches, 98% battery health.",
      category: "Laptops",
      tags: ["apple", "macbook", "used"],
      priceInPaise: 8000000,
      currency: "INR",
      status: "published",
      condition: "used",
      inventoryCount: 1,
      coverImageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
      imageUrls: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800"],
      videoUrls: [],
      quickCommerceEnabled: false,
      quickCommerceServiceAreas: [],
      createdAt: now,
      updatedAt: now,
    });

    const productData = [
      { title: "Gaming Console X", cat: "Gaming", price: 4990000, img: "https://images.unsplash.com/photo-1605901309584-818e25960b8f?w=800" },
      { title: "Smart Mirror", cat: "Smart Home", price: 2990000, img: "https://images.unsplash.com/photo-1606144042871-3c4f74d0e80a?w=800" },
      { title: "Electric Skateboard", cat: "Transport", price: 5990000, img: "https://images.unsplash.com/photo-1528148343865-51218c4a13e6?w=800" },
      { title: "4K Action Camera", cat: "Cameras", price: 1990000, img: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800" },
      { title: "Noise Cancelling Earbuds", cat: "Audio", price: 1490000, img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800" },
      { title: "Robotic Vacuum Cleaner", cat: "Smart Home", price: 3490000, img: "https://images.unsplash.com/photo-1589087508937-293e433fec6e?w=800" },
      { title: "Portable Projector", cat: "Displays", price: 2490000, img: "https://images.unsplash.com/photo-1581090122319-8fab9528eaaa?w=800" },
      { title: "Fitness Tracker Ring", cat: "Wearables", price: 1290000, img: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800" },
    ];

    const fakeProductIds = [];
    let sIdx = 0;
    for (let i = 0; i < productData.length; i++) {
      const data = productData[i];
      const sid = sellerIds[sIdx];
      sIdx = (sIdx + 1) % sellerIds.length;

      const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + "-v2-" + i;

      const pid = await ctx.db.insert("marketplaceProducts", {
        sellerId: sid,
        title: data.title,
        slug,
        shortDescription: `Incredible ${data.cat.toLowerCase()} to upgrade your life.`,
        description: `This ${data.title} represents the pinnacle of modern technology. Built to last with premium materials.`,
        category: data.cat,
        tags: [data.cat.toLowerCase(), "tech"],
        priceInPaise: data.price,
        currency: "INR",
        status: "published",
        condition: "new",
        inventoryCount: 25,
        coverImageUrl: data.img,
        imageUrls: [data.img],
        videoUrls: [],
        quickCommerceEnabled: true,
        quickCommerceEtaMinutes: 45,
        quickCommerceServiceAreas: ["Mumbai", "Bangalore"],
        createdAt: now,
        updatedAt: now,
      });
      fakeProductIds.push(pid);
    }

    // Add some reviews to the user's product and fake products
    const allProductsToReview = [myProductId, ...fakeProductIds];
    const buyerIds = sellerIds; // Let's just use the fake sellers as buyers too
    const reviewComments = ["Great quality!", "Highly recommended.", "Arrived on time.", "Fantastic piece of tech.", "Super happy with this."];

    for (const pid of allProductsToReview) {
      const numReviews = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < numReviews; j++) {
        const buyerId = buyerIds[Math.floor(Math.random() * buyerIds.length)];
        await ctx.db.insert("marketplaceReviews", {
          productId: pid,
          userId: buyerId,
          comment: reviewComments[Math.floor(Math.random() * reviewComments.length)],
          createdAt: now - Math.floor(Math.random() * 10000000),
        });
      }
    }

    return `Seeding complete for user: ${realUser.name}. Workspaces, Ideas, Todos, Notes, Vaults, GitHub Tools, AI Chats, and Marketplace Data were created!`;
  }
});
