// Background service worker for tab management and scraping orchestration
const API_URL = 'http://localhost:4000/api/profiles';
const DELAY_BETWEEN_PROFILES = 6000; // 6 seconds between each profile

// Add configuration: set to false to fill comment and let user edit/submit manually.
// Set to true to auto-submit after filling.
const AUTO_SUBMIT = false;
const DEFAULT_COMMENT = 'CFBR';

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startScraping') {
    startScrapingProcess(message.urls);
    sendResponse({ success: true });
  } else if (message.action === 'startEngagement') {
    startFeedEngagement(message.likeCount, message.commentCount);
    sendResponse({ success: true });
  }
  return true; // Keep message channel open for async response
});

// Main scraping orchestration function
async function startScrapingProcess(urls) {
  console.log(`🚀 Starting scraping for ${urls.length} profiles`);
  
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`\n📍 Processing profile ${i + 1}/${urls.length}: ${url}`);

    // Notify popup of progress (ignore errors if popup is closed)
    chrome.runtime.sendMessage({
      action: 'scrapingProgress',
      current: i + 1,
      total: urls.length
    }).catch(() => {
      // Popup closed, ignore
    });

    try {
      // Open profile in new tab
      const tab = await chrome.tabs.create({ url, active: false });
      
      // Wait for page to load
      await waitForTabLoad(tab.id);
      
      // Additional wait for dynamic content (LinkedIn needs more time)
      await sleep(8000);

      // Scroll once to middle/bottom to load About section
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Scroll to about 60% of page (where About section usually is)
          const scrollPosition = document.body.scrollHeight * 0.6;
          window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
        }
      });

      // Wait for About section to load
      await sleep(10000);

      // Click "see more" buttons to expand About section
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            const text = btn.textContent?.toLowerCase();
            if (text && (text.includes('see more') || text.includes('show all'))) {
              console.log('Clicking "see more" button');
              btn.click();
            }
          }
        }
      });

      // Wait for About content to fully expand
      await sleep(5000);

      // Execute content script to scrape data
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrapeLinkedInProfile
      });

      if (results && results[0] && results[0].result) {
        const profileData = results[0].result;
        console.log('✅ Scraped data:', profileData);
        console.log('   Name:', profileData.name || '(empty)');
        console.log('   Bio:', profileData.bio || '(empty)');
        console.log('   Location:', profileData.location || '(empty)');
        console.log('   About:', profileData.about ? profileData.about.substring(0, 50) + '...' : '(empty)');
        console.log('   Followers:', profileData.followerCount);
        console.log('   Connections:', profileData.connectionCount);

        // Set null for empty values
        if (!profileData.name || profileData.name === '') profileData.name = null;
        if (!profileData.bio || profileData.bio === '') profileData.bio = null;
        if (!profileData.location || profileData.location === '') profileData.location = null;
        if (!profileData.about || profileData.about === '') profileData.about = null;

        // Send data to backend API even if name is null
        const apiResponse = await sendToAPI(profileData);
        
        if (apiResponse.success) {
          console.log('✅ Profile saved to database');
          successful++;
        } else {
          console.error('❌ Failed to save to database:', apiResponse.message);
          failed++;
        }
      } else {
        console.error('❌ Failed to scrape profile data');
        failed++;
      }

      // Close tab after scraping
      try {
        await chrome.tabs.remove(tab.id);
      } catch (err) {
        console.log('Tab already closed or removed');
      }

      // Wait before processing next profile (except for last one)
      if (i < urls.length - 1) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_PROFILES / 1000} seconds before next profile...`);
        await sleep(DELAY_BETWEEN_PROFILES);
      }

    } catch (error) {
      console.error(`❌ Error processing profile ${url}:`, error);
      failed++;
    }
  }

  // Notify completion
  console.log(`\n✅ Scraping complete! Successful: ${successful}, Failed: ${failed}`);
  
  // Try to notify popup, but ignore if it's closed
  chrome.runtime.sendMessage({
    action: 'scrapingComplete',
    total: urls.length,
    successful,
    failed
  }).catch(() => {
    // Popup closed, ignore
  });
}

// Function injected into LinkedIn page to scrape profile data
function scrapeLinkedInProfile() {
  try {
    const data = {
      name: '',
      url: window.location.href,
      about: '',
      bio: '',
      location: '',
      followerCount: 0,
      connectionCount: 0
    };

    // Get the main profile card section - more specific targeting
    const profileCard = document.querySelector('.pv-top-card') || 
                       document.querySelector('[class*="top-card"]') ||
                       document.querySelector('main');

    // Extract name from page title as fallback
    const pageTitle = document.title;
    if (pageTitle && pageTitle.includes('|')) {
      const namePart = pageTitle.split('|')[0].trim();
      if (namePart && namePart !== 'LinkedIn') {
        data.name = namePart;
      }
    }

    // If no name from title, try h1 elements
    if (!data.name) {
      const allH1s = Array.from(document.querySelectorAll('h1'));
      
      const nameSelectors = [
        'h1.text-heading-xlarge',
        'h1',
        '.pv-top-card--list h1',
        '.ph5 h1',
        '[class*="top-card"] h1',
        '[class*="profile"] h1'
      ];
      
      for (const selector of nameSelectors) {
        const element = document.querySelector(selector);
        if (element && element.innerText.trim()) {
          data.name = element.innerText.trim();
          break;
        }
      }

      // If still no name, try finding any h1 with text
      if (!data.name && allH1s.length > 0) {
        const nameH1 = allH1s.find(h1 => {
          const text = h1.innerText.trim();
          return text.length > 2 && text.length < 100 && h1.offsetParent !== null;
        });
        if (nameH1) {
          data.name = nameH1.innerText.trim();
        }
      }

      // If STILL no name, just take the first h1 with any text
      if (!data.name && allH1s.length > 0) {
        const firstH1 = allH1s.find(h1 => h.innerText.trim().length > 0);
        if (firstH1) {
          data.name = firstH1.innerText.trim();
        }
      }
    }

    // LinkedIn changed their classes - let's find ALL divs and extract text
    console.log('DEBUG: Searching for any text on page...');
    
    // Get all divs in main section
    const allDivs = Array.from(document.querySelectorAll('main div, main span'));
    console.log('DEBUG: Total divs/spans in main:', allDivs.length);
    
    // Collect ALL text snippets (any length) to see what's on page
    const allTexts = [];
    for (const el of allDivs) {
      const text = el.textContent?.trim();
      if (text && text.length >= 5 && text.length <= 300) {
        allTexts.push(text);
      }
    }
    
    // Remove duplicates and show first 30
    const uniqueTexts = [...new Set(allTexts)];
    console.log('DEBUG: Total unique texts found:', uniqueTexts.length);
    console.log('DEBUG: First 30 unique text snippets:');
    uniqueTexts.slice(0, 30).forEach((t, i) => console.log(`  ${i + 1}. [${t.length} chars] "${t.substring(0, 80)}"`));
    
    // Now filter for bio/location
    const uiKeywords = ['follow', 'message', 'connect', 'you know', 'people also viewed', 
                       'ad options', 'manage', 'premium', 'profile powered'];
    const textSnippets = uniqueTexts.filter(text => {
      const lower = text.toLowerCase();
      return !uiKeywords.some(keyword => lower.includes(keyword)) &&
             !text.includes('\n\n') && !text.includes('·');
    });
    
    console.log('DEBUG: After filtering UI text, remaining:', textSnippets.length);
    console.log('DEBUG: First 10 filtered texts:');
    textSnippets.slice(0, 10).forEach((t, i) => console.log(`  ${i + 1}. "${t.substring(0, 80)}"`));
    
    // Find the concatenated profile text (contains name + bio + location)
    const profileText = uniqueTexts.find(text => 
      data.name && text.includes(data.name) && text.length > 50
    );
    
    console.log('DEBUG: Found profile text:', profileText);
    
    if (profileText && data.name) {
      // Parse the concatenated string
      // Format: "Satya NadellaChairman and CEO at MicrosoftMicrosoftRedmond, Washington, United States"
      
      // Remove name from start
      let remaining = profileText.replace(data.name, '');
      console.log('DEBUG: After removing name:', remaining);
      
      // Find where location starts - look for country/state/city keywords
      const locationKeywords = [
        // Countries
        'United States', 'India', 'United Kingdom', 'Canada', 'Australia', 
        'Singapore', 'Germany', 'France', 'Japan', 'China', 'Brazil', 'Mexico',
        'Netherlands', 'Switzerland', 'Italy', 'Spain', 'South Korea', 'UAE',
        // US States
        'California', 'New York', 'Texas', 'Washington', 'Florida', 'Illinois',
        'Massachusetts', 'Georgia', 'Virginia', 'Colorado', 'Pennsylvania',
        // Major Cities
        'San Francisco', 'New York City', 'Los Angeles', 'Seattle', 'Chicago',
        'Boston', 'Austin', 'Denver', 'London', 'Paris', 'Berlin', 'Tokyo',
        'Mumbai', 'Bangalore', 'Delhi', 'Hyderabad', 'Pune', 'Chennai',
        // State Abbreviations in location format
        ', CA', ', NY', ', TX', ', WA', ', FL', ', IL', ', MA', ', GA'
      ];
      
      let locationStartIdx = -1;
      let country = '';
      
      for (const keyword of locationKeywords) {
        const idx = remaining.indexOf(keyword);
        if (idx !== -1) {
          country = keyword;
          // Location might start before country (City, State, Country)
          // Look backward for the city/state part
          // Location typically starts after company name or last "at"
          const beforeCountry = remaining.substring(0, idx);
          
          // Find last comma before country - that's usually where city starts
          const lastCommaIdx = beforeCountry.lastIndexOf(',');
          if (lastCommaIdx !== -1 && lastCommaIdx > 0) {
            // Check if there's another comma before (City, State format)
            const beforeLastComma = beforeCountry.substring(0, lastCommaIdx);
            const secondLastCommaIdx = beforeLastComma.lastIndexOf(',');
            
            if (secondLastCommaIdx !== -1 && lastCommaIdx - secondLastCommaIdx < 30) {
              // Format: City, State, Country
              locationStartIdx = secondLastCommaIdx + 1;
            } else {
              // Format: City, Country
              locationStartIdx = lastCommaIdx + 1;
            }
          } else {
            // No comma found, location starts at country
            locationStartIdx = idx;
          }
          break;
        }
      }
      
      if (locationStartIdx !== -1) {
        // Extract bio (everything before location)
        data.bio = remaining.substring(0, locationStartIdx).trim();
        
        // Clean bio - remove duplicate words (MicrosoftMicrosoft -> Microsoft)
        const words = data.bio.split(/\s+/);
        const cleanWords = [];
        for (let i = 0; i < words.length; i++) {
          if (i === 0 || words[i] !== words[i-1]) {
            cleanWords.push(words[i]);
          }
        }
        data.bio = cleanWords.join(' ');
        
        // Remove anything after · and clean up
        data.bio = data.bio.replace(/·.*$/, '').trim();
        data.bio = data.bio.replace(/,$/, '').trim();
        
        // Handle concatenated words at location boundary (e.g., "MicrosoftRedmond")
        // Split on capital letters followed by lowercase if no space
        data.bio = data.bio.replace(/([a-z])([A-Z])/g, '$1 $2');
        
        console.log('DEBUG: Parsed bio:', data.bio);
        
        // Extract full location (City, State/Province, Country)
        let fullLocation = remaining.substring(locationStartIdx).trim();
        fullLocation = fullLocation.split('·')[0].trim(); // Remove "·Contact info"
        fullLocation = fullLocation.replace(/,$/, '').trim(); // Remove trailing comma
        
        // Fix concatenated location (e.g., "MicrosoftRedmond" -> just "Redmond")
        // If location starts with a capital word that's not a city, remove it
        const locationWords = fullLocation.split(/\s+/);
        const firstWord = locationWords[0];
        if (firstWord && firstWord.match(/^[A-Z][a-z]+$/) && 
            !firstWord.match(/^(Redmond|Seattle|Mountain|New|San|Los|Mumbai|Bangalore|Pune|Delhi|Hyderabad|Chennai|London|Paris|Berlin|Tokyo|Singapore)/)) {
          fullLocation = locationWords.slice(1).join(' ');
        }
        
        data.location = fullLocation;
        console.log('DEBUG: Parsed location:', data.location);
      }
    }
    
    // Fallback: try to find location separately if not found above
    if (!data.location) {
      for (const text of uniqueTexts) {
        if (text.includes(',') || text.includes('United States') || text.includes('India')) {
          const cleaned = text.split('·')[0].trim();
          if (cleaned.length > 5 && cleaned.length < 100) {
            data.location = cleaned;
            console.log('DEBUG: Fallback location:', data.location);
            break;
          }
        }
      }
    }

    // Extract about section - comprehensive search with better filtering
    console.log('DEBUG: Looking for About section...');
    
    // Get main content area (exclude sidebars and right panels)
    const mainContent = document.querySelector('main') || document.body;
    
    // Also explicitly exclude sidebar
    const sidebar = document.querySelector('aside, [class*="right-rail"], [class*="aside"]');
    
    let aboutTexts = [];
    let aboutFound = false;
    
    // Look for section with "About" heading in main content ONLY
    const mainSections = mainContent.querySelectorAll('section');
    console.log('DEBUG: Found', mainSections.length, 'sections in main content');
    
    for (const section of mainSections) {
      // Skip if this section is inside sidebar
      if (sidebar && sidebar.contains(section)) {
        console.log('DEBUG: Skipping section in sidebar');
        continue;
      }
      
      // Check if this section has "About" heading
      const headings = section.querySelectorAll('h2, h3, div, span');
      let isAboutSection = false;
      
      for (const heading of headings) {
        const headingText = heading.textContent?.trim().toLowerCase();
        if (headingText === 'about') {
          isAboutSection = true;
          console.log('DEBUG: Found About section!');
          break;
        }
      }
      
      // Also check for #about id
      if (section.querySelector('#about') || section.id === 'about') {
        isAboutSection = true;
        console.log('DEBUG: Found section with #about id');
      }
      
      if (isAboutSection) {
        aboutFound = true;
        console.log('DEBUG: Extracting text from About section...');
        
        // Try to find the actual content paragraph
        // Look for span with aria-hidden="true" or visible text spans
        const contentSpans = section.querySelectorAll('span[aria-hidden="true"], div.inline-show-more-text span, div > span');
        
        for (const span of contentSpans) {
          const text = span.textContent?.trim();
          
          // About text criteria:
          // - Substantial length (100+ chars)
          // - Has complete sentences (contains periods)
          // - Not UI text or headings
          // - Not from other profiles (no job titles for other people)
          if (text && text.length >= 100 && text.length < 5000 &&
              !text.toLowerCase().startsWith('about') &&
              !text.toLowerCase().includes('see more') &&
              !text.toLowerCase().includes('show all') &&
              text.includes('.') && // Complete sentences
              !text.match(/\|/) && // No job separators from other profiles
              !text.match(/\d+(st|nd|rd|th)/) && // No connection degrees
              !text.match(/^[A-Z][a-z]+ [A-Z][a-z]+\s*·/) // No name patterns from sidebar
             ) {
            aboutTexts.push(text);
            console.log('DEBUG: About candidate (' + text.length + ' chars):', text.substring(0, 100));
          }
        }
        
        break; // Found the about section, stop searching
      }
    }
    
    // Get the longest, most complete text
    if (aboutTexts.length > 0) {
      aboutTexts.sort((a, b) => b.length - a.length);
      data.about = aboutTexts[0];
      console.log('DEBUG: Extracted about (', data.about.length, 'chars):', data.about.substring(0, 150));
    } else if (aboutFound) {
      console.log('DEBUG: About section found but no suitable text extracted');
    } else {
      console.log('DEBUG: No About section found on page');
    }

    // Extract follower and connection counts from all text on page
    const allText = document.body.innerText;
    
    // Extract follower count - try multiple patterns
    let followerMatch = allText.match(/(\d+[\d,]*)\s*followers?/i);
    if (!followerMatch) {
      // Try with K, M notation
      followerMatch = allText.match(/(\d+\.?\d*)\s*([KMB])\s*followers?/i);
      if (followerMatch) {
        const num = parseFloat(followerMatch[1]);
        const multiplier = followerMatch[2].toUpperCase();
        const multipliers = { K: 1000, M: 1000000, B: 1000000000 };
        data.followerCount = Math.round(num * multipliers[multiplier]);
      }
    } else {
      data.followerCount = parseInt(followerMatch[1].replace(/,/g, ''));
    }

    // Extract connection count - try multiple patterns
    let connectionMatch = allText.match(/(\d+[\d,]*)\+?\s*connections?/i);
    if (!connectionMatch) {
      // Try "X connection" without s
      connectionMatch = allText.match(/(\d+[\d,]*)\+?\s*connection/i);
    }
    if (connectionMatch) {
      data.connectionCount = parseInt(connectionMatch[1].replace(/,/g, ''));
    }

    console.log('Scraped profile data:', data);
    return data;

  } catch (error) {
    console.error('Error scraping profile:', error);
    return null;
  }
}

// Send scraped data to backend API
async function sendToAPI(profileData) {
  try {
    // Validate profile data
    if (!profileData || !profileData.url) {
      console.error('❌ Invalid profile data - missing URL');
      return { 
        success: false, 
        message: 'Invalid profile data - URL is required' 
      };
    }

    console.log('📤 Sending to API:', API_URL);
    console.log('📋 Profile URL:', profileData.url);
    
    // Validate API URL is correct
    if (!API_URL.startsWith('http://localhost') && !API_URL.startsWith('http://127.0.0.1')) {
      console.error('❌ Invalid API URL:', API_URL);
      return { 
        success: false, 
        message: 'API URL is misconfigured' 
      };
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(profileData)
    });

    console.log('📨 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      
      if (response.status === 400) {
        console.error('❌ Bad Request - Check request body:', profileData);
      }
      
      return { 
        success: false, 
        message: `API error: ${response.status} ${response.statusText}` 
      };
    }

    const result = await response.json();
    console.log('✅ API Response:', result);
    return result;

  } catch (error) {
    console.error('❌ Network/Fetch Error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Stack:', error.stack);
    
    return { 
      success: false, 
      message: `Fetch error: ${error.message}. Ensure backend server is running on http://localhost:4000` 
    };
  }
}

