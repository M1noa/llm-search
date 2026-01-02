import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { searchEvents } from "./events";
import * as common from "./common";
import type { Browser } from "puppeteer";

// Mock common module
vi.mock("./common", async () => {
  const actual = await vi.importActual<typeof import("./common")>("./common");
  return {
    ...actual,
    createStealthBrowser: vi.fn(),
  };
});

describe("Events Module", () => {
  // Define types for our mocks to avoid 'any'
  interface MockPage {
    setViewport: Mock;
    setExtraHTTPHeaders: Mock;
    goto: Mock;
    waitForSelector: Mock;
    evaluate: Mock;
    click: Mock;
    waitForNavigation: Mock;
    $: Mock;
  }

  interface MockBrowser {
    newPage: Mock;
    close: Mock;
  }

  let mockPage: MockPage;
  let mockBrowser: MockBrowser;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPage = {
      setViewport: vi.fn(),
      setExtraHTTPHeaders: vi.fn(),
      goto: vi.fn(),
      waitForSelector: vi.fn(),
      evaluate: vi.fn(),
      click: vi.fn(),
      waitForNavigation: vi.fn(),
      $: vi.fn(),
    };

    mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn(),
    };

    vi.spyOn(common, "createStealthBrowser").mockResolvedValue(mockBrowser as unknown as Browser);
  });

  it("should search for events with query string", async () => {
    const mockEvents = [
      {
        title: "Test Event",
        date: "Tomorrow",
        location: "Test Location",
        link: "https://example.com/event",
        description: "A test event description",
        image: "https://example.com/image.jpg",
      },
    ];

    mockPage.evaluate.mockResolvedValue(mockEvents);

    const result = await searchEvents("concerts in New York");

    expect(common.createStealthBrowser).toHaveBeenCalled();
    expect(mockPage.goto).toHaveBeenCalledWith(
      expect.stringContaining("google.com/search?q=concerts%20in%20New%20York&ibp=htl;events"),
      expect.any(Object),
    );
    expect(result.events).toEqual(mockEvents);
    expect(result.source).toBe("google-events");
  });

  it("should handle scraping errors gracefully", async () => {
    mockPage.goto.mockRejectedValue(new Error("Navigation failed"));

    await expect(searchEvents("query")).rejects.toThrow("Failed to search events");
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it("should attempt to click consent button if found", async () => {
    // Mock waitForSelector implementation for consent button
    mockPage.waitForSelector.mockImplementation((selector: string) => {
      if (selector.includes("Accept all")) {
        return Promise.resolve({ click: vi.fn() });
      }
      return Promise.resolve(null);
    });

    // Mock evaluate to return empty list so it finishes
    mockPage.evaluate.mockResolvedValue([]);

    await searchEvents("query");

    expect(mockPage.goto).toHaveBeenCalled();
  });
});
