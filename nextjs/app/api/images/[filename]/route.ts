import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Dynamic route: [filename] captures the actual filename from URL
// Example: /api/images/2025-10-26-215555.png → filename = "2025-10-26-215555.png"
export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params; // Extract filename from URL
    console.log('📷 Image request for:', filename);
    
    // Try public/db first (for static exports), then db (for server mode)
    const publicDbPath = path.join(process.cwd(), 'public', 'db', filename);
    const dbPath = path.join(process.cwd(), 'db', filename);
    
    console.log('📁 Checking paths:');
    console.log('  public/db:', publicDbPath, fs.existsSync(publicDbPath));
    console.log('  db:', dbPath, fs.existsSync(dbPath));
    
    let filePath: string | null = null;
    
    // Check if file exists in public/db (static mode)
    if (fs.existsSync(publicDbPath)) {
      filePath = publicDbPath;
      console.log('✅ Using public/db');
    } 
    // Check if file exists in db (server mode)
    else if (fs.existsSync(dbPath)) {
      filePath = dbPath;
      console.log('✅ Using db');
    }
    
    if (!filePath) {
      console.log('❌ File not found in either location');
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    
    // Determine content type
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 });
  }
}

