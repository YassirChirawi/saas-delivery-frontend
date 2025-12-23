const fs = require('fs');
const { execSync } = require('child_process');

const logFile = 'npm_debug.log';
const log = (msg) => fs.appendFileSync(logFile, msg + '\n');

try {
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

    log('Starting debug script...');
    log(`Current directory: ${process.cwd()}`);
    log(`Node version: ${process.version}`);

    try {
        const npmVersion = execSync('npm --version').toString().trim();
        log(`NPM version: ${npmVersion}`);
    } catch (e) {
        log(`Failed to get NPM version: ${e.message}`);
    }

    log('Attempting to install @types/google.maps...');
    try {
        const output = execSync('npm install @types/google.maps --save-dev', { encoding: 'utf8', stdio: 'pipe' });
        log('Install output:');
        log(output);
    } catch (e) {
        log('Install failed!');
        log(`Error message: ${e.message}`);
        if (e.stdout) log(`Stdout: ${e.stdout.toString()}`);
        if (e.stderr) log(`Stderr: ${e.stderr.toString()}`);
    }
} catch (err) {
    // Last resort logging
    console.error(err);
}
