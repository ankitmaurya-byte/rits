import { readFile } from "node:fs/promises";
import path from "node:path";

export type SharkTankPitch = {
  id: string;
  season: number;
  episode_number: number | null;
  episode_title: string | null;
  air_date: string | null;
  source_file: string;
  pitch_index_in_episode: number | null;
  company_name_detected: string | null;
  founders_detected: string[] | null;
  ask_amount_value: number | null;
  ask_amount_unit: string | null;
  ask_amount_in_inr: number | null;
  ask_equity_percent: number | null;
  ask_text: string | null;
  pitch_summary_detected: string | null;
  intro_excerpt: string | null;
  youtube_link: string;
  thumbnail: string;
  product_images: string[];
  website_links: string[];
  team: string[];
  transcript: string;
  company_details: Record<string, unknown> | null;
};

export type SharkTankSeason = {
  season: number;
  source_folder: string;
  generated_at: string;
  extraction_note: string;
  episode_file_count: number;
  detected_pitch_count: number;
  playlist_title?: string;
  playlist_link?: string;
  comingSoon?: boolean;
  pitches: SharkTankPitch[];
};

type SeasonFourPlaylist = {
  playlistTitle: string;
  playlistLink: string;
  generatedAt: string;
  videos: Array<{
    id: string;
    title: string;
    youtubeLink: string;
    thumbnail: string;
    productImages: string[];
    websiteLinks: string[];
    team: string[];
    transcript: string;
  }>;
};

function normalizeMediaPath(value?: string | null) {
  if (!value) return "";
  return value.replace(/^youtube-output\//, "");
}

function deriveEpisodeNumber(title: string) {
  const match = title.match(/Ep\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function deriveCompanyName(title: string) {
  const match = title.match(/'([^']+)'/);
  return match?.[1] ?? null;
}

function deriveEpisodeTitle(title: string) {
  const company = deriveCompanyName(title);
  return company ? title.replace(/.*?Ep\s*\d+\s*/i, "").trim() : title;
}

function deriveSummary(transcript: string) {
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(" ")
    .slice(0, 520);
}

function deriveIntro(transcript: string) {
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ")
    .slice(0, 180);
}

function seasonPlaceholder(season: number): SharkTankSeason {
  return {
    season,
    source_folder: `Season ${season}`,
    generated_at: new Date().toISOString(),
    extraction_note: `Season ${season} data is coming soon.`,
    episode_file_count: 0,
    detected_pitch_count: 0,
    comingSoon: season !== 4,
    pitches: [],
  };
}

export async function loadSharkTankSeasons() {
  const playlistPath = path.join(process.cwd(), "lib", "shark-tank-india", "season4", "playlist-data.json");
  const raw = await readFile(playlistPath, "utf8");
  const playlist = JSON.parse(raw) as SeasonFourPlaylist;

  const seasonFour: SharkTankSeason = {
    season: 4,
    source_folder: "Season 4",
    generated_at: playlist.generatedAt,
    extraction_note: "Season 4 is live from the updated playlist dataset. Seasons 1, 2, 3, and 5 remain visible as coming soon.",
    episode_file_count: playlist.videos.length,
    detected_pitch_count: playlist.videos.length,
    playlist_title: playlist.playlistTitle,
    playlist_link: playlist.playlistLink,
    comingSoon: false,
    pitches: playlist.videos.map((video, index) => ({
      id: video.id,
      season: 4,
      episode_number: deriveEpisodeNumber(video.title),
      episode_title: deriveEpisodeTitle(video.title),
      air_date: null,
      source_file: video.title,
      pitch_index_in_episode: index + 1,
      company_name_detected: deriveCompanyName(video.title),
      founders_detected: video.team.length ? video.team : null,
      ask_amount_value: null,
      ask_amount_unit: null,
      ask_amount_in_inr: null,
      ask_equity_percent: null,
      ask_text: null,
      pitch_summary_detected: deriveSummary(video.transcript),
      intro_excerpt: deriveIntro(video.transcript),
      youtube_link: video.youtubeLink,
      thumbnail: normalizeMediaPath(video.thumbnail),
      product_images: video.productImages.map(normalizeMediaPath).filter(Boolean),
      website_links: video.websiteLinks,
      team: video.team,
      transcript: video.transcript,
      company_details: null,
    })),
  };

  return [seasonPlaceholder(1), seasonPlaceholder(2), seasonPlaceholder(3), seasonFour, seasonPlaceholder(5)];
}