// Wait for tab to finish loading
function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}

// Sleep utility function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== LinkedIn Feed Auto-Engagement =====
async function startFeedEngagement(likeCount, commentCount) {
  console.log(`💙 Starting feed engagement: ${likeCount} likes, ${commentCount} comments`);
  
  try {
    // Notify user that LinkedIn feed is opening
    chrome.runtime.sendMessage({
      action: 'engagementProgress',
      message: 'Opening LinkedIn feed...'
    }).catch(() => {});
    
    // Open LinkedIn feed in new tab
    console.log('🌐 Opening LinkedIn feed...');
    const feedTab = await chrome.tabs.create({ 
      url: 'https://www.linkedin.com/feed/', 
      active: true 
    });
    
    console.log('⏳ Waiting for feed to load...');
    // Wait for feed to load
    await waitForTabLoad(feedTab.id);
    await sleep(5000);
    
    console.log('🚀 Starting engagement process...');
    chrome.runtime.sendMessage({
      action: 'engagementProgress',
      message: 'Engaging with posts...'
    }).catch(() => {});
    
    // Execute engagement script
    await chrome.scripting.executeScript({
      target: { tabId: feedTab.id },
      func: engageWithFeed,
      args: [likeCount, commentCount]
    });
    
  } catch (error) {
    console.error('❌ Engagement error:', error);
    chrome.runtime.sendMessage({
      action: 'engagementComplete',
      liked: 0,
      commented: 0
    }).catch(() => {});
  }
}

