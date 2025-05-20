// index.js
const readline = require('readline');
const { CITY, MAX_HOTELS, MAX_REVIEWS,MIN,MAX } = require('./config');
const { getBrowser, setUserAgent } = require('./utils/browser');
const progressBar = require('./utils/progressBar');
const fetchHotels = require('./scraper/fetchHotels');
const scrapeHotelPage = require('./scraper/scrapeHotelPage');
const exportToExcel = require('./exporter/toExcel');
const flattenHotelData = require('./utils/flatten');

async function main() {
  const browser = await getBrowser();
  const hotelsPage = await browser.newPage();
  await setUserAgent(hotelsPage);
  const hotels = await fetchHotels(hotelsPage, CITY, MAX_HOTELS,MIN,MAX);
  await hotelsPage.close();
  console.log(`Found ${hotels.length} hotels\n`);
  progressBar.start(hotels.length, 0);
  const allHotelData = [];
  for (let i = 0; i < hotels.length; i++) {
    const { name, url, price,overallScore } = hotels[i];
    const page = await browser.newPage();
    try {
      await setUserAgent(page);
      console.log(`🎯 [${i + 1}/${hotels.length}] ${name}`);
      const hotelData = await scrapeHotelPage(page, url, price,);
      allHotelData.push({ name, url, ...hotelData, categoryRatings: hotelData.categoryRatings,overallScore});
    } catch (e) {
      console.error(`⚠️ Failed to scrape "${name}": ${e.message}`);
    } finally {
      await page.close();
      progressBar.update(i + 1);
    }
  }
  progressBar.stop();
  await browser.close();
  // 👇 Clean and flatten data for export
  const flattened = flattenHotelData(allHotelData);
  // 👇 Show sample of data
  console.log('\n📋 Sample scraped data:');
  console.log(JSON.stringify(flattened.slice(0, 3), null, 2));
  // 👇 Ask user if they want to export
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('\n💾 Do you want to save this data to all_hotel_reviews.xlsx? (y/n): ', answer => {
    if (answer.toLowerCase() === 'y') {
      exportToExcel(flattened);
      console.log('\n✅ File saved as all_hotel_reviews.xlsx');
    } else {
      console.log('\n🛑 Skipped saving to Excel.');
    }
    rl.close();
  });
}

main().catch(console.error);
