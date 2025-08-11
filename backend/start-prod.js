const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting Owu Palace HRMS Backend...');

// Function to run command and return promise
function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`📋 ${description}...`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ ${description} failed:`, error.message);
        reject(error);
      } else {
        console.log(`✅ ${description} completed`);
        if (stdout) console.log(stdout);
        resolve(stdout);
      }
    });
  });
}

async function startServer() {
  try {
    // Step 1: Run database migrations
    await runCommand('npx prisma migrate deploy', 'Database migrations');
    
    // Step 2: Try to seed database (don't fail if it errors)
    try {
      await runCommand('node seed.js', 'Database seeding');
    } catch (seedError) {
      console.log('⚠️ Database seeding failed, but continuing with server startup...');
      console.log('This is normal if data already exists.');
    }
    
    // Step 3: Start the server
    console.log('🌟 Starting the main server...');
    require('./dist/index.js');
    
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

startServer();