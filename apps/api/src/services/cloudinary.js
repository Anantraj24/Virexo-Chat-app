import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export const uploadStream = (buffer, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    // Check if keys exist
    if (!env.CLOUDINARY_CLOUD_NAME && env.isTest) {
      // Mocked return for tests
      return resolve({
        secure_url: `https://res.cloudinary.com/demo/${resourceType}/upload/v1234/test_file`,
        public_id: `test_file_${Date.now()}`,
        resource_type: resourceType,
        bytes: buffer.length,
        duration: resourceType === 'video' ? 5.5 : undefined,
      });
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: 'virexo_media',
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

export const deleteResource = (publicId, resourceType = 'image') => {
  return new Promise((resolve, reject) => {
    if (!env.CLOUDINARY_CLOUD_NAME && env.isTest) {
      return resolve({ result: 'ok' });
    }

    cloudinary.uploader.destroy(
      publicId,
      { resource_type: resourceType },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );
  });
};
