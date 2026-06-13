/**
 * Configuration Validator
 * Validates environment variables and critical settings
 */

const requiredVars = [
  'STEAM_API_KEY',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'JWT_SECRET',
  'BOT_ACCOUNT_NAME',
  'BOT_PASSWORD'
];

function validate() {
  const errors = [];

  // Check for missing variables
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });

  // Check for default Steam API Key (from example)
  if (process.env.STEAM_API_KEY === 'your_steam_api_key_here') {
    errors.push('STEAM_API_KEY is using the default placeholder value');
  }

  // Check for default passwords
  if (process.env.POSTGRES_PASSWORD === 'your_password_here' || process.env.POSTGRES_PASSWORD === 'changeme') {
    // In production, this should be a hard error. In dev/test, maybe just a warning.
    // But for this validator, let's be strict if NODE_ENV is production.
    if (process.env.NODE_ENV === 'production') {
      errors.push('Database password cannot be default or "changeme" in production');
    }
  }

  // Check for localhost URLs in production
  if (process.env.NODE_ENV === 'production') {
    const urlVars = ['STEAM_RETURN_URL', 'STEAM_REALM', 'CORS_ORIGIN', 'FRONTEND_URL'];
    urlVars.forEach(varName => {
      const value = process.env[varName];
      if (value && (value.includes('localhost') || value.includes('127.0.0.1'))) {
        errors.push(`${varName} contains localhost/127.0.0.1 in production: ${value}`);
      }
    });
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return true;
}

// Execute validation immediately on import
validate();

module.exports = { validate };
