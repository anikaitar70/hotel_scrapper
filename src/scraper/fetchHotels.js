const { format } = require('date-fns');

module.exports = async function fetchHotels(page, city, maxHotels,min,max) {
  const collectedHotels = [];
  let offset = 0;

  // Get date range: check-in is 7 days from today, check-out is the next day
  const today = new Date();
  const checkin = format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7), 'yyyy-MM-dd');
  const checkout = format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8), 'yyyy-MM-dd');

  while (collectedHotels.length < maxHotels) {
    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}&offset=${offset}&order=class_asc&nflt=review_score%3D80%3B&nflt=price%3DINR-${min}-${max}-1`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    const newHotels = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('div[data-testid="property-card"]')).map(card => {
        const titleEl = card.querySelector('a[data-testid="title-link"]');
        const name = titleEl?.innerText.replace('Opens in new window', '').trim() || 'Unknown';
        const url = titleEl?.href || null;

        const priceEl = card.querySelector('span[data-testid="price-and-discounted-price"]');
        const price = priceEl?.innerText.replace(/\s+/g, ' ').trim() || 'N/A';

        const scoreEl = card.querySelector('div[data-testid="review-score"] > div:nth-child(2)');
        const overallScore = scoreEl?.innerText.trim() || '';

        return { name, url, price, overallScore };
      });
    });

    if (newHotels.length === 0) break;

    for (const hotel of newHotels) {
      if (!collectedHotels.find(h => h.url === hotel.url)) {
        collectedHotels.push(hotel);
        console.log(`🏨 ${hotel.name} | 💸 ${hotel.price} | ⭐ ${hotel.overallScore}`);
        if (collectedHotels.length >= maxHotels) break;
      }
    }

    offset += 25;
  }

  return collectedHotels;
};
