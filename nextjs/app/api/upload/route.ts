import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }
    
    // Get metadata
    const timestamp = formData.get('timestamp') as string || new Date().toISOString();
    const prompt = formData.get('prompt') as string || 'No prompt available';
    const story = formData.get('story') as string || '';
    const type = formData.get('type') as string || 'generated';
    
    // Generate filename with timestamp
    const timestampStr = timestamp.replace(/[:.]/g, '-');
    const originalName = file.name;
    // If originalName is just an extension like ".png", use just timestamp + extension
    const filename = originalName.startsWith('.') 
      ? `${timestampStr}${originalName}` 
      : `${timestampStr}-${originalName}`;
    
    // Ensure db directory exists
    const dbDir = path.join(process.cwd(), 'db');
    await mkdir(dbDir, { recursive: true });
    
    // Save image
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const imagePath = path.join(dbDir, filename);
    await writeFile(imagePath, buffer);
    
    // Save prompt
    const promptPath = path.join(dbDir, filename.replace('.png', '.txt'));
    await writeFile(promptPath, `${prompt}\n${type}`, 'utf8');
    
    // Save story if provided
    if (story) {
      const storyPath = path.join(dbDir, filename.replace('.png', '_story.txt'));
      await writeFile(storyPath, story, 'utf8');
    }
    
    const postData = {
      id: filename,
      timestamp,
      prompt,
      story: story || '',
      filename,
      type,
      likes: 0,
      comments: 0,
      shares: 0,
    };
    
    console.log(`📤 New ${type} post uploaded: ${filename}`);
    
    return NextResponse.json(postData);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

