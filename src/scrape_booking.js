const puppeteer = require('puppeteer');
const cliProgress = require('cli-progress');
const fs = require('fs');
const xlsx = require('xlsx');
const Sentiment = require('sentiment');

const CITY = 'Gurugram';
const MAX_HOTELS = 30;
const MAX_REVIEWS = 10;

const sentiment = new Sentiment();
const progressBar = new cliProgress.SingleBar({
  format: 'Scraping |{bar}| {percentage}% | {value}/{total} hotels',
  barCompleteChar: '█',
  barIncompleteChar: '░',
  hideCursor: true
});

async function fetchHotels(page, city, maxHotels) {
  const collectedHotels = [];
  let offset = 0;

  while (collectedHotels.length < maxHotels) {
    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&offset=${offset}&order=class_asc&nflt=review_score%3D80%3B`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    const newHotels = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[data-testid="title-link"]'))
        .map(el => ({
          name: el.innerText.replace('Opens in new window', '').trim(),
          url: el.href.startsWith('http') ? el.href : `https://www.booking.com${el.getAttribute('href')}`
        }));
    });

    if (newHotels.length === 0) break;

    for (const hotel of newHotels) {
      if (!collectedHotels.find(h => h.url === hotel.url)) {
        collectedHotels.push(hotel);
        if (collectedHotels.length >= maxHotels) break;
      }
    }

    offset += 25;
  }

  return collectedHotels;
}

async function scrape() {
  const browser = await puppeteer.launch({ headless: true });
  const hotelsPage = await browser.newPage();
  await hotelsPage.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/115.0.0.0 Safari/537.36'
  );

  const hotels = await fetchHotels(hotelsPage, CITY, MAX_HOTELS);
  await hotelsPage.close();

  console.log(`Found ${hotels.length} hotels\n`);
  progressBar.start(hotels.length, 0);
  const allHotelData = [];

  for (let i = 0; i < hotels.length; i++) {
    const { name, url } = hotels[i];
    console.log(`🎯 [${i + 1}/${hotels.length}] ${name}`);

    const page = await browser.newPage();
    try {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/115.0.0.0 Safari/537.36'
      );

      await page.goto(url, { waitUntil: 'networkidle2' });

      const address = await page.$eval('span[data-node_tt_id="location_score_tooltip"]', el => el.innerText.trim()).catch(() => '');
      const price = await page.$eval('div[data-testid="price-and-discounted-price"]', el => el.innerText.trim()).catch(() => '');

      const categoryRatings = await page.evaluate(() => {
        const entries = Array.from(document.querySelectorAll('div[data-testid="review-subscore"]'));
        const ratings = {};
        for (const entry of entries) {
          const label = entry.querySelector('div:nth-child(1)')?.innerText.trim();
          const score = entry.querySelector('div:nth-child(2)')?.innerText.trim();
          if (label && score) ratings[label] = score;
        }
        return ratings;
      });

      const readAll = await page.$('span[data-testid="review-score-read-all"]');
      if (readAll) {
        await readAll.click();
        await page.waitForSelector('div[data-testid="review"]', { timeout: 10000 });
      }

      await page.evaluate(async () => {
        for (let j = 0; j < 5; j++) {
          window.scrollBy(0, window.innerHeight);
          await new Promise(r => setTimeout(r, 100));
        }
      });

      const reviews = await page.evaluate((max) => {
        const cards = Array.from(document.querySelectorAll('div[data-testid="review"]'));
        return cards.slice(0, max).map(card => ({
          date: card.querySelector('span[data-testid="review-date"]')?.innerText.trim() || '',
          title: card.querySelector('h4[data-testid="review-title"]')?.innerText.trim() || '',
          score: card.querySelector('div[data-testid="review-score"]')?.innerText.replace('Scored ', '').trim() || '',
          positive: (() => {
            const posBlock = card.querySelector('div[data-testid="review-positive-text"]');
            return posBlock ? posBlock.innerText.replace(/^Positive\s*/, '').trim() : '';
          })(),
          negative: (() => {
            const negBlock = card.querySelector('div[data-testid="review-negative-text"]');
            return negBlock ? negBlock.innerText.replace(/^Negative\s*/, '').trim() : '';
          })()
        }));
      }, MAX_REVIEWS);

      console.log(`  → Got ${reviews.length} reviews`);
      allHotelData.push({ name, url, address, price, ...categoryRatings, reviews });

    } catch (err) {
      console.error(`  ⚠️ Failed to scrape "${name}":`, err.message);
    } finally {
      await page.close();
    }

    progressBar.update(i + 1);
    await new Promise(r => setTimeout(r, 100));
  }

  progressBar.stop();
  await browser.close();

  const flattened = [];
  for (const hotel of allHotelData) {
    hotel.reviews.forEach(review => {
      flattened.push({
        hotel: hotel.name,
        url: hotel.url,
        address: hotel.address,
        price: hotel.price,
        ...Object.fromEntries(
          Object.entries(hotel).filter(([k]) => ['Staff', 'Facilities', 'Cleanliness', 'Comfort', 'Value for money', 'Location', 'Free WiFi'].includes(k))
        ),
        date: review.date,
        title: review.title,
        score: review.score,
        positive: review.positive,
        negative: review.negative
      });
    });
  }

  const worksheet = xlsx.utils.json_to_sheet(flattened);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'All Reviews');
  xlsx.writeFile(workbook, 'all_hotel_reviews.xlsx');

  console.log('\n✅ Scraping complete. File saved as all_hotel_reviews.xlsx');
}

scrape().catch(console.error);
