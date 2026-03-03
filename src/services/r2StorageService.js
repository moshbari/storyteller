const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// R2 is S3-compatible, so we use the AWS SDK
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

const BUCKET = process.env.R2_BUCKET_NAME || 'storyteller-images';
const PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g. https://pub-xxx.r2.dev

/**
 * Upload a buffer (image) to R2
 * @param {Buffer} buffer - The image data
 * @param {string} key - The storage path, e.g. "direct/userId/bookId/page-1.png"
 * @param {string} contentType - e.g. "image/png"
 * @returns {string} The public URL of the uploaded image
 */
async function uploadImage(buffer, key, contentType = 'image/png') {
  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType
    }));

    const publicUrl = PUBLIC_URL + '/' + key;
    console.log('  ☁️  R2 uploaded:', key, '(' + (buffer.length / 1024).toFixed(1) + ' KB)');
    return publicUrl;
  } catch (error) {
    console.log('  ❌ R2 upload failed:', error.message);
    throw error;
  }
}

/**
 * Upload a base64-encoded image to R2
 * @param {string} base64Data - Base64-encoded image data
 * @param {string} key - The storage path
 * @returns {string} The public URL
 */
async function uploadBase64Image(base64Data, key) {
  const buffer = Buffer.from(base64Data, 'base64');
  return uploadImage(buffer, key, 'image/png');
}

/**
 * Download an image from a URL and upload it to R2
 * (Used for Flux/Replicate images that give temporary URLs)
 * @param {string} imageUrl - The temporary image URL
 * @param {string} key - The storage path
 * @returns {string} The permanent R2 public URL
 */
async function uploadFromUrl(imageUrl, key) {
  const axios = require('axios');
  try {
    const response = await axios.get(imageUrl, { 
      responseType: 'arraybuffer', 
      timeout: 30000 
    });
    const buffer = Buffer.from(response.data);
    return uploadImage(buffer, key, 'image/png');
  } catch (error) {
    console.log('  ❌ R2 download+upload failed:', error.message);
    throw error;
  }
}

/**
 * Delete an image from R2
 * @param {string} key - The storage path to delete
 */
async function deleteImage(key) {
  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key
    }));
    console.log('  🗑️  R2 deleted:', key);
  } catch (error) {
    console.log('  ❌ R2 delete failed:', error.message);
  }
}

/**
 * Build the storage key path based on user type
 * @param {string} userId - The user ID
 * @param {string} bookId - The book ID
 * @param {string} fileName - e.g. "page-1.png"
 * @param {string} whitelabelId - Optional: the white-label customer ID
 * @returns {string} The full key path
 */
function buildKey(userId, bookId, fileName, whitelabelId = null) {
  if (whitelabelId) {
    return 'whitelabel/' + whitelabelId + '/' + userId + '/' + bookId + '/' + fileName;
  }
  return 'direct/' + userId + '/' + bookId + '/' + fileName;
}

module.exports = { 
  uploadImage, 
  uploadBase64Image, 
  uploadFromUrl, 
  deleteImage, 
  buildKey 
};
