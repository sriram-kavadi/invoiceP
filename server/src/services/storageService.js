import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const BUCKET_NAME = 'business-assets';

// Infer Supabase URL from DATABASE_URL if SUPABASE_URL is not explicitly set
function getSupabaseUrl() {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
  const dbUrl = process.env.DATABASE_URL || '';
  const match = dbUrl.match(/postgres\.([a-zA-Z0-9]+):/);
  if (match && match[1]) {
    return `https://${match[1]}.supabase.co`;
  }
  return 'https://bekbdyvoodydenjhnord.supabase.co';
}

function getSupabaseClient() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * Uploads a business UPI QR image directly to Supabase Storage.
 *
 * @param {Object} params
 * @param {string} params.businessId
 * @param {Buffer} params.buffer
 * @param {string} params.mimetype
 * @param {string} params.originalname
 * @returns {Promise<{ storagePath: string, publicUrl: string }>}
 */
export async function uploadBusinessQr({ businessId, buffer, mimetype, originalname }) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty file buffer provided');
  }

  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (!allowedTypes.includes(mimetype.toLowerCase())) {
    throw new Error('Invalid file type. Only PNG, JPG, and JPEG images are supported.');
  }

  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (buffer.length > maxSize) {
    throw new Error('File size exceeds 5MB limit. Please upload a smaller image.');
  }

  const ext = (path.extname(originalname) || '.png').toLowerCase();
  const filename = `qr-${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
  const storagePath = `qr-codes/${businessId}/${filename}`;

  const supabase = getSupabaseClient();

  if (supabase) {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error('[StorageService] Supabase upload failed:', uploadError);
      throw new Error(`Failed to upload to Supabase Storage: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    return {
      storagePath,
      publicUrl: data.publicUrl,
    };
  }

  // Resilient fallback if Supabase credentials are not configured in environment:
  // Stores as Base64 Data URL directly so functionality works without crashing or local disk dependencies
  console.warn('[StorageService] SUPABASE_SERVICE_ROLE_KEY not configured. Falling back to Data URL storage.');
  const base64Data = `data:${mimetype};base64,${buffer.toString('base64')}`;
  return {
    storagePath: base64Data,
    publicUrl: base64Data,
  };
}

/**
 * Deletes a business QR image from Supabase Storage.
 *
 * @param {string} qrPath
 * @returns {Promise<boolean>}
 */
export async function deleteBusinessQr(qrPath) {
  if (!qrPath) return false;

  const supabase = getSupabaseClient();
  if (!supabase) return false;

  let objectKey = null;

  if (qrPath.startsWith('qr-codes/')) {
    objectKey = qrPath;
  } else if (qrPath.includes(`/${BUCKET_NAME}/`)) {
    const parts = qrPath.split(`/${BUCKET_NAME}/`);
    if (parts[1]) {
      objectKey = parts[1].split('?')[0];
    }
  }

  if (objectKey) {
    try {
      const { error } = await supabase.storage.from(BUCKET_NAME).remove([objectKey]);
      if (error) {
        console.warn('[StorageService] Could not remove object from Supabase Storage:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[StorageService] Error during Supabase remove:', err.message);
      return false;
    }
  }

  return false;
}

/**
 * Retrieves the QR image as a base64 Data URL suitable for Puppeteer PDF embedding.
 *
 * @param {string} qrPath
 * @returns {Promise<string|null>}
 */
export async function getQrDataUrl(qrPath) {
  if (!qrPath) return null;

  // 1. Direct Base64 Data URL
  if (qrPath.startsWith('data:image/')) {
    return qrPath;
  }

  // 2. HTTP/HTTPS URL
  if (qrPath.startsWith('http://') || qrPath.startsWith('https://')) {
    try {
      const response = await fetch(qrPath);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/png';
      return `data:${contentType};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
    } catch (err) {
      console.warn('[StorageService] Failed to fetch QR from URL:', err.message);
      return null;
    }
  }

  // 3. Supabase object path (e.g. qr-codes/...)
  const supabase = getSupabaseClient();
  if (supabase && qrPath.startsWith('qr-codes/')) {
    try {
      const { data, error } = await supabase.storage.from(BUCKET_NAME).download(qrPath);
      if (!error && data) {
        const arrayBuffer = await data.arrayBuffer();
        const ext = path.extname(qrPath).toLowerCase().replace('.', '') || 'png';
        const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
        return `data:${mime};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
      }
    } catch (err) {
      console.warn('[StorageService] Failed to download QR from Supabase Storage:', err.message);
    }
  }

  // 4. Local disk fallback (for backward compatibility in local dev)
  try {
    const candidates = [
      path.resolve(process.cwd(), qrPath),
      path.resolve(process.cwd(), 'server', qrPath),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const ext = path.extname(p).toLowerCase().replace('.', '') || 'png';
        const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
        const fileBuf = fs.readFileSync(p);
        return `data:${mime};base64,${fileBuf.toString('base64')}`;
      }
    }
  } catch {}

  return null;
}

export async function uploadBusinessLogo({ businessId, buffer, mimetype, originalname }) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty file buffer provided');
  }

  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  if (!allowedTypes.includes(mimetype.toLowerCase())) {
    throw new Error('Invalid file type. Only JPEG, PNG, WEBP, and SVG images are supported.');
  }

  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (buffer.length > maxSize) {
    throw new Error('File size exceeds 5MB limit. Please upload a smaller image.');
  }

  const ext = (path.extname(originalname) || '.png').toLowerCase();
  const filename = `logo-${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
  const storagePath = `logos/${businessId}/${filename}`;

  const supabase = getSupabaseClient();

  if (supabase) {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error('[StorageService] Supabase logo upload failed:', uploadError);
      throw new Error(`Failed to upload to Supabase Storage: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    return {
      storagePath,
      publicUrl: data.publicUrl,
    };
  }

  const base64Data = `data:${mimetype};base64,${buffer.toString('base64')}`;
  return {
    storagePath: base64Data,
    publicUrl: base64Data,
  };
}

export default {
  uploadBusinessQr,
  deleteBusinessQr,
  getQrDataUrl,
  uploadBusinessLogo,
};
