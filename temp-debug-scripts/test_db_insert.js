/**
 * Direct database insert test to isolate the duration_seconds NULL issue
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Construct Supabase URL from project ID
const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Has anon key:', !!supabaseAnonKey);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDirectInsert() {
  console.log('🧪 DIRECT DATABASE INSERT TEST');
  console.log('==============================');
  
  const testUserId = `test-user-${Date.now()}`;
  const testDuration = 25.75;
  
  console.log(`Testing with userId: ${testUserId}`);
  console.log(`Testing with duration: ${testDuration} (type: ${typeof testDuration})`);
  
  try {
    // First, insert a test user demographics record
    console.log('\n1️⃣ Inserting test demographics...');
    const { data: demoData, error: demoError } = await supabase
      .from('user_demographics')
      .insert({
        uid: testUserId,
        age: '25-34',
        gender: 'test',
        race: 'test',
        ethnicity: 'test',
        nationality: 'test'
      })
      .select('uid')
      .single();
    
    if (demoError) {
      console.error('❌ Demo insert failed:', demoError);
      return;
    }
    
    console.log('✅ Demographics inserted:', demoData);
    
    // Now test different duration formats
    const testCases = [
      { label: 'Number', duration: 25.75 },
      { label: 'String number', duration: '25.75' },
      { label: 'Integer', duration: 30 },
      { label: 'String integer', duration: '30' },
      { label: 'Decimal precision', duration: 123.456789 }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n2️⃣ Testing ${testCase.label}: ${testCase.duration} (${typeof testCase.duration})`);
      
      const insertData = {
        user_uid: testUserId,
        experiment_id: null,
        video_path: `test_path_${Date.now()}.webm`,
        video_url: `test_url_${Date.now()}`,
        duration_seconds: testCase.duration
      };
      
      console.log('Insert data:', JSON.stringify(insertData, null, 2));
      
      const { data: webcaptureData, error: webcaptureError } = await supabase
        .from('user_webcapture')
        .insert(insertData)
        .select('capture_id, duration_seconds')
        .single();
      
      if (webcaptureError) {
        console.error(`❌ Webcapture insert failed for ${testCase.label}:`, webcaptureError);
        continue;
      }
      
      console.log(`✅ Webcapture inserted:`, webcaptureData);
      
      // Verify the stored duration
      const storedDuration = webcaptureData.duration_seconds;
      const isNull = storedDuration === null;
      const matches = storedDuration === testCase.duration;
      
      console.log(`📊 Verification:`);
      console.log(`   Sent: ${testCase.duration} (${typeof testCase.duration})`);
      console.log(`   Stored: ${storedDuration} (${typeof storedDuration})`);
      console.log(`   Is NULL: ${isNull}`);
      console.log(`   Matches: ${matches}`);
      
      if (isNull) {
        console.log(`❌ FOUND THE ISSUE: ${testCase.label} resulted in NULL storage!`);
      } else {
        console.log(`✅ SUCCESS: ${testCase.label} stored correctly`);
      }
    }
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('user_webcapture').delete().eq('user_uid', testUserId);
    await supabase.from('user_demographics').delete().eq('uid', testUserId);
    console.log('✅ Cleanup completed');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testDirectInsert().then(() => {
  console.log('\n🏁 Database insert test completed');
}).catch(console.error);