const fs = require('fs');
const { format } = require('date-fns');
const puppeteer = require('puppeteer');

module.exports = async function fetchHotels(page, city, maxHotels, MIN, MAX, saveToFile = false) {
  const collectedHotels = [];
  const seenNames = new Set(); // Use hotel names as unique keys
  let offset = 0;
  let noNewHotelsCount = 0;

  const today = new Date();
  const checkin = format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7), 'yyyy-MM-dd');
  const checkout = format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8), 'yyyy-MM-dd');

  // Helper function to normalize hotel names for comparison
  function normalizeName(name) {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  // Helper function to click "Load more results" button if it exists
async function scrollAndClickLoadMore(page, maxTries = 40) {
  for (let i = 0; i < maxTries; i++) {
    // Scroll to bottom
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Wait for 3 seconds to allow content to load
    await page.waitForSelector('div[data-testid="property-card"]', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try to find the "Load more results" button using evaluateHandle
    const buttonHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.innerText.includes('Load more results')) || null;
    });

    const element = buttonHandle.asElement();

    if (element) {
      console.log('▶️ Clicking "Load more results" button...');
      await element.click();
      
      // Wait after clicking for new content to load
      await new Promise(resolve => setTimeout(resolve, 5000));
      return true; // clicked successfully
    }

    console.log(`ℹ️ Try ${i + 1}: "Load more results" button not found, scrolling again...`);
    await page.screenshot({ path: `page-screenshot-${i + 1}.png`, fullPage: true });

  }

  console.log('❌ "Load more results" button not found after max tries.');
  return false; // button not found after max tries
}


  while (collectedHotels.length < maxHotels) {
  const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}&offset=${offset}&order=class_asc&nflt=review_score%3D80%3B&nflt=price%3DINR-${MIN}-${MAX}-1`;
  console.log(searchUrl);
  await page.goto(searchUrl, { waitUntil: 'networkidle2' });

  const newHotels = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('div[data-testid="property-card"]')).map(card => {
      const titleEl = card.querySelector('a[data-testid="title-link"]');
      const hotel_name = titleEl?.innerText.replace('Opens in new window', '').trim() || 'Unknown';
      const url = titleEl?.href || null;

      const priceEl = card.querySelector('span[data-testid="price-and-discounted-price"]');
      const price = priceEl?.innerText.replace(/\s+/g, ' ').trim() || 'N/A';

      const scoreEl = card.querySelector('div[data-testid="review-score"] > div:nth-child(2)');
      const overall_score = scoreEl?.innerText.trim() || '';

      return { name: hotel_name, url, price, overallScore: overall_score };
    });
  });

  if (newHotels.length === 0) {
    console.log('❌ No more hotels found.');
    break;
  }

  let newUniqueHotelsInThisPage = 0;
  for (const hotel of newHotels) {
    const normalizedName = normalizeName(hotel.name);
    if (!seenNames.has(normalizedName)) {
      seenNames.add(normalizedName);
      collectedHotels.push(hotel);
      newUniqueHotelsInThisPage++;
      console.log(`🏨 ${hotel.name} | 💸 ${hotel.price} | ⭐ ${hotel.overallScore}`);

      if (collectedHotels.length >= maxHotels) break;
    }
  }

  if (newUniqueHotelsInThisPage === 0) {
    noNewHotelsCount++;
    console.log(`⚠️ No new unique hotels found at offset ${offset}. Count: ${noNewHotelsCount}`);
    if (noNewHotelsCount >= 3) {
    console.log('🚫 No new hotels found in 3 consecutive pages. Exiting loop.');
    break;
  }
    // Attempt load more only once, if fails — break
    const clicked = await scrollAndClickLoadMore(page);
    if (!clicked) {
      console.log('❌ Load more failed or no more hotels. Ending scraping.');
      break;
    }

  } else {
    noNewHotelsCount = 0; // Reset if new hotels found
  }

  offset += 25; // 🔧 Always increment offset to avoid infinite loop
}


  if (saveToFile) {
    fs.writeFileSync(
      `hotels_${city.replace(/\s+/g, '_')}.json`,
      JSON.stringify(collectedHotels, null, 2),
      'utf-8'
    );
    console.log(`📁 Saved ${collectedHotels.length} unique hotels to JSON file.`);
  }

  return collectedHotels;
};
