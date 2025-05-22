// index.js
const readline = require('readline');
const { MAX_HOTELS, MAX_REVIEWS, MIN, MAX } = require('./config');
const { getBrowser, setUserAgent } = require('./utils/browser');
const progressBar = require('./utils/progressBar');
const fetchHotels = require('./scraper/fetchHotels');
const scrapeHotelPage = require('./scraper/scrapeHotelPage');
const exportToExcel = require('./exporter/toExcel');
const flattenHotelData = require('./utils/flatten');
const { insertHotel, closeConnection } = require('./utils/dbHandler');
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// MongoDB test connection example (kept in comments for now)
// async function testMongoConnection() {
//   const dummyHotel = {
//     hotel_name: 'Connection Test Hotel',
//     url: 'https://dummy.com',
//     address: '123 Test St',
//     price: '$1/night',
//     overall_score: 5,
//     staff_score: 5,
//     facilities_score: 5,
//     cleanliness_score: 5,
//     comfort_score: 5,
//     value_score: 5,
//     location_score: 5,
//     wifi_score: true,
//     reviews: [
//       {
//         review_id: 1,
//         date: '2025-05-21',
//         title: 'Test review',
//         score: 5,
//         positive: 'Everything worked perfectly',
//         negative: 'None'
//       }
//     ]
//   };

//   try {
//     const insertedId = await insertHotel(dummyHotel);
//     console.log('✅ Successfully inserted test hotel with ID:', insertedId);
//   } catch (err) {
//     console.error('❌ MongoDB connection failed:', err);
//   } finally {
//     await closeConnection();
//   }
// }

// testMongoConnection();

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/api/hotels', async (req, res) => {
  const location = req.query.location;
  const checkin = req.query.checkin;
  const checkout = req.query.checkout;
  const wifiFilter = req.query.wifiFilter || 'all';

  if (!location) {
    return res.status(400).json({ error: 'Location parameter is required' });
  }
  if (!checkin || !checkout) {
    return res.status(400).json({ error: 'Check-in and check-out dates are required' });
  }

  try {
    const browser = await getBrowser();
    const hotelsPage = await browser.newPage();
    await setUserAgent(hotelsPage);

    // Pass location and dates to fetchHotels; update fetchHotels function to accept these params accordingly
    const hotels = await fetchHotels(hotelsPage, location, MAX_HOTELS, MIN, MAX, checkin, checkout);
    await hotelsPage.close();

    const allHotelData = [];

    for (let i = 0; i < hotels.length; i++) {
      const { name, url, price, overallScore } = hotels[i];
      const page = await browser.newPage();
      try {
        await setUserAgent(page);
        console.log(`🎯 [${i + 1}/${hotels.length}] ${name}`);
        const hotelData = await scrapeHotelPage(page, url, price, checkin, checkout);
        allHotelData.push({
          name,
          url,
          price,
          wifiQuality: hotelData.wifiQuality,
          overallScore,
        });
      } catch (e) {
        console.error(`⚠️ Failed to scrape "${name}": ${e.message}`);
      } finally {
        await page.close();
      }
    }

    await browser.close();

    // Filter based on Wi-Fi quality
    // const filtered = allHotelData.filter((hotel) => {
    //   const wifi = (hotel.wifiQuality || '').toLowerCase();
    //   if (wifiFilter === 'good') {
    //     return wifi.includes('good') || wifi.includes('excellent') || wifi.includes('fast');
    //   }
    //   if (wifiFilter === 'poor') {
    //     return wifi.includes('poor') || wifi.includes('weak') || wifi.includes('disconnect');
    //   }
    //   return true;
    // });

    res.json(filtered);
  } catch (error) {
    console.error('❌ Error scraping hotels:', error);
    res.status(500).json({ error: 'Failed to fetch hotel data' });
  }
});

app.get('/download', (req, res) => {
  const filePath = './output/myfile.xlsx';
  res.download(filePath, 'hotels.xlsx');
});
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// async function main() {
//   const browser = await getBrowser();
//   const hotelsPage = await browser.newPage();
//   await setUserAgent(hotelsPage);
//   const hotels = await fetchHotels(hotelsPage, CITY, MAX_HOTELS, MIN, MAX);
//   await hotelsPage.close();
//   console.log(`Found ${hotels.length} hotels\n`);
//   progressBar.start(hotels.length, 0);
//   const allHotelData = [];
//   for (let i = 0; i < hotels.length; i++) {
//     const { name, url, price, overallScore } = hotels[i];
//     const page = await browser.newPage();
//     try {
//       await setUserAgent(page);
//       console.log(`🎯 [${i + 1}/${hotels.length}] ${name}`);
//       const hotelData = await scrapeHotelPage(page, url, price);
//       allHotelData.push({
//         name,
//         url,
//         price,
//         wifiQuality: hotelData.wifiQuality,
//         overallScore,
//       });
//     } catch (e) {
//       console.error(`⚠️ Failed to scrape "${name}": ${e.message}`);
//     } finally {
//       await page.close();
//       progressBar.update(i + 1);
//     }
//   }
//   progressBar.stop();
//   await browser.close();
//   const flattened = flattenHotelData(allHotelData);
//   console.log('\n📋 Sample scraped data:');
//   console.log(JSON.stringify(flattened.slice(0, 3), null, 2));

//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//   });

//   exportToExcel(flattened);
// }

//main().catch(console.error);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
