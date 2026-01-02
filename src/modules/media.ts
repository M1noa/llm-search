import { MediaResult, MediaSearchOptions, SearchError } from "../types";
import { searchTMDB, getTMDBDetails } from "./scrapers/tmdb";
import { searchTheTVDB, getTheTVDBDetails } from "./scrapers/thetvdb";
import { searchAniDB, getAniDBDetails } from "./scrapers/anidb";

/**
 * Unified Media Search
 * Coordinates between TMDB, TheTVDB, and AniDB with fallback logic.
 */
export async function searchMedia(
  query: string,
  options: MediaSearchOptions = {}
): Promise<MediaResult[]> {
  const { type } = options;
  let results: MediaResult[] = [];
  const errors: Error[] = [];

  // Strategy Pattern based on media type

  // 1. ANIME Specific Strategy
  if (type === "anime") {
    try {
      // Try AniDB first for Anime
      results = await searchAniDB(query, options);
      if (results.length > 0) return results;
    } catch (e) {
      console.warn("AniDB search failed, falling back to TMDB", e);
      errors.push(e as Error);
    }

    // Fallback to TMDB with anime/tv type
    try {
      results = await searchTMDB(query, { ...options, type: "tv" }); // Anime is often under TV in TMDB
      // Filter for animation genre if possible, but for now just return results
      if (results.length > 0) return results;
    } catch (e) {
        errors.push(e as Error);
    }
  }

  // 2. TV SHOW Strategy
  else if (type === "tv") {
    try {
      // TMDB is generally faster and better structured for general TV
      results = await searchTMDB(query, options);
      if (results.length > 0) return results;
    } catch (e) {
      console.warn("TMDB TV search failed, falling back to TheTVDB", e);
      errors.push(e as Error);
    }

    try {
      // Fallback to TheTVDB
      results = await searchTheTVDB(query, options);
      if (results.length > 0) return results;
    } catch (e) {
      errors.push(e as Error);
    }
  }

  // 3. MOVIE or GENERAL Strategy
  else {
    try {
      // TMDB is the best all-rounder
      results = await searchTMDB(query, options);
      if (results.length > 0) return results;
    } catch (e) {
       console.warn("TMDB search failed", e);
       errors.push(e as Error);
    }

    // If generic search and TMDB failed or found nothing, maybe try TheTVDB?
    // Only if type wasn't specified as "movie" (TheTVDB is mostly TV)
    if (type !== "movie" && results.length === 0) {
        try {
            const tvdbResults = await searchTheTVDB(query, options);
            if (tvdbResults.length > 0) return tvdbResults;
        } catch (e) {
            errors.push(e as Error);
        }
    }
  }

  if (results.length === 0 && errors.length > 0) {
    throw {
      message: "Media search failed on all providers",
      code: "MEDIA_SEARCH_FAILED",
      originalError: errors[0], // Return the first error for context
    } as SearchError;
  }

  return results;
}

/**
 * Get detailed information for a media result.
 * Automatically determines the source based on the URL or accepts an explicit source.
 */
export async function getMediaDetails(
    url: string,
    source?: "tmdb" | "thetvdb" | "anidb",
    options: MediaSearchOptions = {}
): Promise<Partial<MediaResult>> {
    // Infer source from URL if not provided
    if (!source) {
        if (url.includes("themoviedb.org")) source = "tmdb";
        else if (url.includes("thetvdb.com")) source = "thetvdb";
        else if (url.includes("anidb.net")) source = "anidb";
        else {
            throw {
                message: "Could not determine media source from URL",
                code: "UNKNOWN_MEDIA_SOURCE"
            } as SearchError;
        }
    }

    try {
        switch (source) {
            case "tmdb":
                return await getTMDBDetails(url, options);
            case "thetvdb":
                return await getTheTVDBDetails(url, options);
            case "anidb":
                return await getAniDBDetails(url, options);
            default:
                return {};
        }
    } catch (error) {
        throw {
            message: `Failed to get details from ${source}`,
            code: "MEDIA_DETAILS_FAILED",
            originalError: error
        } as SearchError;
    }
}