// Function to engage with LinkedIn feed posts
async function engageWithFeed(likeCount, commentCount) {
  console.log(`Starting engagement: ${likeCount} likes, ${commentCount} comments`);
  
  let liked = 0;
  let commented = 0;
  
  // Generic LinkedIn comments
  const comments = [
    'CFBR',
    'Great insights!',
    'Thanks for sharing!',
    'Very informative!',
    'Interesting perspective!',
    'Well said!',
    'Agreed!',
    'Nice post!',
    'Love this!',
    'Absolutely!',
    'Great content!',
    'This is helpful!',
    'Thanks!',
    'Inspiring!',
    'Well articulated!'
  ];
  
  // Scroll to top first
  window.scrollTo(0, 0);
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Scroll down to load posts
  for (let i = 0; i < 5; i++) {
    window.scrollBy(0, 800);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('🔍 Searching for posts on feed...');
  
  // Find all like buttons first
  const likeButtons = document.querySelectorAll(
    'button[aria-label*="Like"], button[aria-label*="React"], button[class*="like-button"]'
  );
  console.log(`Found ${likeButtons.length} like buttons`);
  
  if (likeButtons.length === 0) {
    console.error('❌ No like buttons found on page');
    chrome.runtime.sendMessage({
      action: 'engagementComplete',
      liked: 0,
      commented: 0
    });
    return;
  }
  
  // Build array of posts by finding unique parent containers for each button
  const postsMap = new Map();
  
  likeButtons.forEach((btn, index) => {
    // Traverse up the DOM to find the post container
    let parent = btn;
    let depth = 0;
    const maxDepth = 15;
    
    while (parent && depth < maxDepth) {
      parent = parent.parentElement;
      depth++;
      
      if (!parent) break;
      
      // Check if this element looks like a post container
      const classes = parent.className || '';
      const id = parent.id || '';
      
      // Look for post indicators
      if (
        classes.includes('update') ||
        classes.includes('post') ||
        classes.includes('feed-shared') ||
        classes.includes('activity') ||
        id.includes('activity') ||
        parent.getAttribute('data-id')?.includes('activity')
      ) {
        // Use the parent element as key to deduplicate
        const key = parent.className + parent.id + (parent.getAttribute('data-id') || '');
        if (!postsMap.has(key)) {
          postsMap.set(key, {
            container: parent,
            likeButton: btn,
            commentButtons: [],
            index: index
          });
        }
        return;
      }
    }
    
    // Fallback: if no post container found, use button's immediate ancestor
    if (!postsMap.has('fallback-' + index)) {
      const postContainer = btn.closest('div[class*="feed"], div[class*="scaffold"], article') || 
                           btn.closest('div');
      if (postContainer) {
        postsMap.set('fallback-' + index, {
          container: postContainer,
          likeButton: btn,
          commentButtons: [],
          index: index
        });
      }
    }
  });
  
  const posts = Array.from(postsMap.values());
  console.log(`📊 Total unique posts found: ${posts.length}`);
  
  if (posts.length === 0) {
    console.error('❌ Could not map posts');
    chrome.runtime.sendMessage({
      action: 'engagementComplete',
      liked: 0,
      commented: 0
    });
    return;
  }
  
  // Now find comment buttons for each post
  posts.forEach(post => {
    const commentSelectors = [
      'button[aria-label*="Comment"]',
      'button[aria-label*="Reply"]',
      'button[class*="comment-button"]'
    ];
    
    for (const selector of commentSelectors) {
      const buttons = post.container.querySelectorAll(selector);
      if (buttons.length > 0) {
        post.commentButtons = Array.from(buttons);
        break;
      }
    }
  });
  
  console.log(`Target: ${likeCount} likes, ${commentCount} comments`);
  
  // Engage with posts
  for (let i = 0; i < Math.min(likeCount + commentCount, posts.length); i++) {
    const post = posts[i];
    console.log(`\n📌 Processing post ${i + 1}/${posts.length}`);
    
    try {
      // Like post if needed
      if (liked < likeCount && post.likeButton) {
        const btn = post.likeButton;
        const isLiked = btn.getAttribute('aria-pressed') === 'true' || 
                       btn.classList.toString().includes('react');
        
        if (!isLiked) {
          btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(resolve => setTimeout(resolve, 500));
          
          btn.click();
          liked++;
          console.log(`✅ Liked post ${liked}/${likeCount}`);
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        }
      }
      
      // Comment on post if needed
      if (commented < commentCount && post.commentButtons.length > 0) {
        const commentBtn = post.commentButtons[0];
        
        commentBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        commentBtn.click();
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Wait for comment input to appear (polling helper)
        async function waitForSelectorIn(root, selector, timeout = 5000, interval = 200) {
          const start = Date.now();
          while (Date.now() - start < timeout) {
            try {
              const el = (root || document).querySelector(selector);
              if (el) return el;
            } catch (e) { /* ignore */ }
            await new Promise(r => setTimeout(r, interval));
          }
          return null;
        }

        // Prefer post-local editor then global
        let commentBox = null;
        const selectors = [
          'textarea[class*="comment"]',
          'textarea[placeholder*="comment"]',
          'textarea',
          '[contenteditable="true"][role="textbox"]',
          '[contenteditable="true"]',
          '.ql-editor',
          'div[role="textbox"]'
        ];

        // Try to find editor inside post.container first with polling
        for (const sel of selectors) {
          commentBox = await waitForSelectorIn(post.container, sel, 2500, 150);
          if (commentBox) break;
        }
        // If still not found, try document-wide
        if (!commentBox) {
          for (const sel of selectors) {
            commentBox = await waitForSelectorIn(document, sel, 3000, 150);
            if (commentBox) break;
          }
        }

        if (commentBox) {
          // Use comment from DEFAULT_COMMENT (editable in code or later via storage)
          const commentToPost = DEFAULT_COMMENT;

          // Use simulateTyping to type CFBR so React/contenteditable handlers run
          await simulateTyping(commentBox, commentToPost, 60);

          // small pause to let UI enable submit
          await new Promise(r => setTimeout(r, 900));

          if (!AUTO_SUBMIT) {
            // Editable mode: leave the comment filled and focused for manual edit/submit
            try { commentBox.focus(); } catch (e) { /* ignore */ }
            console.log(`📝 Filled comment box with "${commentToPost}". Please edit or press Post manually.`);
            // Do not increment `commented` since we didn't submit.
            // Continue to next post after a short pause to let user see the filled editor.
            await new Promise(r => setTimeout(r, 1000));
            continue; // proceed to next post without auto-submitting
          }

          // If AUTO_SUBMIT is true, proceed with submit-button or Ctrl+Enter logic
          // Find submit button inside the comment area first, then globally
          const submitSelectors = [
            'button.comments-comment-box__submit-button',
            'button[class*="submit"]',
            'button[aria-label*="Post"]',
            'button[aria-label*="Send"]',
            'button[type="submit"]'
          ];

          let submitButton = null;
          const commentContainer = commentBox.closest('[class*="comment"]') || post.container || document;
          for (const sel of submitSelectors) {
            const found = commentContainer.querySelector(sel);
            if (found && !found.disabled && found.offsetParent !== null) {
              submitButton = found;
              break;
            }
          }
          if (!submitButton) {
            for (const sel of submitSelectors) {
              const found = document.querySelector(sel);
              if (found && !found.disabled && found.offsetParent !== null) {
                submitButton = found;
                break;
              }
            }
          }

          if (submitButton && !submitButton.disabled) {
            submitButton.click();
            commented++;
            console.log(`✅ Commented on post ${commented}/${commentCount} (clicked submit)`);
            await new Promise(r => setTimeout(r, 1200 + Math.random() * 1800));
          } else {
            // Fallback: try Ctrl+Enter or Enter
            try {
              console.warn('⚠️ Submit button not found — trying Ctrl+Enter fallback');
              commentBox.focus();
              const kd = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, ctrlKey: true, bubbles: true });
              const ku = new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, ctrlKey: true, bubbles: true });
              commentBox.dispatchEvent(kd);
              await new Promise(r => setTimeout(r, 60));
              commentBox.dispatchEvent(ku);
              await new Promise(r => setTimeout(r, 1200 + Math.random() * 1200));
              commented++;
              console.log(`✅ Comment attempted via Ctrl+Enter fallback (assumed).`);
            } catch (err) {
              console.error('❌ Fallback posting failed:', err);
            }
          }
        } else {
          console.warn('⚠️ Could not find comment input box for this post (checked multiple selectors)');
        }
      }
    } catch (error) {
      console.error('❌ Error processing post:', error);
    }
    
    // Stop if we've completed both actions
    if (liked >= likeCount && commented >= commentCount) {
      console.log('✅ All targets reached!');
      break;
    }
  }
  
  console.log(`\n✅ Engagement complete! Liked: ${liked}, Commented: ${commented}`);
  console.log(`Target was: ${likeCount} likes, ${commentCount} comments`);
  
  // Send completion message
  chrome.runtime.sendMessage({
    action: 'engagementComplete',
    liked: liked,
    commented: commented
  });
}

