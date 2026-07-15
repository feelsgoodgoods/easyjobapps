import fs from 'fs';
import path from 'path';

// Define the manifest path
const manifestPath = './manifest.json';

// Load and parse the manifest file
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

// Define the base output directory
const outputDir = './output';

// Recreate the packaged output so stale files from older manifests cannot linger.
if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
}
fs.mkdirSync(outputDir, { recursive: true });

// Helper function to copy files while preserving folder structure
function copyFileWithStructure(srcPath, destPath) {
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(srcPath, destPath);
}

// Helper function to recursively copy a directory
function copyDirectoryRecursive(srcDir, destDir) {
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);

        if (entry.isDirectory()) {
            copyDirectoryRecursive(srcPath, destPath);
        } else {
            copyFileWithStructure(srcPath, destPath);
        }
    }
}

// Function to process files from the manifest
function processManifest() {
    // Copy icons
    if (manifest.icons) {
        for (const size in manifest.icons) {
            const srcPath = path.join('./', manifest.icons[size]);
            const destPath = path.join(outputDir, manifest.icons[size]);
            copyFileWithStructure(srcPath, destPath);
        }
    }

    // Copy side panel path
    if (manifest.side_panel && manifest.side_panel.default_path) {
        const srcPath = path.join('./', manifest.side_panel.default_path);
        const destPath = path.join(outputDir, manifest.side_panel.default_path);
        copyFileWithStructure(srcPath, destPath);
    }

    // Copy background service worker
    if (manifest.background && manifest.background.service_worker) {
        const srcPath = path.join('./', manifest.background.service_worker);
        const destPath = path.join(outputDir, manifest.background.service_worker);
        copyFileWithStructure(srcPath, destPath);
    }

    // Copy content scripts
    if (manifest.content_scripts) {
        manifest.content_scripts.forEach(script => {
            if (script.js) {
                script.js.forEach(jsFile => {
                    const srcPath = path.join('./', jsFile);
                    const destPath = path.join(outputDir, jsFile);
                    copyFileWithStructure(srcPath, destPath);
                });
            }
        });
    }

    // Copy host permissions if applicable
    if (manifest.host_permissions) {
        manifest.host_permissions.forEach(host => {
            const srcPath = path.join('./', host);
            const destPath = path.join(outputDir, host);
            if (fs.existsSync(srcPath)) {
                copyFileWithStructure(srcPath, destPath);
            }
        });
    }

    // Copy the manifest itself
    copyFileWithStructure(manifestPath, path.join(outputDir, 'manifest.json'));

    // Copy the entire dist directory
    const distDir = './dist';
    const distOutputDir = path.join(outputDir, 'dist');
    if (fs.existsSync(distDir)) {
        copyDirectoryRecursive(distDir, distOutputDir);
    } else {
        console.warn('Dist directory not found, skipping.');
    }
}

// Start the process
processManifest();

console.log('Files copied successfully.');
