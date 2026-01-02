import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSuggestions } from "./autocomplete";
import * as common from "./common";

// Mock the common module
vi.mock("./common", async () => {
  const actual = await vi.importActual("./common");
  return {
    ...actual,
    fetchWithDetection: vi.fn(),
  };
});

describe("Autocomplete Module", () => {
  const mockQuery = "test";
  const mockOptions = { limit: 5 };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get suggestions from Google", async () => {
    const mockResponse = JSON.stringify([
      "test",
      ["test speed", "test internet", "test microphone"],
      [],
      { google: { client: "firefox" } },
    ]);

    vi.spyOn(common, "fetchWithDetection").mockResolvedValue({
      body: mockResponse,
      headers: new Headers(),
    });

    const result = await getSuggestions(mockQuery, "google", mockOptions);

    expect(common.fetchWithDetection).toHaveBeenCalledWith(expect.stringContaining("google.com"), expect.any(Object));
    expect(result.source).toBe("google");
    expect(result.suggestions).toEqual(["test speed", "test internet", "test microphone"]);
    expect(result.suggestions.length).toBeLessThanOrEqual(mockOptions.limit);
  });

  it("should get suggestions from DuckDuckGo", async () => {
    const mockResponse = JSON.stringify([{ phrase: "test speed" }, { phrase: "test internet" }, { phrase: "tester" }]);

    vi.spyOn(common, "fetchWithDetection").mockResolvedValue({
      body: mockResponse,
      headers: new Headers(),
    });

    const result = await getSuggestions(mockQuery, "duckduckgo", mockOptions);

    expect(common.fetchWithDetection).toHaveBeenCalledWith(
      expect.stringContaining("duckduckgo.com"),
      expect.any(Object),
    );
    expect(result.source).toBe("duckduckgo");
    expect(result.suggestions).toEqual(["test speed", "test internet", "tester"]);
  });

  it("should get suggestions from Yahoo", async () => {
    const mockResponse = JSON.stringify({
      gossip: {
        results: [{ key: "test speed" }, { key: "test internet" }],
      },
    });

    vi.spyOn(common, "fetchWithDetection").mockResolvedValue({
      body: mockResponse,
      headers: new Headers(),
    });

    const result = await getSuggestions(mockQuery, "yahoo", mockOptions);

    expect(result.source).toBe("yahoo");
    expect(result.suggestions).toEqual(["test speed", "test internet"]);
  });

  it("should get suggestions from Brave", async () => {
    // OpenSearch format
    const mockResponse = JSON.stringify(["test", ["test speed", "test internet"]]);

    vi.spyOn(common, "fetchWithDetection").mockResolvedValue({
      body: mockResponse,
      headers: new Headers(),
    });

    const result = await getSuggestions(mockQuery, "brave", mockOptions);

    expect(result.source).toBe("brave");
    expect(result.suggestions).toEqual(["test speed", "test internet"]);
  });

  it("should get suggestions from Yandex", async () => {
    const mockResponse = JSON.stringify(["test", ["test speed", "test internet"]]);

    vi.spyOn(common, "fetchWithDetection").mockResolvedValue({
      body: mockResponse,
      headers: new Headers(),
    });

    const result = await getSuggestions(mockQuery, "yandex", mockOptions);

    expect(result.source).toBe("yandex");
    expect(result.suggestions).toEqual(["test speed", "test internet"]);
  });

  it("should get suggestions from Ecosia", async () => {
    const mockResponse = JSON.stringify({
      suggestions: ["test speed", "test internet"],
    });

    vi.spyOn(common, "fetchWithDetection").mockResolvedValue({
      body: mockResponse,
      headers: new Headers(),
    });

    const result = await getSuggestions(mockQuery, "ecosia", mockOptions);

    expect(result.source).toBe("ecosia");
    expect(result.suggestions).toEqual(["test speed", "test internet"]);
  });

  it("should get suggestions from Startpage", async () => {
    const mockResponse = JSON.stringify({
      suggestions: [{ text: "test speed" }, { text: "test internet" }],
    });

    vi.spyOn(common, "fetchWithDetection").mockResolvedValue({
      body: mockResponse,
      headers: new Headers(),
    });

    const result = await getSuggestions(mockQuery, "startpage", mockOptions);

    expect(result.source).toBe("startpage");
    expect(result.suggestions).toEqual(["test speed", "test internet"]);
  });

  it("should get suggestions from Qwant", async () => {
    const mockResponse = JSON.stringify({
      data: {
        items: [{ value: "test speed" }, { value: "test internet" }],
      },
    });

    vi.spyOn(common, "fetchWithDetection").mockResolvedValue({
      body: mockResponse,
      headers: new Headers(),
    });

    const result = await getSuggestions(mockQuery, "qwant", mockOptions);

    expect(result.source).toBe("qwant");
    expect(result.suggestions).toEqual(["test speed", "test internet"]);
  });

  it("should get suggestions from Swisscows", async () => {
    const mockResponse = JSON.stringify(["test speed", "test internet"]);

    vi.spyOn(common, "fetchWithDetection").mockResolvedValue({
      body: mockResponse,
      headers: new Headers(),
    });

    const result = await getSuggestions(mockQuery, "swisscows", mockOptions);

    expect(result.source).toBe("swisscows");
    expect(result.suggestions).toEqual(["test speed", "test internet"]);
  });

  it("should fallback to DuckDuckGo when no provider specified", async () => {
    const mockResponse = JSON.stringify([{ phrase: "test fallback" }]);

    vi.spyOn(common, "fetchWithDetection").mockResolvedValue({
      body: mockResponse,
      headers: new Headers(),
    });

    const result = await getSuggestions(mockQuery);

    expect(result.source).toBe("duckduckgo");
    expect(result.suggestions).toEqual(["test fallback"]);
  });

  it("should handle errors gracefully", async () => {
    vi.spyOn(common, "fetchWithDetection").mockRejectedValue(new Error("Network Error"));

    await expect(getSuggestions(mockQuery, "google")).rejects.toThrow("Failed to get suggestions from google");
  });

  it("should respect limit option", async () => {
    const mockResponse = JSON.stringify(["test", ["1", "2", "3", "4", "5", "6"]]);

    vi.spyOn(common, "fetchWithDetection").mockResolvedValue({
      body: mockResponse,
      headers: new Headers(),
    });

    const result = await getSuggestions(mockQuery, "google", { limit: 3 });

    expect(result.suggestions).toHaveLength(3);
    expect(result.suggestions).toEqual(["1", "2", "3"]);
  });
});
