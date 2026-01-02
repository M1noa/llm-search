import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { extractAnswerBox as extractGoogleAnswer } from "./scrapers/google";
import { extractAnswerBox as extractDDGAnswer } from "./scrapers/duckduckgo";

describe("Answer Box Extraction", () => {
  describe("Google Answer Box", () => {
    it("should extract featured snippet text (.hgKElc)", () => {
      const html = `
        <div class="hgKElc">
          This is a featured snippet text.
        </div>
      `;
      const dom = new JSDOM(html);
      const result = extractGoogleAnswer(dom.window.document);
      expect(result).toBe("This is a featured snippet text.");
    });

    it("should extract list snippet (.LGOjhe)", () => {
      const html = `
        <div class="LGOjhe">
          List item 1
          List item 2
        </div>
      `;
      const dom = new JSDOM(html);
      const result = extractGoogleAnswer(dom.window.document);
      expect(result).toBe("List item 1\n          List item 2");
    });

    it("should extract direct answer (.Z0LcW)", () => {
      const html = `
        <div class="Z0LcW">
          42
        </div>
      `;
      const dom = new JSDOM(html);
      const result = extractGoogleAnswer(dom.window.document);
      expect(result).toBe("42");
    });

    it("should extract knowledge panel description (.kno-rdesc span)", () => {
      const html = `
        <div class="kno-rdesc">
          <span>A description of an entity.</span>
        </div>
      `;
      const dom = new JSDOM(html);
      const result = extractGoogleAnswer(dom.window.document);
      expect(result).toBe("A description of an entity.");
    });

    it("should return undefined if no answer box found", () => {
      const html = `<div>Just a regular search result page</div>`;
      const dom = new JSDOM(html);
      const result = extractGoogleAnswer(dom.window.document);
      expect(result).toBeUndefined();
    });
  });

  describe("DuckDuckGo Answer Box", () => {
    it("should extract abstract (.module__text)", () => {
      const html = `
        <div class="module__text">
          Abstract content from Wikipedia usually.
        </div>
      `;
      const dom = new JSDOM(html);
      const result = extractDDGAnswer(dom.window.document);
      expect(result).toBe("Abstract content from Wikipedia usually.");
    });

    it("should extract definition (.zci__def__text)", () => {
      const html = `
        <div class="zci__def__text">
          Definition of a word.
        </div>
      `;
      const dom = new JSDOM(html);
      const result = extractDDGAnswer(dom.window.document);
      expect(result).toBe("Definition of a word.");
    });

    it("should extract calculator (.c-base__title)", () => {
      const html = `
        <div class="c-base__title">
          1 + 1 = 2
        </div>
      `;
      const dom = new JSDOM(html);
      const result = extractDDGAnswer(dom.window.document);
      expect(result).toBe("1 + 1 = 2");
    });

    it("should extract generic fact (.zci__body)", () => {
      const html = `
        <div class="zci__body">
          A generic fact about something.
        </div>
      `;
      const dom = new JSDOM(html);
      const result = extractDDGAnswer(dom.window.document);
      expect(result).toBe("A generic fact about something.");
    });

    it("should return undefined if no answer box found", () => {
      const html = `<div>Just a regular search result page</div>`;
      const dom = new JSDOM(html);
      const result = extractDDGAnswer(dom.window.document);
      expect(result).toBeUndefined();
    });
  });
});
