import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const baseFolder = process.env.CLOUDINARY_FOLDER ?? "rits";

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error("Missing Cloudinary configuration. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.");
}

const inputPath = process.argv[2];

if (!inputPath) {
  throw new Error("Usage: node scripts/upload_sharktank_media_to_cloudinary.mjs <path-to-playlist-data.json>");
}

const playlistPath = path.resolve(process.cwd(), inputPath);
const seasonDir = path.dirname(playlistPath);
const raw = await readFile(playlistPath, "utf8");
const payload = JSON.parse(raw);

if (!Array.isArray(payload.videos)) {
  throw new Error("Expected playlist JSON with a videos array.");
}

function toLocalFilePath(mediaPath) {
  const normalized = mediaPath.replace(/^youtube-output\//, "");
  return path.join(seasonDir, normalized);
}

function isRemoteUrl(value) {
  return /^https?:\/\//i.test(value);
}

async function uploadFile(localFilePath, folder) {
  const fileBuffer = await readFile(localFilePath);
  const timestamp = Math.floor(Date.now() / 1000);
  const signatureBase = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(signatureBase).digest("hex");

  const formData = new FormData();
  const ext = path.extname(localFilePath).toLowerCase();
  const type = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  formData.append("file", new Blob([fileBuffer], { type }), path.basename(localFilePath));
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok || !data.secure_url) {
    throw new Error(data?.error?.message ?? `Cloudinary upload failed for ${localFilePath}`);
  }

  await rm(localFilePath, { force: true });
  return data.secure_url;
}

const uploadCache = new Map();

async function resolveMediaUrl(mediaPath, folderSuffix) {
  if (!mediaPath || isRemoteUrl(mediaPath)) return mediaPath;
  const localFilePath = toLocalFilePath(mediaPath);
  if (uploadCache.has(localFilePath)) {
    return uploadCache.get(localFilePath);
  }
  const url = await uploadFile(localFilePath, `${baseFolder}/sharktank/${folderSuffix}`);
  uploadCache.set(localFilePath, url);
  return url;
}

for (let index = 0; index < payload.videos.length; index += 1) {
  const video = payload.videos[index];
  const videoFolder = `season-${String(video.title || video.id || index).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  if (video.thumbnail) {
    video.thumbnail = await resolveMediaUrl(video.thumbnail, `${videoFolder}/thumbnail`);
  }
  if (Array.isArray(video.productImages)) {
    const nextImages = [];
    for (const imagePath of video.productImages) {
      nextImages.push(await resolveMediaUrl(imagePath, `${videoFolder}/frames`));
    }
    video.productImages = nextImages;
  }
}

await writeFile(playlistPath, JSON.stringify(payload, null, 2));
console.log(`Updated ${playlistPath} with Cloudinary URLs and removed uploaded local image files.`);
