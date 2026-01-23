// Entry point for Railway deployment
console.log('🔧 Loading server via wrapper...');
try {
    require('./src/index.js');
} catch (error) {
    console.error('❌ Failed to load src/index.js:', error);
    process.exit(1);
}
