import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

interface Post {
  id: string;
  timestamp: string;
  prompt: string;
  story?: string;
  filename: string;
  type: string;
  likes: number;
  comments: number;
  shares: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dbPath = path.join(process.cwd(), 'db');
    
    console.log('Posts API - Checking db path:', dbPath);
    
    // Check if db directory exists
    if (!fs.existsSync(dbPath)) {
      console.log('Posts API - db directory not found');
      return res.status(200).json([]);
    }
    
    // Read all files from db directory
    const files = fs.readdirSync(dbPath);
    console.log('Posts API - Found files:', files);
    const images = files.filter(file => file.endsWith('.png'));
    console.log('Posts API - Found images:', images);
    
    // Build posts array
    const posts: Post[] = await Promise.all(
      images.map(async (file) => {
        // Extract timestamp from filename (everything before .png)
        const rawTimestamp = file.replace('.png', '');
        // Convert format from 2025-10-26-215555 to 2025-10-26 21:55:55 (ISO format)
        const parts = rawTimestamp.split('-');
        let timestamp = rawTimestamp;
        if (parts.length >= 4) {
          const datePart = parts.slice(0, 3).join('-');
          const timePart = parts[3];
          if (timePart && timePart.length === 6) {
            const hour = timePart.substring(0, 2);
            const minute = timePart.substring(2, 4);
            const second = timePart.substring(4, 6);
            timestamp = `${datePart} ${hour}:${minute}:${second}`;
          }
        }
        
        const promptFile = file.replace('.png', '.txt');
        
        let prompt = 'No prompt available';
        let type = 'generated';
        
        try {
          const promptPath = path.join(dbPath, promptFile);
          if (fs.existsSync(promptPath)) {
            const content = fs.readFileSync(promptPath, 'utf8');
            const lines = content.split('\n');
            prompt = lines[0] || 'No prompt available';
            if (lines.length > 1) {
              type = lines[1].trim() || 'generated';
            }
          }
        } catch (err) {
          console.error(`Error reading prompt for ${file}:`, err);
        }
        
        // Try to load story
        let story = '';
        try {
          const storyFile = file.replace('.png', '_story.txt');
          const storyPath = path.join(dbPath, storyFile);
          if (fs.existsSync(storyPath)) {
            story = fs.readFileSync(storyPath, 'utf8').trim();
          }
        } catch (err) {
          // Story doesn't exist
        }
        
        return {
          id: file,
          timestamp,
          prompt,
          story,
          filename: file,
          type,
          likes: Math.floor(Math.random() * 50) + 5,
          comments: Math.floor(Math.random() * 10),
          shares: Math.floor(Math.random() * 5),
        };
      })
    );
    
    // Sort by timestamp (newest first)
    posts.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    return res.status(200).json(posts);
  } catch (error) {
    console.error('Error loading posts:', error);
    return res.status(500).json({ error: 'Failed to load posts' });
  }
}