// ===== Helper: simulate typing to trigger React/contenteditable handlers =====
async function simulateTyping(targetEl, text, charDelay = 60) {
  // For inputs / textareas: append chars to .value and dispatch input events
  if (!targetEl) return;
  try {
    targetEl.focus();
  } catch (e) {}
  if (targetEl.tagName === 'TEXTAREA' || targetEl.tagName === 'INPUT') {
    targetEl.value = ''; // clear first
    for (const ch of text) {
      targetEl.value += ch;
      targetEl.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, charDelay));
    }
    // some handlers also expect change
    targetEl.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  // For contenteditable / rich editors: insert characters and dispatch InputEvent
  // Best effort: update innerText and dispatch input events per character
  try {
    // ensure focus and selection at end
    targetEl.focus();
    // clear then type
    targetEl.innerText = '';
    for (const ch of text) {
      // Append char
      // Use textContent to avoid HTML injection
      targetEl.textContent = (targetEl.textContent || '') + ch;

      // Update selection to end
      try {
        const range = document.createRange();
        range.selectNodeContents(targetEl);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) { /* ignore */ }

      // Dispatch InputEvent so React picks it up
      const ev = new InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' });
      targetEl.dispatchEvent(ev);

      await new Promise(r => setTimeout(r, charDelay));
    }

    // Final input event to ensure full text processed
    targetEl.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertFromPaste' }));
  } catch (e) {
    // Fallback: set textContent and dispatch generic input
    try { targetEl.textContent = text; targetEl.dispatchEvent(new Event('input', { bubbles: true })); } catch (err) {}
  }
}

console.log('🔧 LinkedIn Scraper background service worker loaded');
