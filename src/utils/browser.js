const puppeteer = require('puppeteer');

const getBrowser = async () => {
  return puppeteer.launch({ headless: true });
};

const setUserAgent = async (page) => {
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/115.0.0.0 Safari/537.36'
  );
};

module.exports = { getBrowser, setUserAgent };
