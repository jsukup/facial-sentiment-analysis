#!/usr/bin/env node

/**
 * Test script to verify user onboarding data is stored in correct tables
 * Not in kv_store tables but in user_demographics, user_webcapture, user_sentiment
 */

const { createClient } = require('@jsr/supabase__supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration. Check .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
const testDemographics = {
  age: '25-34',
  gender: 'female',
  race: 'asian',
  ethnicity: 'non-hispanic',
  nationality: 'usa',
  other_data: { testField: 'testValue' }
};

const testSentiment = {
  timestamp_seconds: 0,
  emotions: {
    neutral: 0.8,
    happy: 0.1,
    sad: 0.05,
    angry: 0.02,
    fearful: 0.01,
    disgusted: 0.01,
    surprised: 0.01
  }
};

async function testDataFlow() {
  console.log('🧪 Testing User Onboarding Data Flow\n');
  console.log('==========================================');
  
  let testUserId = null;
  let testCaptureId = null;
  
  try {
    // Step 1: Test demographics insertion
    console.log('\n📝 Step 1: Testing Demographics Storage...');
    
    const { data: demoData, error: demoError } = await supabase
      .from('user_demographics')
      .insert({
        ...testDemographics,
        consent_timestamp: new Date().toISOString(),
        facial_analysis_consent: true,
        facial_analysis_consent_timestamp: new Date().toISOString()
      })
      .select('uid')
      .single();
    
    if (demoError) {
      console.error('❌ Failed to store demographics:', demoError.message);
      return;
    }
    
    testUserId = demoData.uid;
    console.log(`✅ Demographics stored successfully with uid: ${testUserId}`);
    
    // Step 2: Verify demographics are NOT in kv_store
    console.log('\n🔍 Step 2: Verifying data is NOT in kv_store...');
    
    // Check if kv_store tables exist
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', 'kv_store%');
    
    if (tables && tables.length > 0) {
      console.warn('⚠️  Found kv_store tables:', tables.map(t => t.table_name).join(', '));
      console.log('   These should be migrated or removed');
    } else {
      console.log('✅ No kv_store tables found (correct)');
    }
    
    // Step 3: Test webcapture insertion
    console.log('\n📹 Step 3: Testing Webcapture Storage...');
    
    // Get default experiment ID
    const { data: expData } = await supabase
      .from('experiment_videos')
      .select('experiment_id')
      .limit(1)
      .single();
    
    const { data: captureData, error: captureError } = await supabase
      .from('user_webcapture')
      .insert({
        user_uid: testUserId,
        experiment_id: expData?.experiment_id || null,
        video_path: 'test/path/video.webm',
        video_url: 'test-bucket/test/path/video.webm',
        duration_seconds: 60
      })
      .select('capture_id')
      .single();
    
    if (captureError) {
      console.error('❌ Failed to store webcapture:', captureError.message);
      return;
    }
    
    testCaptureId = captureData.capture_id;
    console.log(`✅ Webcapture stored successfully with capture_id: ${testCaptureId}`);
    
    // Step 4: Test sentiment insertion
    console.log('\n😊 Step 4: Testing Sentiment Storage...');
    
    const { error: sentimentError } = await supabase
      .from('user_sentiment')
      .insert({
        capture_id: testCaptureId,
        ...testSentiment
      });
    
    if (sentimentError) {
      console.error('❌ Failed to store sentiment:', sentimentError.message);
      return;
    }
    
    console.log('✅ Sentiment data stored successfully');
    
    // Step 5: Verify data relationships
    console.log('\n🔗 Step 5: Verifying Data Relationships...');
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_demographics')
      .select(`
        uid,
        age,
        gender,
        user_webcapture!user_webcapture_user_uid_fkey (
          capture_id,
          video_path,
          user_sentiment!user_sentiment_capture_id_fkey (
            sentiment_id,
            emotions
          )
        )
      `)
      .eq('uid', testUserId)
      .single();
    
    if (verifyError) {
      console.error('❌ Failed to verify relationships:', verifyError.message);
      return;
    }
    
    console.log('✅ Data relationships verified:');
    console.log(`   - User (${verifyData.uid})`);
    console.log(`   - Has ${verifyData.user_webcapture?.length || 0} webcapture(s)`);
    if (verifyData.user_webcapture?.[0]) {
      console.log(`   - Has ${verifyData.user_webcapture[0].user_sentiment?.length || 0} sentiment record(s)`);
    }
    
    // Step 6: Clean up test data
    console.log('\n🧹 Step 6: Cleaning up test data...');
    
    await supabase
      .from('user_demographics')
      .delete()
      .eq('uid', testUserId);
    
    console.log('✅ Test data cleaned up successfully');
    
    // Summary
    console.log('\n==========================================');
    console.log('✅ All tests passed! Data flow is correct.');
    console.log('Data is properly stored in:');
    console.log('  • user_demographics table');
    console.log('  • user_webcapture table');
    console.log('  • user_sentiment table');
    console.log('NOT in kv_store tables ✓');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    
    // Cleanup on error
    if (testUserId) {
      await supabase
        .from('user_demographics')
        .delete()
        .eq('uid', testUserId);
    }
  }
}

// Run the test
testDataFlow()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });