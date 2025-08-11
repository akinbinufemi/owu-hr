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
    // Step 1: Generate Prisma client first
    await runCommand('npx prisma generate', 'Prisma client generation');
    
    // Step 2: Try database migrations with retry logic
    let migrationSuccess = false;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!migrationSuccess && attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`📋 Database migrations (attempt ${attempts}/${maxAttempts})...`);
        // Use direct connection for migrations if available
        const migrationCommand = process.env.DIRECT_DATABASE_URL 
          ? `DATABASE_URL="${process.env.DIRECT_DATABASE_URL}" npx prisma migrate deploy --skip-generate`
          : 'npx prisma migrate deploy --skip-generate';
        await runCommand(migrationCommand, 'Database migrations');
        migrationSuccess = true;
      } catch (migrationError) {
        console.log(`⚠️ Migration attempt ${attempts} failed:`, migrationError.message);
        if (attempts < maxAttempts) {
          console.log('🔄 Retrying in 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          console.log('⚠️ All migration attempts failed, but continuing with server startup...');
          console.log('The database schema might already be up to date.');
          console.log('If you encounter database errors, the schema may need manual migration.');
        }
      }
    }
    
    // Step 3: Try to seed database (don't fail if it errors)
    try {
      await runCommand('node seed.js', 'Database seeding');
    } catch (seedError) {
      console.log('⚠️ Database seeding failed, but continuing with server startup...');
      console.log('This is normal if data already exists.');
    }
    
    // Step 4: Start the server
    console.log('🌟 Starting the main server...');
    require('./dist/index.js');
    
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

startServer();