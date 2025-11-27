const http = require('http');
const url = require('url');

// Test Steam OAuth callback simulation
const testSteamCallback = () => {
  console.log('🧪 Testing Steam OAuth callback simulation...\n');

  // Simulate a successful Steam OpenID response
  const testParams = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'id_res',
    'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
    'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561198012345678',
    'openid.identity': 'https://steamcommunity.com/openid/id/76561198012345678',
    'openid.return_to': 'http://localhost:3008/auth/steam/return',
    'openid.response_nonce': '2025-11-25T12:01:00Znonce123',
    'openid.assoc_handle': 'assoc_handle_123',
    'openid.signed': 'signed_params',
    'openid.sig': 'signature123'
  });

  const options = {
    hostname: 'localhost',
    port: 3008,
    path: `/auth/steam/return?${testParams.toString()}`,
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`📡 Status: ${res.statusCode}`);
    console.log(`📡 Headers: ${JSON.stringify(res.headers, null, 2)}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('\n📄 Response body preview:');
      console.log(data.substring(0, 500) + '...');
      console.log('\n✅ Steam OAuth callback test completed!');
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error:', error);
  });

  req.end();
};

// Test direct Steam login redirect
const testSteamLogin = () => {
  console.log('🔗 Testing Steam login redirect...\n');

  const options = {
    hostname: 'localhost',
    port: 3008,
    path: '/auth/steam',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`📡 Status: ${res.statusCode}`);

    if (res.headers.location) {
      console.log(`🔄 Redirect URL: ${res.headers.location}`);

      // Parse the redirect URL to check parameters
      const redirectUrl = new URL(res.headers.location);
      const params = redirectUrl.searchParams;

      console.log('\n📋 Steam OAuth Parameters:');
      console.log(`   realm: ${params.get('openid.realm')}`);
      console.log(`   return_to: ${params.get('openid.return_to')}`);
      console.log(`   mode: ${params.get('openid.mode')}`);

      // Check if realm and return_to match
      const realm = params.get('openid.realm');
      const returnTo = params.get('openid.return_to');

      if (realm && returnTo && realm === returnTo.replace(/\/auth\/steam\/return$/, '')) {
        console.log('✅ Realm and return_to configuration is CORRECT!');
      } else {
        console.log('❌ Realm and return_to configuration is INCORRECT!');
        console.log(`   Expected realm to match return_to domain`);
      }
    }
  });

  req.on('error', (error) => {
    console.error('❌ Error:', error);
  });

  req.end();
};

console.log('🚀 Starting Steam Authentication System Test\n');
console.log('=============================================\n');

// Run tests
testSteamLogin();

// Wait a bit then test callback
setTimeout(() => {
  console.log('\n' + '='.repeat(50) + '\n');
  testSteamCallback();
}, 2000);