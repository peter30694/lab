const https = require('https');
const fs = require('fs');
const path = require('path');

const fonts = {
    'NotoSans-Regular.ttf': 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
    'NotoSans-Bold.ttf': 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf'
};

const fontsDir = path.join(__dirname, '..', 'public', 'fonts');

if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
}

Object.entries(fonts).forEach(([filename, url]) => {
    const filePath = path.join(fontsDir, filename);
    if (fs.existsSync(filePath)) {
        console.log(`${filename} already exists`);
        return;
    }

    console.log(`Downloading ${filename}...`);
    const file = fs.createWriteStream(filePath);
    https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`Downloaded ${filename}`);
        });
    }).on('error', (err) => {
        fs.unlink(filePath, () => {});
        console.error(`Error downloading ${filename}:`, err);
    });
}); 