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
} else {
  console.log('⚠ db/ directory does not exist');
}

