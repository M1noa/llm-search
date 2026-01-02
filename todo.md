## Todo

todo list of what i need to add or do with this project

(feel free to do any of this for me and make a pull request)

- [x] scrape to structured json like (or using) [mishushakov/llm-scraper](https://github.com/mishushakov/llm-scraper)

- [x] make scraping hve a way to responnd with dictionary/array of the title, favicon, processed html without styling or javascript, images and other files, and readability text and a markdown version of it

- [x] website crawling module via [crawlee](https://www.npmjs.com/package/crawlee)

- [x] [pdf](https://www.npmjs.com/package/pdf-parse), [docx](https://www.npmjs.com/package/docx4js), [csv](https://www.npmjs.com/package/csv), [image](https://www.npmjs.com/package/tesseract) (default eng if lang not givin), etc // doc parser to objects, javascript, or text

- [x] autocomplete module via

```
      google:
      http://suggestqueries.google.com/complete/search?client=firefox&q=hello%20world
      fallback to
      https://www.google.com/complete/search?client=gws-wiz&q=hello%20world

      duckduckgo:
      https://duckduckgo.com/ac/?kl=wt-wt&q=hello%20world

      yahoo:
      https://search.yahoo.com/sugg/gossip/gossip-us-fastbreak?output=sd1&command=hello%20world

      brave:
      https://search.brave.com/api/suggest?rich=true&source=web&country=us&q=hello+world

      yandex:
      https://yandex.com/suggest/suggest-ya.cgi?srv=morda_com_desktop&wiz=TrWth&uil=en&fact=1&v=4&icon=1&part=hello%20world

      ecosia:
      https://ac.ecosia.org/?q=hello+world

      startpage // bing:
      https://www.startpage.com/suggestions?q=hello%20world

      qwant:
      https://api.qwant.com/v3/suggest?q=hello%20world

      swisscows:
      https://api.swisscows.com/suggest?locale=en-US&itemsCount=20&query=hello%20world
```

let it be customizable but use duckduckgo by default

- [x] make a news module to get news from [google news](https://www.npmjs.com/package/google-news-scraper) and duckduckgo (using our custom scraper) defautlt being google news

- [x] finance module via [yahoo finance](https://www.npmjs.com/package/yahoo-finance2) (default) and [google finance](https://www.npmjs.com/package/google-finance) if this module still works

- [x] flights module to search flights via [google flights](https://www.npmjs.com/package/google-flights) if it works

- [x] proxy support

- [x] Google & DDG Direct Answer Box scraping in the webpage module

- [x] tmdb/anidb/thetvdb scraping without api key (including getting watch providers / streaming services)

- [x] events module via [google events](https://www.npmjs.com/package/google-events-scraper) that that module still works

- [x] search images in web search
