import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

function deriveEpisodeNumber(title: string) {
  const match = title.match(/Ep\s*(\d+)/i);
  return match ? Number(match[1]) : undefined;
}

function deriveCompanyName(title: string) {
  const match = title.match(/'([^']+)'/);
  return match?.[1];
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function seasonPlaceholder(season: number) {
  return {
    season,
    source_folder: `Season ${season}`,
    generated_at: null,
    extraction_note: `Season ${season} data is coming soon.`,
    episode_file_count: 0,
    detected_pitch_count: 0,
    playlist_title: undefined,
    playlist_link: undefined,
    comingSoon: season !== 4,
    pitches: [],
  };
}

export const getExplorerSeasons = query({
  args: {},
  handler: async (ctx) => {
    const seasonFourRows = await ctx.db
      .query("sharkTankPitchesAdmin")
      .withIndex("by_season", (q) => q.eq("season", 4))
      .collect();

    const orderedRows = seasonFourRows.sort((a, b) => {
      const episodeA = a.episodeNumber ?? -1;
      const episodeB = b.episodeNumber ?? -1;
      if (episodeA !== episodeB) return episodeB - episodeA;
      return (a.pitchIndexInEpisode ?? 0) - (b.pitchIndexInEpisode ?? 0);
    });

    const firstRow = orderedRows[0];
    const seasonFour = {
      season: 4,
      source_folder: "Season 4",
      generated_at: firstRow?.generatedAt ?? null,
      extraction_note:
        "Season 4 is live from the Convex dataset. Seasons 1, 2, 3, and 5 remain visible as coming soon.",
      episode_file_count: orderedRows.length,
      detected_pitch_count: orderedRows.length,
      playlist_title: firstRow?.playlistTitle,
      playlist_link: firstRow?.playlistLink,
      comingSoon: false,
      pitches: orderedRows.map((row) => ({
        id: row.sourceId,
        season: row.season,
        episode_number: row.episodeNumber ?? null,
        episode_title: row.episodeTitle ?? null,
        air_date: row.airDate ?? null,
        source_file: row.sourceFile,
        pitch_index_in_episode: row.pitchIndexInEpisode ?? null,
        company_name_detected: row.companyName ?? null,
        founders_detected: row.founders.length ? row.founders : null,
        ask_amount_value: row.askAmountValue ?? null,
        ask_amount_unit: row.askAmountUnit ?? null,
        ask_amount_in_inr: row.askAmountInInr ?? null,
        ask_equity_percent: row.askEquityPercent ?? null,
        ask_text: row.askText ?? null,
        pitch_summary_detected: row.pitchSummary ?? null,
        intro_excerpt: row.introExcerpt ?? null,
        youtube_link: row.youtubeLink ?? "",
        thumbnail: row.thumbnail ?? "",
        product_images: row.productImages ?? [],
        website_links: row.websiteLinks ?? [],
        team: row.team ?? [],
        transcript: row.transcript ?? "",
        company_details: row.companyDetailsJson ? JSON.parse(row.companyDetailsJson) : null,
      })),
    };

    return [seasonPlaceholder(1), seasonPlaceholder(2), seasonPlaceholder(3), seasonFour, seasonPlaceholder(5)];
  },
});

export const clearSeason = internalMutation({
  args: { season: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("sharkTankPitchesAdmin")
      .withIndex("by_season", (q) => q.eq("season", args.season))
      .collect();

    for (const row of rows) {
      await ctx.db.delete(row._id);
    }

    return { deleted: rows.length };
  },
});

export const importPitch = internalMutation({
  args: {
    season: v.number(),
    generatedAt: v.string(),
    playlistTitle: v.string(),
    playlistLink: v.string(),
    video: v.object({
      id: v.string(),
      title: v.string(),
      youtubeLink: v.string(),
      thumbnail: v.string(),
      productImages: v.array(v.string()),
      websiteLinks: v.array(v.string()),
      team: v.array(v.string()),
      transcript: v.string(),
      isTranslatedEnglish: v.optional(v.boolean()),
      companyDetails: v.optional(v.any()),
    }),
    pitchIndexInEpisode: v.number(),
  },
  handler: async (ctx, args) => {
    const companyDetails = args.video.companyDetails && typeof args.video.companyDetails === "object" ? args.video.companyDetails : undefined;
    const companyName = typeof companyDetails?.companyName === "string" ? companyDetails.companyName : deriveCompanyName(args.video.title);
    const founders = Array.isArray(companyDetails?.founders)
      ? companyDetails.founders.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
      : args.video.team;
    const existing = await ctx.db
      .query("sharkTankPitchesAdmin")
      .withIndex("by_source_id", (q) => q.eq("sourceId", args.video.id))
      .unique();
    const now = Date.now();
    const payload = {
      sourceId: args.video.id,
      slug: slugify(companyName || args.video.id),
      season: args.season,
      originalTitle: args.video.title,
      episodeNumber: deriveEpisodeNumber(args.video.title),
      episodeTitle: deriveEpisodeTitle(args.video.title),
      airDate: undefined,
      companyName: companyName,
      founders,
      askAmountValue: undefined,
      askAmountUnit: undefined,
      askAmountInInr: undefined,
      askEquityPercent: undefined,
      askText: undefined,
      pitchSummary: deriveSummary(args.video.transcript),
      introExcerpt: deriveIntro(args.video.transcript),
      youtubeLink: args.video.youtubeLink,
      thumbnail: args.video.thumbnail,
      productImages: args.video.productImages,
      websiteLinks: args.video.websiteLinks,
      team: args.video.team,
      transcript: args.video.transcript,
      isTranslatedEnglish: args.video.isTranslatedEnglish,
      companyDetailsJson: companyDetails ? JSON.stringify(companyDetails) : undefined,
      playlistTitle: args.playlistTitle,
      playlistLink: args.playlistLink,
      generatedAt: args.generatedAt,
      sourceFile: args.video.title,
      pitchIndexInEpisode: args.pitchIndexInEpisode,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("sharkTankPitchesAdmin", {
      ...payload,
      createdAt: now,
    });
  },
});
