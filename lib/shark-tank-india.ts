import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type SharkTankPitch = {
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
};

export type SharkTankSeason = {
  season: number;
  source_folder: string;
  generated_at: string;
  extraction_note: string;
  episode_file_count: number;
  detected_pitch_count: number;
  pitches: SharkTankPitch[];
};

export async function loadSharkTankSeasons() {
  const dataDir = path.join(process.cwd(), "lib", "shark-tank-india");
  const files = (await readdir(dataDir))
    .filter((file) => file.startsWith("season") && file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const seasons = await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(path.join(dataDir, file), "utf8");
      return JSON.parse(raw) as SharkTankSeason;
    })
  );

  return seasons.sort((a, b) => a.season - b.season);
}
