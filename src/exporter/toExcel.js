const xlsx = require('xlsx');
const fs = require('fs');

module.exports = function exportToExcel(flattenedData, filename = 'all_hotel_reviews.xlsx') {
  const worksheet = xlsx.utils.json_to_sheet(flattenedData);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'All Reviews');
  xlsx.writeFile(workbook, filename);
};