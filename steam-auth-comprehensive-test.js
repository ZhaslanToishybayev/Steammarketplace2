const http = require('http');
const url = require('url');

// Comprehensive Steam OAuth Test Suite
console.log('🧪 COMPREHENSIVE STEAM AUTHENTICATION TEST SUITE');
console.log('================================================\n');

// Test configuration
const STEAM_AUTH_SERVICE = 'localhost:3011';

// Test results tracking
let testResults = [];

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${name}`);
  if (details) console.log(`   ${details}`);
  testResults.push({ name, passed, details });
}

function runTest(testName, testFn) {
  try {
    const result = testFn();
    logTest(testName, result.passed, result.details || '');
  } catch (error) {
    logTest(testName, false, `Error: ${error.message}`);
  }
}

// Test 1: Health Check
runTest('Health Check', () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3011,
      path: '/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);

      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          const passed = res.statusCode === 200 && health.status === 'healthy';
          resolve({ passed, details: `Status: ${res.statusCode}, Service: ${health.service}` });
        } catch (e) {
          resolve({ passed: false, details: 'Invalid JSON response' });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ passed: false, details: error.message });
    });

    req.end();
  });
});

// Test 2: Steam Login Redirect
runTest('Steam Login Redirect', () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3011,
      path: '/auth/steam',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      const redirectUrl = res.headers.location;
      const passed = res.statusCode === 302 && redirectUrl && redirectUrl.includes('steamcommunity.com/openid/login');
      resolve({
        passed,
        details: `Status: ${res.statusCode}, Redirect: ${redirectUrl ? 'YES' : 'NO'}`
      });
    });

    req.on('error', (error) => {
      resolve({ passed: false, details: error.message });
    });

    req.end();
  });
});

// Test 3: Steam Callback with Success
runTest('Steam Callback - Success', () => {
  return new Promise((resolve) => {
    const testParams = new URLSearchParams({
      'openid.mode': 'id_res',
      'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561198012345678'
    });

    const options = {
      hostname: 'localhost',
      port: 3011,
      path: `/auth/steam/return?${testParams.toString()}`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);

      res.on('end', () => {
        const passed = res.statusCode === 200 && data.includes('STEAM_AUTH_SUCCESS');
        resolve({
          passed,
          details: `Status: ${res.statusCode}, Contains Success: ${passed}`
        });
      });
    });

    req.on('error', (error) => {
      resolve({ passed: false, details: error.message });
    });

    req.end();
  });
});

// Test 4: Steam Callback with Cancel
runTest('Steam Callback - Cancel', () => {
  return new Promise((resolve) => {
    const testParams = new URLSearchParams({
      'openid.mode': 'cancel'
    });

    const options = {
      hostname: 'localhost',
      port: 3011,
      path: `/auth/steam/return?${testParams.toString()}`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);

      res.on('end', () => {
        const passed = res.statusCode === 401 && data.includes('Authentication failed or cancelled');
        resolve({
          passed,
          details: `Status: ${res.statusCode}, Contains Error: ${passed}`
        });
      });
    });

    req.on('error', (error) => {
      resolve({ passed: false, details: error.message });
    });

    req.end();
  });
});

// Test 5: Get Current User
runTest('Get Current User', () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3011,
      path: '/auth/me',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const passed = res.statusCode === 200;
          resolve({
            passed,
            details: `Status: ${res.statusCode}, Has Data: ${response.data ? 'YES' : 'NO'}`
          });
        } catch (e) {
          resolve({ passed: false, details: 'Invalid JSON response' });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ passed: false, details: error.message });
    });

    req.end();
  });
});

// Test 6: Mock Steam Login Page
runTest('Mock Steam Login Page', () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3011,
      path: '/mock-steam-login',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);

      res.on('end', () => {
        const passed = res.statusCode === 200 && data.includes('Mock Steam Login');
        resolve({
          passed,
          details: `Status: ${res.statusCode}, Contains Mock: ${passed}`
        });
      });
    });

    req.on('error', (error) => {
      resolve({ passed: false, details: error.message });
    });

    req.end();
  });
});

// Test 7: 404 Error Handling
runTest('404 Error Handling', () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3011,
      path: '/nonexistent',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const passed = res.statusCode === 404 && response.error === 'Route not found';
          resolve({
            passed,
            details: `Status: ${res.statusCode}, Error: ${response.error}`
          });
        } catch (e) {
          resolve({ passed: false, details: 'Invalid JSON response' });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ passed: false, details: error.message });
    });

    req.end();
  });
});

// Test 8: CORS Headers
runTest('CORS Headers', () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3011,
      path: '/health',
      method: 'OPTIONS'
    };

    const req = http.request(options, (res) => {
      const hasCors = res.headers['access-control-allow-origin'] === 'http://localhost:3000';
      const passed = hasCors;
      resolve({
        passed,
        details: `CORS Origin: ${res.headers['access-control-allow-origin'] || 'MISSING'}`
      });
    });

    req.on('error', (error) => {
      resolve({ passed: false, details: error.message });
    });

    req.end();
  });
});

// Summary function
function printSummary() {
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  const passedTests = testResults.filter(t => t.passed).length;
  const totalTests = testResults.length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);

  console.log(`\n✅ Passed: ${passedTests}/${totalTests} (${successRate}%)`);

  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! Steam authentication is working correctly.');
    console.log('\n🚀 The Steam OAuth integration is ready for production use!');
  } else {
    console.log('\n⚠️  Some tests failed. Review the failed tests above.');
    const failedTests = testResults.filter(t => !t.passed);
    failedTests.forEach(test => {
      console.log(`   - ${test.name}: ${test.details}`);
    });
  }
}

// Run all tests with delays
let testIndex = 0;
function runNextTest() {
  if (testIndex < testResults.length) {
    setTimeout(() => {
      testIndex++;
      runNextTest();
    }, 200);
  } else {
    setTimeout(printSummary, 1000);
  }
}

setTimeout(runNextTest, 1000);