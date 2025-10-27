const fs = require('fs');
const path = require('path');

// Copy db folder to public/db for static exports
const dbDir = path.join(process.cwd(), 'db');
const publicDbDir = path.join(process.cwd(), 'public', 'db');

if (fs.existsSync(dbDir)) {
  // Create public/db if it doesn't exist
  if (!fs.existsSync(publicDbDir)) {
    fs.mkdirSync(publicDbDir, { recursive: true });
  }
  
  // Copy all files from db to public/db
  const files = fs.readdirSync(dbDir);
  files.forEach(file => {
    const sourcePath = path.join(dbDir, file);
    const destPath = path.join(publicDbDir, file);
    
    if (fs.statSync(sourcePath).isFile()) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✓ Copied ${file} to public/db/`);
    }
  });
  
  console.log(`✓ Copied ${files.length} file(s) from db/ to public/db/`);
  
  // Generate posts.json from the copied files
  generatePostsJson(publicDbDir);
} else {
  console.log('⚠ db/ directory does not exist');
}

function generatePostsJson(dbPath) {
  const files = fs.readdirSync(dbPath);
  const images = files.filter(file => file.endsWith('.png'));
  
  const posts = images.map(file => {
    const rawTimestamp = file.replace('.png', '');
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
  });
  
  // Sort by timestamp (newest first)
  posts.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  
  // Write posts.json to public directory
  const postsPath = path.join(process.cwd(), 'public', 'posts.json');
  fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
  console.log(`✓ Generated posts.json with ${posts.length} posts`);
}

