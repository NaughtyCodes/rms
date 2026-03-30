import fs from 'fs';
import path from 'path';

async function testUpload() {
    // 1. Login to get token
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    if (!loginData.token) {
        console.error('Login failed:', loginData);
        return;
    }
    console.log('Login successful. Token:', loginData.token.substring(0, 10) + '...');

    // 2. Upload Logo
    const filePath = 'd:\\tractly\\admin_features_test_1773038799631.webp';
    const fileData = fs.readFileSync(filePath);
    
    // Create multipart/form-data manually or use fetch standard behavior
    // With fetch in Node 18+, we can use FormData and File or Blob
    const formData = new FormData();
    const blob = new Blob([fileData], { type: 'image/webp' });
    formData.append('logo', blob, 'admin_features_test_1773038799631.webp');

    console.log('Uploading logo...');
    const uploadRes = await fetch('http://localhost:3001/api/settings/upload-logo', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${loginData.token}`
        },
        body: formData
    });
    
    if (uploadRes.ok) {
        const result = await uploadRes.json();
        console.log('Upload successful!', result);
    } else {
        const errorText = await uploadRes.text();
        console.error('Upload failed!', uploadRes.status, errorText);
    }
}

testUpload().catch(console.error);
