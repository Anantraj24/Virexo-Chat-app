import { uploadStream } from '../services/cloudinary.js';
import { createApiResponse } from '@virexo/shared';
import { BadRequestError } from '../utils/errors.js';

export async function uploadMedia(req, res, next) {
  try {
    if (!req.file) {
      throw new BadRequestError('No file uploaded');
    }

    const { mimetype, originalname, size, buffer } = req.file;
    let resourceType = 'auto';
    let attachmentType = 'document';

    if (mimetype.startsWith('image/')) {
      resourceType = 'image';
      attachmentType = 'image';
    } else if (mimetype.startsWith('video/')) {
      resourceType = 'video';
      attachmentType = 'video';
    } else if (mimetype.startsWith('audio/')) {
      resourceType = 'video'; // Cloudinary treats audio as video for resource_type
      attachmentType = 'audio';
    } else if (mimetype === 'application/pdf') {
      resourceType = 'image'; // Cloudinary can treat pdf as image (to allow generating thumbnails) or raw. We'll use image for thumbnails.
      attachmentType = 'document';
    }

    const result = await uploadStream(buffer, resourceType);

    const attachment = {
      url: result.secure_url,
      publicId: result.public_id,
      type: attachmentType,
      filename: originalname,
      size: size,
    };

    if (result.duration) {
      attachment.duration = result.duration;
    }

    res.status(201).json(createApiResponse(true, { attachment }));
  } catch (error) {
    next(error);
  }
}
