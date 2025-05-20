const cliProgress = require('cli-progress');

const progressBar = new cliProgress.SingleBar({
  format: 'Scraping |{bar}| {percentage}% | {value}/{total} hotels',
  barCompleteChar: '█',
  barIncompleteChar: '░',
  hideCursor: true
});

module.exports = progressBar;
