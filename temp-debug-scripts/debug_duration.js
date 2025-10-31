#!/usr/bin/env node

/**
 * Debug script to test duration storage directly
 * This will help identify where the NULL issue is occurring
 */

const DEBUG_USER_ID = 'debug-test-' + Date.now();
const DEBUG_DURATION = 25.75; // Test duration

console.log('🔍 DURATION STORAGE DEBUG');
console.log('========================');
console.log(`Testing with userId: ${DEBUG_USER_ID}`);
console.log(`Testing with duration: ${DEBUG_DURATION}`);

async function testDurationStorage() {
  try {
    // First, let's test if we can make a direct API call
    const formData = new FormData();
    formData.append('video', new Blob(['fake video data'], { type: 'video/webm' }), `debug_${DEBUG_USER_ID}.webm`);
    formData.append('userId', DEBUG_USER_ID);
    formData.append('duration', DEBUG_DURATION.toString());
    
    console.log('\n📤 Testing video upload API...');
    console.log('FormData contents:');
    for (const [key, value] of formData.entries()) {
      if (key === 'video') {
        console.log(`  ${key}: [Blob, size: ${value.size}]`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
    
    const response = await fetch('http://localhost:5173/server/upload-webcam', {
      method: 'POST',
      body: formData
    });
    
    console.log(`\n📊 Response status: ${response.status}`);
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Upload API call succeeded');
      
      // Try to parse the response to get the capture ID
      try {
        const result = JSON.parse(responseText);
        if (result.captureId) {
          console.log(`📋 Capture ID: ${result.captureId}`);
          
          // Now check if the duration was actually stored
          console.log('\n🔍 Checking stored data...');
          // This would require direct database access or another API call
        }
      } catch (parseError) {
        console.log('⚠️ Could not parse response JSON:', parseError.message);
      }
    } else {
      console.log('❌ Upload failed');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test
testDurationStorage().then(() => {
  console.log('\n🏁 Debug test completed');
}).catch(console.error);