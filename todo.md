## Todo

todo list of what i need to add or do with this project

(feel free to do any of this for me and make a pull request)

- [ ] scrape to structured json like (or using) [mishushakov/llm-scraper](https://github.com/mishushakov/llm-scraper)

- [x] make webpage responnd with/let you get of the title, favicon, processed html without styling or javascript, images and other files, and readability text and a markdown version

- [ ] website crawling module via [crawlee](https://www.npmjs.com/package/crawlee)

- [x] [pdf](https://www.npmjs.com/package/pdf-parse), [docx](https://www.npmjs.com/package/docx4js), [csv](https://www.npmjs.com/package/csv), [image](https://www.npmjs.com/package/tesseract) (default eng if lang not givin), etc // doc parser to objects, javascript, or text

- [x] make an autocomplete module

- [x] make a news module to get news from [google news](https://www.npmjs.com/package/google-news-scraper) and [duckduckgo](https://www.npmjs.com/package/duck-duck-scrape) (use news search cunfion on duck duck scrape) defautlt being google news

- [x] finance module via [yahoo finance](https://www.npmjs.com/package/yahoo-finance2) (default) and [google finance](https://www.npmjs.com/package/google-finance) if this module still works

- [ ] flights module to search flights via [google flights](https://www.npmjs.com/package/google-flights) if it works

- [ ] proxy support

- [x] reddit module via getting top sub reddit stuff via https://www.reddit.com/r/news/hot.json and searching via https://www.reddit.com/search.json?q=news&type=posts&sort=hot and getting post info via getting the post url and adding .json like https://www.reddit.com/r/NikkeOutpost/comments/1kdoe4h/new_nikke_news.json

- [x] add google news rss option to use gooogle news without the scraping modle searching:https://news.google.com/rss/search?q=<what to search for> top/new:https://news.google.com/rss

- [x] fix image parsing to not create .traineddata files

- [x] make sure the docs are up to date and detailed enough also add a command to install all the dependencies to the readme.md of the docs also update the normal readme.md to make sure it has all the dependencies this projec tuses ian it

- [x] make sure that webpage support if a site responds with a redirect it follows it

- [x] same search engines in autocomplete added to search

- [ ] make search support both quiries with a search engine provided and giving a url to a search engine

- [ ] github search & repo & user info

- [ ] model handling for sequential thinking, searching, etc inside the module

- [ ] model api support so people can just give their api key and model n stuff and the module does all the requesting

- [ ] search stuff from https://github.com/chatboxai/chatbox/tree/main/src/renderer/packages/web-search like bing and ddg and bing news

- [ ] copy ideas from https://github.com/modelcontextprotocol/servers/tree/main/src