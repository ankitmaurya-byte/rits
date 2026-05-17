import { AiStartupDetailPage } from "@/components/startups/ai-startup-detail-page";

export default async function StartupDetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <AiStartupDetailPage slug={slug} />;
}
