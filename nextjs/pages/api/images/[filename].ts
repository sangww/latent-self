import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

// Dynamic route: [filename] captures the actual filename from URL
// Example: /api/images/2025-10-26-215555.png → filename = "2025-10-26-215555.png"
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const filename = req.query.filename as string;
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
      return res.status(404).json({ error: 'File not found' });
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    
    // Determine content type
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
    
    // Set headers and send file buffer
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(fileBuffer);
  } catch (error) {
    console.error('Error serving image:', error);
    return res.status(500).json({ error: 'Failed to serve image' });
  }
}

