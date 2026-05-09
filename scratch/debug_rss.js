
const https = require('https');

const url = 'https://note.com/tsukuro_team/m/m264f34cbee5f/rss';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('--- XML START ---');
    console.log(data.substring(0, 3000)); // 最初の3000文字を表示
    console.log('--- XML END ---');
  });
}).on('error', (err) => {
  console.error('Error: ' + err.message);
});
