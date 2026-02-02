// generate-samples-manifest.js
// Run this script whenever you add/remove sample images
// Usage: node generate-samples-manifest.js

const fs = require('fs');
const path = require('path');

const samplesDir = path.join(__dirname, 'public', 'commission', 'samples');
const manifestPath = path.join(samplesDir, 'manifest.json');

// Create samples directory if it doesn't exist
if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
  // Log creation in English to avoid unicode issues
  console.log('Created public/commission/samples directory');
}

// Read all files in samples directory
const files = fs.readdirSync(samplesDir)
  .filter(file => {
    // Added .webp to the allowed extensions
    const ext = path.extname(file).toLowerCase();
    return ['.webp', '.png', '.jpg', '.jpeg'].includes(ext) && file !== 'manifest.json';
  })
  .sort();

// Create manifest
const manifest = {
  generated: new Date().toISOString(),
  files: files
};

// Write manifest
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

// Log results in English
console.log(`✅ Generated manifest with ${files.length} files:`);
files.forEach(file => console.log(`   - ${file}`));
console.log(`\n📄 Manifest saved to: ${manifestPath}`);