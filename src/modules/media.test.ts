import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchMedia, getMediaDetails } from "./media";
import * as aniDB from "./scrapers/anidb";
import * as tmdb from "./scrapers/tmdb";
import * as theTVDB from "./scrapers/thetvdb";
import { MediaResult } from "../types";

// Mock the scrapers
vi.mock("./scrapers/anidb");
vi.mock("./scrapers/tmdb");
vi.mock("./scrapers/thetvdb");

describe("Media Search Coordinator", () => {
  const mockAnimeResult: MediaResult = {
    title: "Test Anime",
    url: "https://anidb.net/anime/1",
    source: "anidb",
    mediaType: "anime",
  };

  const mockTVResult: MediaResult = {
    title: "Test TV Show",
    url: "https://themoviedb.org/tv/1",
    source: "tmdb",
    mediaType: "tv",
  };

  const mockMovieResult: MediaResult = {
    title: "Test Movie",
    url: "https://themoviedb.org/movie/1",
    source: "tmdb",
    mediaType: "movie",
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("searchMedia", () => {
    describe("Anime Strategy", () => {
      it("should try AniDB first for anime", async () => {
        vi.mocked(aniDB.searchAniDB).mockResolvedValue([mockAnimeResult]);

        const results = await searchMedia("Naruto", { type: "anime" });

        expect(aniDB.searchAniDB).toHaveBeenCalledWith("Naruto", expect.objectContaining({ type: "anime" }));
        expect(tmdb.searchTMDB).not.toHaveBeenCalled();
        expect(results).toEqual([mockAnimeResult]);
      });

      it("should fall back to TMDB if AniDB fails", async () => {
        vi.mocked(aniDB.searchAniDB).mockRejectedValue(new Error("AniDB down"));
        vi.mocked(tmdb.searchTMDB).mockResolvedValue([mockTVResult]);

        const results = await searchMedia("Naruto", { type: "anime" });

        expect(aniDB.searchAniDB).toHaveBeenCalled();
        expect(tmdb.searchTMDB).toHaveBeenCalledWith("Naruto", expect.objectContaining({ type: "tv" }));
        expect(results).toEqual([mockTVResult]);
      });

      it("should fall back to TMDB if AniDB returns empty", async () => {
        vi.mocked(aniDB.searchAniDB).mockResolvedValue([]);
        vi.mocked(tmdb.searchTMDB).mockResolvedValue([mockTVResult]);

        const results = await searchMedia("Naruto", { type: "anime" });

        expect(aniDB.searchAniDB).toHaveBeenCalled();
        expect(tmdb.searchTMDB).toHaveBeenCalled();
        expect(results).toEqual([mockTVResult]);
      });
    });

    describe("TV Strategy", () => {
      it("should try TMDB first for TV", async () => {
        vi.mocked(tmdb.searchTMDB).mockResolvedValue([mockTVResult]);

        const results = await searchMedia("Breaking Bad", { type: "tv" });

        expect(tmdb.searchTMDB).toHaveBeenCalledWith("Breaking Bad", expect.objectContaining({ type: "tv" }));
        expect(theTVDB.searchTheTVDB).not.toHaveBeenCalled();
        expect(results).toEqual([mockTVResult]);
      });

      it("should fall back to TheTVDB if TMDB fails", async () => {
        vi.mocked(tmdb.searchTMDB).mockRejectedValue(new Error("TMDB down"));
        vi.mocked(theTVDB.searchTheTVDB).mockResolvedValue([mockTVResult]);

        const results = await searchMedia("Breaking Bad", { type: "tv" });

        expect(tmdb.searchTMDB).toHaveBeenCalled();
        expect(theTVDB.searchTheTVDB).toHaveBeenCalledWith("Breaking Bad", expect.objectContaining({ type: "tv" }));
        expect(results).toEqual([mockTVResult]);
      });
    });

    describe("General/Movie Strategy", () => {
      it("should default to TMDB for unspecified type", async () => {
        vi.mocked(tmdb.searchTMDB).mockResolvedValue([mockMovieResult]);

        const results = await searchMedia("Inception", {});

        expect(tmdb.searchTMDB).toHaveBeenCalledWith("Inception", {});
        expect(results).toEqual([mockMovieResult]);
      });

      it("should try TheTVDB if general TMDB search fails and type is not movie", async () => {
        // TMDB fails/returns empty
        vi.mocked(tmdb.searchTMDB).mockResolvedValue([]);
        vi.mocked(theTVDB.searchTheTVDB).mockResolvedValue([mockTVResult]);

        // No type specified, so it could be a TV show
        const results = await searchMedia("Unknown Show", {});

        expect(tmdb.searchTMDB).toHaveBeenCalled();
        expect(theTVDB.searchTheTVDB).toHaveBeenCalled();
        expect(results).toEqual([mockTVResult]);
      });

      it("should NOT try TheTVDB if type is explicitly movie", async () => {
        vi.mocked(tmdb.searchTMDB).mockResolvedValue([]);

        try {
          await searchMedia("Unknown Movie", { type: "movie" });
        } catch (e) {
          // Expected to throw
        }

        expect(tmdb.searchTMDB).toHaveBeenCalled();
        expect(theTVDB.searchTheTVDB).not.toHaveBeenCalled();
      });
    });

    describe("Error Handling", () => {
      it("should throw SearchError if all providers fail", async () => {
        vi.mocked(aniDB.searchAniDB).mockRejectedValue(new Error("Fail 1"));
        vi.mocked(tmdb.searchTMDB).mockRejectedValue(new Error("Fail 2"));

        await expect(searchMedia("Nothing", { type: "anime" })).rejects.toMatchObject({
          code: "MEDIA_SEARCH_FAILED",
          message: "Media search failed on all providers",
        });
      });
    });
  });

  describe("getMediaDetails", () => {
    const mockDetails = { genres: ["Action"], cast: ["Actor A"] };

    it("should call getTMDBDetails for TMDB URLs", async () => {
      vi.mocked(tmdb.getTMDBDetails).mockResolvedValue(mockDetails);
      const url = "https://www.themoviedb.org/movie/123";

      const result = await getMediaDetails(url);

      expect(tmdb.getTMDBDetails).toHaveBeenCalledWith(url, expect.anything());
      expect(result).toEqual(mockDetails);
    });

    it("should call getTheTVDBDetails for TheTVDB URLs", async () => {
      vi.mocked(theTVDB.getTheTVDBDetails).mockResolvedValue(mockDetails);
      const url = "https://thetvdb.com/series/breaking-bad";

      const result = await getMediaDetails(url);

      expect(theTVDB.getTheTVDBDetails).toHaveBeenCalledWith(url, expect.anything());
      expect(result).toEqual(mockDetails);
    });

    it("should call getAniDBDetails for AniDB URLs", async () => {
      vi.mocked(aniDB.getAniDBDetails).mockResolvedValue(mockDetails);
      const url = "https://anidb.net/anime/123";

      const result = await getMediaDetails(url);

      expect(aniDB.getAniDBDetails).toHaveBeenCalledWith(url, expect.anything());
      expect(result).toEqual(mockDetails);
    });

    it("should use explicit source if provided", async () => {
      vi.mocked(tmdb.getTMDBDetails).mockResolvedValue(mockDetails);
      const url = "https://some-mirror.com/movie/123";

      const result = await getMediaDetails(url, "tmdb");

      expect(tmdb.getTMDBDetails).toHaveBeenCalledWith(url, expect.anything());
    });

    it("should throw error for unknown sources", async () => {
      const url = "https://unknown.com/movie/123";
      await expect(getMediaDetails(url)).rejects.toMatchObject({
        code: "UNKNOWN_MEDIA_SOURCE",
      });
    });
  });
});
