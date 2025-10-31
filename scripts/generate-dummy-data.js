#!/usr/bin/env node

/**
 * Script to generate dummy sentiment data for testing the admin dashboard
 * This creates realistic-looking emotion data that varies over time
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Supabase configuration
const SUPABASE_URL = process.env.VITE_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service key for admin operations

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables:');
  console.error('VITE_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  console.error('');
  console.error('Example:');
  console.error('VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.error('SUPABASE_SERVICE_KEY=your-service-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configuration
const NUM_USERS = 10; // Number of dummy users to create
const VIDEO_DURATION = 60; // Video duration in seconds
const SAMPLE_RATE = 2; // Samples per second

// Demographic options
const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64'];
const GENDERS = ['male', 'female', 'non-binary'];
const RACES = ['asian', 'black', 'white', 'hispanic', 'multiracial'];
const ETHNICITIES = ['hispanic', 'non-hispanic'];
const NATIONALITIES = ['USA', 'Canada', 'UK', 'Germany', 'France', 'Japan', 'Australia'];

// Helper function to generate random float between min and max
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// Helper function to pick random element from array
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate emotion values with realistic patterns
function generateEmotionData(timestamp, userSeed) {
  // Create wave patterns for different emotions
  const time = timestamp / VIDEO_DURATION;
  
  // Base emotions with some randomness and patterns
  const neutral = 0.4 + 0.2 * Math.sin(time * Math.PI * 2) + randomFloat(-0.1, 0.1);
  const happy = 0.2 + 0.15 * Math.sin(time * Math.PI * 3 + userSeed) + randomFloat(-0.05, 0.05);
  const sad = 0.1 + 0.1 * Math.sin(time * Math.PI * 1.5 + userSeed * 2) + randomFloat(-0.05, 0.05);
  const angry = 0.05 + 0.05 * Math.cos(time * Math.PI * 2.5 + userSeed * 3) + randomFloat(-0.03, 0.03);
  const fearful = 0.05 + 0.05 * Math.sin(time * Math.PI * 4 + userSeed * 4) + randomFloat(-0.03, 0.03);
  const disgusted = 0.03 + 0.03 * Math.cos(time * Math.PI * 3.5 + userSeed * 5) + randomFloat(-0.02, 0.02);
  const surprised = 0.08 + 0.07 * Math.sin(time * Math.PI * 5 + userSeed * 6) + randomFloat(-0.04, 0.04);
  
  // Normalize to ensure sum is close to 1
  const total = neutral + happy + sad + angry + fearful + disgusted + surprised;
  
  return {
    neutral: Math.max(0, Math.min(1, neutral / total)),
    happy: Math.max(0, Math.min(1, happy / total)),
    sad: Math.max(0, Math.min(1, sad / total)),
    angry: Math.max(0, Math.min(1, angry / total)),
    fearful: Math.max(0, Math.min(1, fearful / total)),
    disgusted: Math.max(0, Math.min(1, disgusted / total)),
    surprised: Math.max(0, Math.min(1, surprised / total))
  };
}

// Generate sentiment data for a user
function generateUserSentimentData(userId, userSeed) {
  const sentimentData = [];
  const numSamples = VIDEO_DURATION * SAMPLE_RATE;
  
  for (let i = 0; i < numSamples; i++) {
    const timestamp = i / SAMPLE_RATE;
    const expressions = generateEmotionData(timestamp, userSeed);
    
    sentimentData.push({
      timestamp,
      expressions
    });
  }
  
  return sentimentData;
}

// Main function to generate and insert dummy data
async function generateDummyData() {
  console.log('🎬 Generating dummy sentiment data for testing...\n');
  
  const users = [];
  
  // Generate user data
  for (let i = 0; i < NUM_USERS; i++) {
    const userId = uuidv4();
    const userSeed = Math.random() * 10; // Random seed for emotion patterns
    
    const user = {
      userId,
      demographics: {
        age: randomChoice(AGE_RANGES),
        gender: randomChoice(GENDERS),
        race: randomChoice(RACES),
        ethnicity: randomChoice(ETHNICITIES),
        nationality: randomChoice(NATIONALITIES)
      },
      sentiment: generateUserSentimentData(userId, userSeed),
      duration: VIDEO_DURATION + randomFloat(-5, 5) // Add some variation to durations
    };
    
    users.push(user);
    console.log(`Generated data for user ${i + 1}/${NUM_USERS} (${user.demographics.age} ${user.demographics.gender})`);
  }
  
  console.log('\n📤 Inserting data into Supabase...\n');
  
  // Insert data into Supabase tables
  for (const user of users) {
    try {
      // Insert demographics
      const { error: demoError } = await supabase
        .from('user_demographics')
        .insert({
          user_id: user.userId,
          age: user.demographics.age,
          gender: user.demographics.gender,
          race: user.demographics.race,
          ethnicity: user.demographics.ethnicity,
          nationality: user.demographics.nationality
        });
      
      if (demoError) {
        console.error(`Error inserting demographics for user ${user.userId}:`, demoError);
        continue;
      }
      
      // Insert sentiment data
      const { error: sentimentError } = await supabase
        .from('user_sentiment')
        .insert({
          user_id: user.userId,
          sentiment_data: user.sentiment
        });
      
      if (sentimentError) {
        console.error(`Error inserting sentiment for user ${user.userId}:`, sentimentError);
        continue;
      }
      
      // Insert duration data
      const { error: durationError } = await supabase
        .from('capture_durations')
        .insert({
          capture_id: uuidv4(),
          user_id: user.userId,
          duration: Math.round(user.duration * 1000), // Store in milliseconds
          precise_duration: `${user.duration.toFixed(3)}s`,
          formatted_duration: `${Math.floor(user.duration / 60)}m ${Math.round(user.duration % 60)}s`,
          recorded_at: new Date().toISOString()
        });
      
      if (durationError) {
        console.error(`Error inserting duration for user ${user.userId}:`, durationError);
        continue;
      }
      
      console.log(`✅ Successfully inserted data for user ${user.userId}`);
    } catch (error) {
      console.error(`Error processing user ${user.userId}:`, error);
    }
  }
  
  console.log('\n✨ Dummy data generation complete!');
  console.log(`Generated data for ${NUM_USERS} users with ${VIDEO_DURATION * SAMPLE_RATE} sentiment samples each.`);
  console.log('\nYou can now view this data in the admin dashboard.');
}

// Run the script
generateDummyData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });