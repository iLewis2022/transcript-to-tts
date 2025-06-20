// setup-electron.js - Run this to set up Electron in your project
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Electron for Campaign TTS Processor...\n');

// 1. Create assets directory
console.log('📁 Creating assets directory...');
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
}

// 2. Create placeholder icon (you'll replace this with your own)
console.log('🎨 Creating placeholder icon...');
const iconPlaceholder = `
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" fill="#1a1a2e"/>
  <text x="128" y="128" font-family="Arial" font-size="48" fill="#4361ee" text-anchor="middle" dominant-baseline="middle">TTS</text>
</svg>
`;
fs.writeFileSync(path.join(assetsDir, 'icon.svg'), iconPlaceholder);

// 3. Update package.json
console.log('📝 Updating package.json...');
const packagePath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Add Electron-specific fields
packageJson.main = 'main.js';

// Add new scripts
packageJson.scripts = {
    ...packageJson.scripts,
    "electron": "electron .",
    "electron-dev": "set NODE_ENV=development && electron .",
    "build-win": "electron-builder --win",
    "build-mac": "electron-builder --mac",
    "build-linux": "electron-builder --linux",
    "dist": "electron-builder"
};

// Add build configuration
packageJson.build = {
    "appId": "com.campaigntts.processor",
    "productName": "Campaign TTS Processor",
    "directories": {
        "output": "dist"
    },
    "files": [
        "main.js",
        "frontend/**/*",
        "backend/**/*",
        "node_modules/**/*",
        "package.json",
        "!outputs/**/*",
        "!dist/**/*"
    ],
    "win": {
        "target": "nsis",
        "icon": "assets/icon.ico"
    },
    "nsis": {
        "oneClick": false,
        "allowToChangeInstallationDirectory": true,
        "createDesktopShortcut": true,
        "createStartMenuShortcut": true,
        "shortcutName": "Campaign TTS"
    },
    "mac": {
        "target": "dmg",
        "icon": "assets/icon.icns",
        "category": "public.app-category.productivity"
    },
    "linux": {
        "target": "AppImage",
        "icon": "assets/icon.png",
        "category": "Audio"
    }
};

// Write updated package.json
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

// 4. Install Electron dependencies
console.log('\n📦 Installing Electron dependencies...');
console.log('This might take a few minutes...\n');

try {
    execSync('npm install --save-dev electron electron-builder electron-reload', { 
        stdio: 'inherit',
        cwd: __dirname 
    });
} catch (error) {
    console.error('❌ Failed to install dependencies. Please run manually:');
    console.error('npm install --save-dev electron electron-builder electron-reload');
    process.exit(1);
}

// 5. Create .gitignore entries
console.log('\n📄 Updating .gitignore...');
const gitignorePath = path.join(__dirname, '.gitignore');
const gitignoreContent = fs.existsSync(gitignorePath) 
    ? fs.readFileSync(gitignorePath, 'utf8') 
    : '';

const electronIgnores = '\n# Electron\ndist/\n*.log\n';

if (!gitignoreContent.includes('dist/')) {
    fs.appendFileSync(gitignorePath, electronIgnores);
}

console.log('\n✅ Electron setup complete!');
console.log('\n🎮 Next steps:');
console.log('1. Replace assets/icon.svg with your own icon');
console.log('2. Copy main.js from the artifact to your root directory');
console.log('3. Run: npm run electron-dev');
console.log('\n🏗️  To build the app:');
console.log('   Windows: npm run build-win');
console.log('   Mac: npm run build-mac');
console.log('   Linux: npm run build-linux\n');