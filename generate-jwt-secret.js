#!/usr/bin/env node

/**
 * JWT Secret Generator for Owu Palace HRMS
 * 
 * This script generates a cryptographically secure JWT secret
 * suitable for production use.
 */

const crypto = require('crypto');

function generateJWTSecret() {
  // Generate 64 random bytes and convert to hex (128 characters)
  const secret = crypto.randomBytes(64).toString('hex');
  
  console.log('🔐 Generated JWT Secret for Owu Palace HRMS');
  console.log('=' .repeat(60));
  console.log('');
  console.log('JWT_SECRET=' + secret);
  console.log('');
  console.log('📋 Instructions:');
  console.log('1. Copy the JWT_SECRET line above');
  console.log('2. Update your backend/.env file (for local development)');
  console.log('3. Update your Render environment variables (for production)');
  console.log('4. Never commit this secret to Git!');
  console.log('');
  console.log('⚠️  Note: Changing JWT_SECRET will invalidate all existing tokens');
  console.log('   Users will need to log in again (this is normal)');
  console.log('');
  console.log('🔒 Secret Length:', secret.length, 'characters');
  console.log('✅ Cryptographically secure: Yes');
}

// Generate and display the secret
generateJWTSecret();