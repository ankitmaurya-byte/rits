import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = resolve(new URL("..", import.meta.url).pathname);
const useProd = process.argv.includes("--prod");
const datasets = [
  { season: 3, datasetPath: resolve(rootDir, "lib/shark-tank-india/shark_tank_india_s3_enriched.json") },
  { season: 4, datasetPath: resolve(rootDir, "lib/shark-tank-india/shark_tank_india_s4.json") },
  { season: 5, datasetPath: resolve(rootDir, "lib/shark-tank-india/shark_tank_india_s5.json") },
].map((entry) => {
  const raw = readFileSync(entry.datasetPath, "utf8");
  const dataset = JSON.parse(raw);
  if (!Array.isArray(dataset.videos)) {
    throw new Error(`Expected ${entry.datasetPath} dataset.videos to be an array.`);
  }
  return { ...entry, dataset };
});

function runConvex(functionName, args) {
  const convexArgs = ["convex", "run", functionName, JSON.stringify(args)];
  if (useProd) {
    convexArgs.push("--prod");
  }
  const result = spawnSync(
    "npx",
    convexArgs,
    {
      cwd: rootDir,
      stdio: "inherit",
      shell: process.platform === "win32",
    },
  );

  if (result.status !== 0) {
    throw new Error(`Convex run failed for ${functionName}.`);
  }
}

function normalizeVideo(video) {
  const productImages = Array.isArray(video.productImages)
    ? video.productImages.filter((item) => typeof item === "string" && item.length > 0)
    : [];
  const websiteLinks = Array.isArray(video.websiteLinks)
    ? video.websiteLinks.filter((item) => typeof item === "string" && item.length > 0)
    : [];
  const team = Array.isArray(video.team)
    ? video.team.filter((item) => typeof item === "string" && item.length > 0)
    : [];

  return {
    id: typeof video.id === "string" ? video.id : "",
    title: typeof video.title === "string" ? video.title : "",
    youtubeLink: typeof video.youtubeLink === "string" ? video.youtubeLink : "",
    thumbnail: typeof video.thumbnail === "string" ? video.thumbnail : "",
    productImages,
    websiteLinks,
    team,
    transcript: typeof video.transcript === "string"
      ? video.transcript
      : typeof video[" transcript"] === "string"
        ? video[" transcript"]
        : "",
    isTranslatedEnglish: typeof video.isTranslatedEnglish === "boolean"
      ? video.isTranslatedEnglish
      : typeof video.is_translated_english === "boolean"
        ? video.is_translated_english
        : undefined,
    companyDetails: video.companyDetails && typeof video.companyDetails === "object"
      ? video.companyDetails
      : undefined,
  };
}

for (const { season, datasetPath, dataset } of datasets) {
  console.log(`Clearing existing season ${season} rows from Convex${useProd ? " production" : ""}...`);
  runConvex("sharkTank:clearSeason", { season });

  console.log(`Importing ${dataset.videos.length} Shark Tank videos from ${datasetPath}${useProd ? " into production" : ""}...`);
  dataset.videos.forEach((video, index) => {
    console.log(`Importing season ${season} ${index + 1}/${dataset.videos.length}: ${video.id}`);
    runConvex("sharkTank:importPitch", {
      season,
      generatedAt: dataset.generatedAt,
      playlistTitle: dataset.playlistTitle,
      playlistLink: dataset.playlistLink,
      pitchIndexInEpisode: index + 1,
      video: normalizeVideo(video),
    });
  });
}

console.log("Shark Tank seasons import completed.");
