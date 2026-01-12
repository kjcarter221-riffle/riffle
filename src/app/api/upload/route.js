import { NextResponse } from 'next/server';
import { getCurrentUser, isPro } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Please log in to upload photos' }, { status: 401 });
    }

    // Rate limit uploads
    const rateCheck = checkRateLimit(`upload:${user.id}`, { maxRequests: 20, windowMs: 60 * 60 * 1000 });
    if (!rateCheck.success) {
      return NextResponse.json({ error: 'Upload limit reached. Try again later.' }, { status: 429 });
    }

    // Pro users get more uploads
    const maxPhotos = isPro(user) ? 10 : 3;

    const formData = await request.formData();
    const files = formData.getAll('files');

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > maxPhotos) {
      return NextResponse.json({
        error: `Maximum ${maxPhotos} photos allowed${!isPro(user) ? ' (upgrade to Pro for more)' : ''}`
      }, { status: 400 });
    }

    const uploadedUrls = [];

    // Check if Vercel Blob is configured
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import('@vercel/blob');

      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          continue;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          continue;
        }

        const filename = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        const blob = await put(filename, file, {
          access: 'public',
          addRandomSuffix: true
        });

        uploadedUrls.push({
          url: blob.url,
          filename: file.name,
          size: file.size
        });
      }
    } else {
      // Fallback: Convert to base64 data URLs (for development/testing)
      // Note: This stores images in the database which isn't ideal for production
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 2 * 1024 * 1024) continue; // 2MB limit for base64

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;

        uploadedUrls.push({
          url: dataUrl,
          filename: file.name,
          size: file.size
        });
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json({
        error: 'No valid images uploaded. Please use JPG, PNG, or WebP under 5MB.'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      photos: uploadedUrls,
      message: `${uploadedUrls.length} photo${uploadedUrls.length > 1 ? 's' : ''} uploaded`
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
