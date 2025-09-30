#!/usr/bin/env node

/**
 * Test script for the Odds API integration
 * Usage: node scripts/test-odds-sync.js [sport]
 */

const { spawn } = require('child_process');

async function testOddsSync(sport = 'americanfootball_nfl') {
  const apiUrl = 'http://localhost:3000/api/odds/sync';
  
  console.log('🏈 Testing Odds API synchronization...');
  console.log(`📡 Fetching data for sport: ${sport}`);
  
  try {
    // First, check the sync status
    console.log('\n📊 Checking sync status...');
    const statusResponse = await fetch(`${apiUrl}?stats=true`);
    const statusData = await statusResponse.json();
    
    if (statusData.success) {
      console.log('✅ Sync endpoint is ready');
      console.log('📈 Current stats:', statusData.stats);
      console.log('🔑 API key configured:', statusData.apiKeyConfigured);
    }
    
    if (!statusData.apiKeyConfigured) {
      console.log('⚠️  Warning: ODDS_API_KEY not configured in environment');
      console.log('   Add your API key to .env file to enable sync');
      return;
    }
    
    // Perform the sync
    console.log('\n🔄 Starting odds synchronization...');
    const syncResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sport: sport,
        markets: 'h2h,spreads,totals',
        regions: 'us',
        oddsFormat: 'american'
      })
    });
    
    const syncData = await syncResponse.json();
    
    if (syncData.success) {
      console.log('✅ Sync completed successfully!');
      console.log('📊 Results:');
      console.log(`   • Events created: ${syncData.data.eventsCreated}`);
      console.log(`   • Lines created: ${syncData.data.linesCreated}`);
      console.log(`   • Games processed: ${syncData.data.totalGamesProcessed}`);
      
      if (syncData.data.apiRemainingRequests) {
        console.log(`   • API requests remaining: ${syncData.data.apiRemainingRequests}`);
      }
    } else {
      console.error('❌ Sync failed:', syncData.error);
    }
    
  } catch (error) {
    console.error('💥 Error testing odds sync:', error.message);
    console.log('\n🔧 Make sure your development server is running:');
    console.log('   npm run dev');
  }
}

// Parse command line arguments
const sport = process.argv[2] || 'americanfootball_nfl';

// Check if dev server is running
async function checkDevServer() {
  try {
    const response = await fetch('http://localhost:3000/api/odds/sync');
    return response.ok;
  } catch {
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkDevServer();
  
  if (!serverRunning) {
    console.log('🚀 Starting development server...');
    const devProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true
    });
    
    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  await testOddsSync(sport);
})();