import { notFound } from "next/navigation";

import { IntegrationDetail } from "@/components/integrations/integration-detail";
import { getIntegrationById } from "@/lib/integrations-catalog";

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const integration = getIntegrationById(slug);

  if (!integration) {
    notFound();
  }

  return <IntegrationDetail integration={integration} />;
}
