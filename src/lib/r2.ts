import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// R2 Client configuration
const r2Config = {
  region: 'auto',
  endpoint: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
};

const r2Client = new S3Client(r2Config);
const BUCKET_NAME = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET!;

// Generate R2 public URL
export function getR2PublicUrl(key: string): string {
  const customDomain = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL;
  if (customDomain) {
    return `${customDomain}/${key}`;
  }
  // Fallback to R2 public URL
  return `https://pub-${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID!}.r2.dev/${key}`;
}

// Generate signed URL for upload (server-side only)
export async function generateUploadUrl(
  userId: string,
  fileType: 'image' | 'audio',
  contentType: string
): Promise<{ uploadUrl: string; fileKey: string; publicUrl: string }> {
  const extension = contentType.split('/')[1];
  const fileKey = `${fileType}/${userId}/${uuidv4()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 }); // 1 hour
  const publicUrl = getR2PublicUrl(fileKey);

  return { uploadUrl, fileKey, publicUrl };
}

// Generate signed URL for download
export async function generateDownloadUrl(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  return getSignedUrl(r2Client, command, { expiresIn: 86400 }); // 24 hours
}

// Delete file from R2
export async function deleteFile(fileKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  await r2Client.send(command);
}

// Presigned URL utilities for client-side upload (no server action needed)
// Using Cloudflare's pre-signed URL approach

export type UploadResult = {
  success: boolean;
  fileKey?: string;
  publicUrl?: string;
  error?: string;
};

export async function uploadFile(
  file: File,
  userId: string,
  type: 'image' | 'audio'
): Promise<UploadResult> {
  try {
    const extension = file.name.split('.').pop() || 'jpg';
    const fileKey = `${type}/${userId}/${uuidv4()}.${extension}`;
    const publicUrl = getR2PublicUrl(fileKey);

    // For R2 with public access, we can use direct upload
    // But for authenticated uploads, we need a signed URL
    const uploadEndpoint = `/api/r2/upload`;

    const response = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileKey,
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get upload URL');
    }

    const { uploadUrl, publicUrl: signedPublicUrl } = await response.json();

    // Upload to R2 using signed URL
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Upload failed');
    }

    return {
      success: true,
      fileKey,
      publicUrl: signedPublicUrl,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}
