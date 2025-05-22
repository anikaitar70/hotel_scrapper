const fs = require('fs');
const { format } = require('date-fns');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const axios = require('axios');

module.exports = async function fetchHotelsFromMMT(page, city, maxHotels, MIN, MAX) {
  const collectedHotels = [];
  const seenNames = new Set();

  const today = new Date();
  const checkin = format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7), 'yyyy-MM-dd');
  const checkout = format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8), 'yyyy-MM-dd');

  function normalizeName(name) {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  // Auto scroll function to trigger lazy loading
  async function autoScroll(page){
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;

          if(totalHeight >= document.body.scrollHeight){
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  // Scrape hotel data from MMT with more details like price and rating
  async function getHotelsFromMMT(city) {
    const hotels = [];
    const mmtSearchUrl = `https://www.makemytrip.com/hotels/hotel-listing/?city=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}&filterData=HOTEL_PRICE_BUCKET%7C${MIN}-${MAX}`;

    try {
      console.log(`Navigating to MMT URL: ${mmtSearchUrl}`);
      await page.mouse.move(100, 100);
      
      await page.goto(mmtSearchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      // Scroll to bottom to load all listings
      await autoScroll(page);

      // Wait for at least one hotel listing to appear (up to 30 seconds)
      await page.waitForFunction(
        () => document.querySelectorAll('.listingRowOuter').length > 0,
        { timeout: 30000 }
      );

      const hotelCards = await page.$$('.listingRowOuter');
      console.log('Number of hotel cards found:', hotelCards.length);

      const mmtHotels = await page.evaluate(() => {
        console.log("Inside page.evaluate - starting hotel scrape");
        const hotelCards = document.querySelectorAll('.listingRow');
        console.log(`Found ${hotelCards.length} hotel cards`);

        const data = [];

        hotelCards.forEach(card => {
          const nameEl = card.querySelector('.latoBlack.font22.blackText.appendBottom5');
          const locEl = card.querySelector('.blackText.font12.appendBottom3');
          const priceEl = card.querySelector('.actualPrice');
          const ratingEl = card.querySelector('.hotelRating');

          if (!nameEl) {
            console.log('Hotel card missing name element');
          }
          if (!locEl) {
            console.log('Hotel card missing location element');
          }

          if (nameEl && locEl) {
            data.push({
              name: nameEl.innerText.trim(),
              location: locEl.innerText.trim(),
              price: priceEl ? priceEl.innerText.trim() : 'N/A',
              rating: ratingEl ? ratingEl.innerText.trim() : 'N/A',
            });
          }
        });

        console.log(`Scraped ${data.length} hotels inside page.evaluate`);
        return data;
      });

      console.log(`Got ${mmtHotels.length} hotels from page.evaluate`);
      hotels.push(...mmtHotels);

    } catch (error) {
      console.error(`❌ Failed to fetch MMT data for ${city}:`, error);
    }

    console.log(`Returning ${hotels.length} hotels from getHotelsFromMMT`);
    return hotels;
  }

  const mmtHotels = await getHotelsFromMMT(city);

  let index = 0;
  while (collectedHotels.length < maxHotels && index < mmtHotels.length) {
    const { name, location } = mmtHotels[index++];
    const normalizedName = normalizeName(name);
    if (seenNames.has(normalizedName)) continue;

    const searchQuery = `${name} ${location || city}`;
    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(searchQuery)}&checkin=${checkin}&checkout=${checkout}&nflt=review_score%3D80%3B&nflt=price%3DINR-${MIN}-${MAX}-1`;

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    } catch (err) {
      console.error(`❌ Failed to load Booking.com page for ${name}:`, err);
      continue;
    }

    const hotel = await page.evaluate(() => {
      const card = document.querySelector('div[data-testid="property-card"]');
      if (!card) return null;

      const titleEl = card.querySelector('a[data-testid="title-link"]');
      const hotel_name = titleEl?.innerText.replace('Opens in new window', '').trim() || 'Unknown';
      const url = titleEl?.href || null;

      const priceEl = card.querySelector('span[data-testid="price-and-discounted-price"]');
      const price = priceEl?.innerText.replace(/\s+/g, ' ').trim() || 'N/A';

      const scoreEl = card.querySelector('div[data-testid="review-score"] > div:nth-child(2)');
      const overall_score = scoreEl?.innerText.trim() || '';

      return { name: hotel_name, url, price, overallScore: overall_score };
    });

    if (hotel && hotel.name && hotel.overallScore) {
      const hotelNormName = normalizeName(hotel.name);
      if (!seenNames.has(hotelNormName)) {
        seenNames.add(hotelNormName);
        collectedHotels.push(hotel);
        console.log(`🏨 ${hotel.name} | 💸 ${hotel.price} | ⭐ ${hotel.overallScore}`);
      }
    } else {
      console.log(`⚠️ No Booking.com data for ${name}, trying next...`);
    }
  }

  return collectedHotels;
};
