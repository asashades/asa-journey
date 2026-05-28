import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// R2 Client for server-side operations
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType, fileKey, userId } = await request.json();

    if (!fileKey || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const extension = fileName?.split('.').pop() || 'jpg';
    const key = fileKey || `${fileType}/${userId}/${uuidv4()}.${extension}`;

    // Generate presigned URL for direct upload
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

    // Generate public URL for the file
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL
      ? `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`
      : `https://pub-${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev/${key}`;

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      fileKey: key,
    });
  } catch (error) {
    console.error('R2 upload error:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
