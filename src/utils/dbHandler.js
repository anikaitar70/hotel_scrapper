const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';  // Change if needed
const dbName = 'hotelDB';

let client;
let db;

async function connect() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    console.log('Connected to MongoDB');
  }
  return db;
}

async function insertHotel(hotelData) {
  const db = await connect();
  const hotels = db.collection('hotels');
  const result = await hotels.insertOne(hotelData);
  return result.insertedId;
}

// Optional: close connection (call when your app finishes)
async function closeConnection() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

module.exports = {
  insertHotel,
  closeConnection
};
