// Simple script to test the API endpoints
const API_URL = 'http://localhost:4000/api/profiles';

// Test data
const testProfile = {
  name: 'Test User',
  url: 'https://www.linkedin.com/in/testuser123/',
  about: 'This is a test about section with some information about the user.',
  bio: 'Software Engineer | Tech Enthusiast',
  location: 'San Francisco, CA',
  followerCount: 1500,
  connectionCount: 500
};

console.log('🧪 Testing LinkedIn Scraper API\n');

// Test 1: Create a profile
async function testCreateProfile() {
  console.log('Test 1: Creating a profile...');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testProfile)
    });
    const data = await response.json();
    console.log('✅ Response:', data);
    return data.data?.id;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Test 2: Get all profiles
async function testGetAllProfiles() {
  console.log('\nTest 2: Getting all profiles...');
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    console.log(`✅ Found ${data.count} profiles`);
    console.log('Profiles:', data.data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Test 3: Get single profile
async function testGetSingleProfile(id) {
  if (!id) return;
  console.log(`\nTest 3: Getting profile with ID ${id}...`);
  try {
    const response = await fetch(`${API_URL}/${id}`);
    const data = await response.json();
    console.log('✅ Profile:', data.data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Test 4: Delete profile
async function testDeleteProfile(id) {
  if (!id) return;
  console.log(`\nTest 4: Deleting profile with ID ${id}...`);
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    console.log('✅ Response:', data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('⚠️  Make sure the backend server is running on http://localhost:4000\n');
  
  const profileId = await testCreateProfile();
  await testGetAllProfiles();
  await testGetSingleProfile(profileId);
  await testDeleteProfile(profileId);
  
  console.log('\n✅ All tests completed!');
}

// Check if running in Node.js
if (typeof window === 'undefined') {
  runTests();
} else {
  console.log('Run this script with Node.js: node test-api.js');
}
