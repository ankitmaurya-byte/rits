import { SharkTankExplorerPage } from "@/components/startups/sharktank-explorer-page";
import { loadSharkTankSeasons } from "@/lib/shark-tank-india";

export default async function SharkTankExplorePage() {
  const seasons = await loadSharkTankSeasons();

  return <SharkTankExplorerPage seasons={seasons} />;
}
