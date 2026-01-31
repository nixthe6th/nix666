#!/usr/bin/env node
/**
 * YouTube Prep Skill
 * Processes raw footage into upload-ready packages
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Config
const CONFIG = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const INPUT_DIR = process.env.INPUT || CONFIG.input_folder;
const OUTPUT_DIR = CONFIG.output_folder;

// Colors
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(msg, color = C.reset) {
  console.log(`${color}${msg}${C.reset}`);
}

function organizeFile(filePath) {
  const stats = fs.statSync(filePath);
  const date = new Date(stats.mtime);
  const dateStr = date.toISOString().split('T')[0];
  const fileName = path.basename(filePath);
  
  const newName = `${dateStr}_${fileName}`;
  const monthDir = path.join(OUTPUT_DIR, date.toISOString().slice(0, 7));
  
  fs.mkdirSync(monthDir, { recursive: true });
  
  const destPath = path.join(monthDir, newName);
  fs.copyFileSync(filePath, destPath);
  
  log(`✓ Organized: ${newName}`, C.green);
  return destPath;
}

function extractMetadata(filePath) {
  try {
    const output = execSync(`ffprobe -v quiet -print_format json -show_streams "${filePath}"`, {
      encoding: 'utf8',
      timeout: 30000
    });
    return JSON.parse(output);
  } catch (e) {
    return { error: 'Could not extract metadata' };
  }
}

function generateThumbnails(filePath, outputDir) {
  const duration = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, {
    encoding: 'utf8'
  }).trim();
  
  const durationSec = parseFloat(duration);
  const intervals = [0.25, 0.5, 0.75].map(p => durationSec * p);
  
  intervals.forEach((time, i) => {
    const outputFile = path.join(outputDir, `thumbnail_${i + 1}.jpg`);
    try {
      execSync(`ffmpeg -i "${filePath}" -ss ${time} -vframes 1 -q:v 2 "${outputFile}"`, {
        timeout: 10000
      });
      log(`✓ Thumbnail ${i + 1} generated`, C.cyan);
    } catch (e) {
      log(`✗ Thumbnail ${i + 1} failed`, C.yellow);
    }
  });
}

function generateAIContent(metadata) {
  // Placeholder for AI integration
  // Would call Kimi API to generate title/description
  return {
    title: '[AI Title Placeholder]',
    description: '[AI Description Placeholder]',
    tags: ['tag1', 'tag2', 'tag3']
  };
}

function createPackage(filePath, metadata) {
  const baseName = path.basename(filePath, path.extname(filePath));
  const packageDir = path.join(OUTPUT_DIR, 'packages', baseName);
  
  fs.mkdirSync(packageDir, { recursive: true });
  fs.mkdirSync(path.join(packageDir, 'thumbnails'), { recursive: true });
  
  // Copy video
  fs.copyFileSync(filePath, path.join(packageDir, 'video.mp4'));
  
  // Generate thumbnails
  generateThumbnails(filePath, path.join(packageDir, 'thumbnails'));
  
  // Generate AI content
  const aiContent = generateAIContent(metadata);
  
  // Write files
  fs.writeFileSync(path.join(packageDir, 'title.txt'), aiContent.title);
  fs.writeFileSync(path.join(packageDir, 'description.txt'), aiContent.description);
  fs.writeFileSync(path.join(packageDir, 'tags.txt'), aiContent.tags.join(', '));
  fs.writeFileSync(path.join(packageDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  
  log(`✓ Package created: ${packageDir}`, C.green);
  return packageDir;
}

// Main
async function main() {
  log('\n🎬 YouTube Prep Skill\n', C.bright);
  
  const inputPath = process.env.INPUT;
  if (!inputPath) {
    log('Error: No INPUT specified', C.yellow);
    log('Usage: INPUT=/path/to/video node action.js');
    process.exit(1);
  }
  
  if (!fs.existsSync(inputPath)) {
    log(`Error: File not found: ${inputPath}`, C.yellow);
    process.exit(1);
  }
  
  log(`Processing: ${path.basename(inputPath)}\n`);
  
  // Step 1: Organize
  log('Step 1: Organizing...', C.cyan);
  const organizedPath = organizeFile(inputPath);
  
  // Step 2: Extract metadata
  log('\nStep 2: Extracting metadata...', C.cyan);
  const metadata = extractMetadata(organizedPath);
  
  // Step 3: Create package
  log('\nStep 3: Creating upload package...', C.cyan);
  const packageDir = createPackage(organizedPath, metadata);
  
  log(`\n${C.green}✓ Complete!${C.reset}`);
  log(`Package ready: ${packageDir}`);
  log('\nNext steps:');
  log('1. Review title.txt and description.txt');
  log('2. Select thumbnail from thumbnails/');
  log('3. Upload to YouTube Studio');
}

main().catch(err => {
  log(`Error: ${err.message}`, C.yellow);
  process.exit(1);
});
