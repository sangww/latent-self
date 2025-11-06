import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.image) ? files.image[0] : files.image;
    
    if (!file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    // Get metadata
    const timestamp = (Array.isArray(fields.timestamp) ? fields.timestamp[0] : fields.timestamp) as string || new Date().toISOString();
    const type = (Array.isArray(fields.type) ? fields.type[0] : fields.type) as string || 'generated';
    
    // Generate filename with timestamp
    const timestampStr = timestamp.replace(/[:.]/g, '-');
    const originalName = file.originalFilename || 'image.png';
    
    // If originalName is just an extension like ".png", use just timestamp + extension
    const filename = originalName.startsWith('.') 
      ? `${timestampStr}${originalName}` 
      : `${timestampStr}-${originalName}`;
    
    // Ensure db directory exists
    const dbDir = path.join(process.cwd(), 'db');
    await mkdir(dbDir, { recursive: true });
    
    // Save image
    const imageBuffer = await fs.promises.readFile(file.filepath);
    const imagePath = path.join(dbDir, filename);
    await writeFile(imagePath, imageBuffer);
    
    // Handle story - can be either a file or text field
    let story = '';
    const storyFile = Array.isArray(files.story) ? files.story[0] : files.story;
    
    if (storyFile) {
      // Story provided as a file
      const storyBuffer = await fs.promises.readFile(storyFile.filepath);
      const storyPath = path.join(dbDir, filename.replace(/\.png$/, '_story.txt'));
      await writeFile(storyPath, storyBuffer);
      story = storyBuffer.toString('utf8');
    } else {
      // Fallback to text field for backward compatibility
      const storyText = (Array.isArray(fields.story) ? fields.story[0] : fields.story) as string || '';
      if (storyText) {
        const storyPath = path.join(dbDir, filename.replace(/\.png$/, '_story.txt'));
        await writeFile(storyPath, storyText, 'utf8');
        story = storyText;
      }
    }
    
    const postData = {
      id: filename,
      timestamp,
      story: story || '',
      filename,
      type,
      likes: 0,
      comments: 0,
      shares: 0,
    };
    
    console.log(`📤 New ${type} post uploaded: ${filename}`);
    
    return res.status(200).json(postData);
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
}

