const axios = require('axios');

async function getBufferFromUrl(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}

module.exports = getBufferFromUrl;