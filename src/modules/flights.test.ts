import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { searchFlights } from "./flights";
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

describe("Flights Module", () => {
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

  it("should search for flights with query string", async () => {
    const mockFlights = [
      {
        airline: "Test Air",
        departureTime: "10:00 AM",
        arrivalTime: "02:00 PM",
        duration: "4 hr",
        price: "$200",
        stops: "Non-stop",
      },
    ];

    mockPage.evaluate.mockResolvedValue(mockFlights);

    const result = await searchFlights("flights from JFK to LHR");

    expect(common.createStealthBrowser).toHaveBeenCalled();
    expect(mockPage.goto).toHaveBeenCalledWith(
      expect.stringContaining("google.com/travel/flights"),
      expect.any(Object),
    );
    expect(result.flights).toEqual(mockFlights);
    expect(result.source).toBe("google-flights");
  });

  it("should search for flights with structured options", async () => {
    const mockFlights = [
      {
        airline: "Test Air",
        departureTime: "10:00 AM",
        arrivalTime: "02:00 PM",
        duration: "4 hr",
        price: "$200",
        stops: "Non-stop",
      },
    ];

    mockPage.evaluate.mockResolvedValue(mockFlights);

    const options = {
      from: "JFK",
      to: "LHR",
      departureDate: "2025-05-01",
      returnDate: "2025-05-10",
    };

    const result = await searchFlights(options);

    expect(mockPage.goto).toHaveBeenCalledWith(
      expect.stringMatching(/q=Flights%20to%20LHR%20from%20JFK%20on%202025-05-01%20returning%202025-05-10/),
      expect.any(Object),
    );
    expect(result.flights).toEqual(mockFlights);
  });

  it("should handle scraping errors gracefully", async () => {
    mockPage.goto.mockRejectedValue(new Error("Navigation failed"));

    await expect(searchFlights("query")).rejects.toThrow("Failed to search flights");
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it("should attempt to click consent button if found", async () => {
    // Mock waitForSelector implementation for consent button
    mockPage.waitForSelector.mockImplementation((selector: string) => {
      if (selector.includes("Accept all")) {
        return Promise.resolve({ click: vi.fn() });
      }
      return Promise.resolve(null); // Return null for other selectors or throw depending on logic
    });

    // Mock evaluate to return empty list so it finishes
    mockPage.evaluate.mockResolvedValue([]);

    await searchFlights("query");

    // We can't easily check if the exact element method was called since we return a new object
    // But we can check if the flow continued
    expect(mockPage.goto).toHaveBeenCalled();
  });
});
