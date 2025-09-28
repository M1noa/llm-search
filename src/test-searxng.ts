// test-searxng.ts - test searxng search functionality

import { search } from './modules/search';
import { SearchProvider } from './types';

async function testSearXNG() {
  try {
    console.log('Testing SearXNG search...');
    
    // example usage with a public searxng instance
    // try multiple instances in case one is rate limited
    const instances = [
      'https://searx.be',
      'https://search.sapti.me',
      'https://searx.tiekoetter.com'
    ];
    
    let results: any[] = [];
     let lastError: any = null;
    
    for (const baseUrl of instances) {
      try {
        console.log(`\nTrying instance: ${baseUrl}`);
        results = await search('typescript programming', {
          provider: SearchProvider.SearXNG,
          limit: 5,
          safeSearch: true,
          searxngConfig: {
            baseUrl,
            // apiKey: 'your-api-key-if-required' // optional
          }
        });
        console.log(`✅ Success with ${baseUrl}`);
        break;
      } catch (error: any) {
         console.log(`❌ Failed with ${baseUrl}: ${error.message}`);
         lastError = error;
        // wait a bit before trying next instance
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (results.length === 0 && lastError) {
      throw lastError;
    }
    
    console.log(`Found ${results.length} results:`);
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.title}`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Snippet: ${result.snippet || 'No snippet'}`);
      console.log(`   Source: ${result.source}`);
    });
    
  } catch (error) {
    console.error('SearXNG search failed:', error);
  }
}

// run the test
if (require.main === module) {
  testSearXNG();
}

export { testSearXNG };