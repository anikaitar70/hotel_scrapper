const puppeteer = require('puppeteer'); 
const { MAX_REVIEWS } = require('../config');

module.exports = async function scrapeHotelPage(page, url, cachedPrice = '') 
 {
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.waitForSelector('body', { timeout: 1000 });
  const address = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button'));
  for (const btn of buttons) {
    const text = btn.innerText;
    if (text && text.includes('location') && /\d{6}/.test(text)) {
      return text.split('\n')[0].trim();
    }
  }
  return '';
});
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
    await page.waitForSelector('div[data-testid="review"]', { timeout: 10000 }).catch(() => {});
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
      score: (() => {
  const raw = card.querySelector('div[data-testid="review-score"]')?.innerText || '';
  const cleaned = raw.split('\n').map(s => s.trim()).filter(Boolean)[0];
  return cleaned || '';
})(),

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
  return {
  address,
  price: cachedPrice,
  categoryRatings,
  reviews
};
};
