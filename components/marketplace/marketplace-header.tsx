"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { ShoppingCart, Search, Sparkles } from "lucide-react";

export function MarketplaceHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const searchQuery = searchParams?.get("q") || "";
  const aiSearchQuery = searchParams?.get("ai") || "";
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleAISearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value) {
      params.set("ai", value);
    } else {
      params.delete("ai");
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Determine active tab
  let activeTab = "shop";
  if (pathname === "/marketplace") {
    activeTab = searchParams?.get("tab") || "shop";
  } else if (pathname === "/marketplace/cart") {
    activeTab = "cart";
  } else {
    activeTab = "product"; // Detail page or other
  }

  return (
    <div className="sticky top-0 z-40 pt-4 sm:pt-8 -mt-4 sm:-mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b pb-6 mb-8" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex p-1 rounded-full border" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
          <Link
            href="/marketplace"
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === "shop" ? "bg-white text-black" : "text-[var(--charcoal)] hover:text-[var(--ink)]"}`}
            style={{ fontFamily: activeTab === "shop" ? "Inter" : "ABC Favorit" }}
          >
            Store
          </Link>
          <Link
            href="/marketplace?tab=sell"
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === "sell" ? "bg-white text-black" : "text-[var(--charcoal)] hover:text-[var(--ink)]"}`}
            style={{ fontFamily: activeTab === "sell" ? "Inter" : "ABC Favorit" }}
          >
            Sell
          </Link>
          <Link
            href="/marketplace?tab=orders"
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === "orders" ? "bg-white text-black" : "text-[var(--charcoal)] hover:text-[var(--ink)]"}`}
            style={{ fontFamily: activeTab === "orders" ? "Inter" : "ABC Favorit" }}
          >
            Orders
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-3 w-full lg:w-auto">
        <div className="relative flex-1 sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--charcoal)" }} />
          <input 
            value={searchQuery} 
            onChange={handleSearch} 
            placeholder="Search devices..." 
            className="w-full rounded-full border bg-transparent pl-9 pr-3 py-2 text-sm outline-none transition-colors focus:bg-[var(--surface-elevated)]" 
            style={{ borderColor: "var(--hairline)", color: "var(--ink)" }} 
          />
        </div>
        <div className="relative flex-1 sm:w-64">
          <Sparkles size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--accent-blue)" }} />
          <input 
            value={aiSearchQuery} 
            onChange={handleAISearch} 
            placeholder="Ask AI (e.g. laptops under 50k)" 
            className="w-full rounded-full border bg-transparent pl-9 pr-3 py-2 text-sm outline-none transition-colors focus:bg-[var(--surface-elevated)]" 
            style={{ borderColor: "var(--hairline)", color: "var(--ink)" }} 
          />
        </div>
        <Link href="/marketplace/cart" className="btn-primary flex items-center gap-2 rounded-full px-5 whitespace-nowrap">
          <ShoppingCart size={15} /> Cart
        </Link>
      </div>
    </div>
  );
}
