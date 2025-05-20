module.exports = function flattenHotelData(allHotelData) {
  const flattened = [];

  // Define expected labels and their possible aliases
  const labelMap = {
    'Staff': ['Staff'],
    'Facilities': ['Facilities'],
    'Cleanliness': ['Cleanliness'],
    'Comfort': ['Comfort'],
    'Value for money': ['Value for money'],
    'Location': ['Location'],
    'Free WiFi': ['Free WiFi', 'Free Wi-Fi', 'WiFi', 'Wi-Fi']
  };

  for (const hotel of allHotelData) {
    const ratings = {};

    if (hotel.categoryRatings) {
      const categoryKeys = Object.keys(hotel.categoryRatings);

      // Match each label against possible aliases
      for (const label in labelMap) {
        const aliases = labelMap[label];
        const matchedKey = categoryKeys.find(key =>
          aliases.some(alias =>
            key.replace(/\s+/g, ' ').trim().toLowerCase().includes(alias.toLowerCase())
          )
        );
        if (matchedKey) {
          ratings[label] = hotel.categoryRatings[matchedKey];
        }
      }

      // 🚨 Log unmatched keys for debug
      const unmatched = categoryKeys.filter(key =>
        !Object.values(labelMap).flat().some(alias =>
          key.replace(/\s+/g, ' ').trim().toLowerCase().includes(alias.toLowerCase())
        )
      );
      if (unmatched.length) {
        console.warn(`🚫 Unmatched rating labels for "${hotel.name}":`, unmatched);
      }
    }

    if (!Object.keys(ratings).length) {
      console.warn(`⚠️ No ratings found for: ${hotel.name}`);
      console.log("🚫 hotel.categoryRatings keys:", Object.keys(hotel.categoryRatings || {}));
    }

    hotel.reviews.forEach(review => {
      flattened.push({
        hotel: hotel.name,
        url: hotel.url,
        address: hotel.address,
        price: hotel.price,
        overallScore: hotel.overallScore || '',
        ...ratings,
        date: review.date,
        title: review.title,
        score: review.score,
        positive: review.positive,
        negative: review.negative
      });
    });
  }

  return flattened;
};
