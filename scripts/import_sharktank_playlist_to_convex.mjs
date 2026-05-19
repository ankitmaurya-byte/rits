import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = resolve(new URL("..", import.meta.url).pathname);
const datasetArg = process.argv[2];
const seasonArg = process.argv[3];
const useProd = process.argv.includes("--prod");
const shouldClearSeason = !process.argv.includes("--no-clear");
const deploymentFlagIndex = process.argv.indexOf("--deployment");
const deployment = deploymentFlagIndex >= 0 ? process.argv[deploymentFlagIndex + 1] : undefined;

if (!datasetArg || !seasonArg) {
  throw new Error("Usage: node scripts/import_sharktank_playlist_to_convex.mjs <path-to-playlist-data.json> <season-number> [--prod] [--deployment <target>] [--no-clear]");
}

const datasetPath = resolve(rootDir, datasetArg);
const season = Number(seasonArg);

if (Number.isNaN(season)) {
  throw new Error("Season number must be numeric.");
}

const raw = readFileSync(datasetPath, "utf8");
const dataset = JSON.parse(raw);

if (!Array.isArray(dataset.videos)) {
  throw new Error(`Expected ${datasetPath} dataset.videos to be an array.`);
}

function runConvex(functionName, args) {
  const convexArgs = ["convex", "run", functionName, JSON.stringify(args)];
  if (useProd) {
    convexArgs.push("--prod");
  }
  if (deployment) {
    convexArgs.push("--deployment", deployment);
  }
  const result = spawnSync("npx", convexArgs, {
    cwd: rootDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    throw new Error(`Convex run failed for ${functionName}.`);
  }
}

function normalizeVideo(video) {
  const transcript = typeof video.transcript === "string"
    ? video.transcript
    : typeof video.transcriptEnglish === "string"
      ? video.transcriptEnglish
      : typeof video[" transcript"] === "string"
        ? video[" transcript"]
        : "";

  return {
    id: typeof video.id === "string" ? video.id : "",
    title: typeof video.title === "string" ? video.title : "",
    youtubeLink: typeof video.youtubeLink === "string" ? video.youtubeLink : "",
    thumbnail: typeof video.thumbnail === "string" ? video.thumbnail : "",
    productImages: Array.isArray(video.productImages) ? video.productImages.filter((item) => typeof item === "string" && item.length > 0) : [],
    websiteLinks: Array.isArray(video.websiteLinks) ? video.websiteLinks.filter((item) => typeof item === "string" && item.length > 0) : [],
    team: Array.isArray(video.team) ? video.team.filter((item) => typeof item === "string" && item.length > 0) : [],
    transcript,
    isTranslatedEnglish: typeof video.isTranslatedEnglish === "boolean" ? video.isTranslatedEnglish : undefined,
    companyDetails: video.companyDetails && typeof video.companyDetails === "object" ? video.companyDetails : undefined,
  };
}

if (shouldClearSeason) {
  console.log(`Clearing existing season ${season} rows from Convex${useProd ? " production" : ""}...`);
  runConvex("sharkTank:clearSeason", { season });
}

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

console.log("Shark Tank playlist import completed.");
