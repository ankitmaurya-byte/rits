import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";

import { api } from "@/convex/_generated/api";
import { MvpRenderer, parseMvpPayload } from "@/components/research/mvp-renderer";

export default async function SharedMvpPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  let page;

  try {
    page = await fetchQuery(api.researchOutputs.getPublicMvpPage, { shareToken });
  } catch {
    notFound();
  }

  const payload = parseMvpPayload(page.payload);

  if (!payload) {
    notFound();
  }

  return <MvpRenderer payload={payload} />;
}
