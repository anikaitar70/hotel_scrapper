# Booking.com Hotel Scraper

This Node.js script scrapes hotel data and reviews from Booking.com for a given city using Puppeteer and exports the results to an Excel file.

## Features

- Scrapes hotel names, addresses, prices, and review data
- Extracts sentiment from reviews
- Outputs to Excel format with scores

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/hotel-scraper.git
   cd hotel-scraper
2. Install Dependencies:
   ```bash 
    npm install
3. Run the scraper:
    ```bash
    node src/index.js


# Output:
An Excel file saved as data/all_hotel_reviews.xlsx

# Dependencies
puppeteer
cli-progress
xlsx
sentiment
fs (built-in)
