const fs = require('fs');
const https = require('https');
const path = require('path');

const dir = path.join(__dirname, 'public', 'regions');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const download = async (url, dest) => {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const fileStream = fs.createWriteStream(dest);

    // Convert Web ReadableStream to Node.js stream and pipe
    const readable = require('stream').Readable.fromWeb(response.body);
    readable.pipe(fileStream);

    return new Promise((resolve, reject) => {
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded correctly: ${dest}`);
        resolve();
      });
      fileStream.on('error', reject);
      readable.on('error', reject);
    });
  } catch (error) {
    console.error(`Failed to download ${url}:`, error);
  }
};

async function run() {
  try {
    console.log('Downloading images...');
    await download('https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Plaza_de_Espa%C3%B1a%2C_Sevilla%2C_Espa%C3%B1a%2C_2015-12-06%2C_DD_70-72_HDR.JPG/800px-Plaza_de_Espa%C3%B1a%2C_Sevilla%2C_Espa%C3%B1a%2C_2015-12-06%2C_DD_70-72_HDR.JPG', path.join(dir, 'andalucia.jpg'));
    await download('https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Cudillero%2C_Asturias%2C_Spain_-_01.jpg/800px-Cudillero%2C_Asturias%2C_Spain_-_01.jpg', path.join(dir, 'asturias.jpg'));
    await download('https://images.unsplash.com/photo-1539037116277-4db20889f2d4?q=80&w=800&auto=format&fit=crop', path.join(dir, 'madrid.jpg'));
    await download('https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=800&auto=format&fit=crop', path.join(dir, 'cataluna.jpg'));
    console.log('All images downloaded successfully!');
  } catch (e) {
    console.error('Error downloading:', e);
  }
}
run();
