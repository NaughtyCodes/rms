import sharp from 'sharp';
import path from 'path';

async function convert() {
    try {
        await sharp('assets/logo.png')
            .toFormat('jpeg')
            .toFile('assets/logo.jpg');
        console.log('Successfully converted logo to JPG');
        
        await sharp('assets/dashboard_mockup.png')
            .toFormat('jpeg')
            .toFile('assets/dashboard_mockup.jpg');
        console.log('Successfully converted mockup to JPG');
    } catch (err) {
        console.error('Conversion failed:', err);
    }
}

convert();
