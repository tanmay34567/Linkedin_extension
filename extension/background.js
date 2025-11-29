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
    // Accept optional commentText and autoSubmit from popup; fall back to defaults if not provided
    const commentText = (typeof message.commentText === 'string' && message.commentText.trim().length > 0) ? message.commentText : DEFAULT_COMMENT;
    const autoSubmit = (typeof message.autoSubmit === 'boolean') ? message.autoSubmit : AUTO_SUBMIT;

    startFeedEngagement(message.likeCount, message.commentCount, commentText, autoSubmit);
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
        const firstH1 = allH1s.find(h1 => h1.innerText.trim().length > 0);
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
async function startFeedEngagement(likeCount, commentCount, commentText = DEFAULT_COMMENT, autoSubmit = AUTO_SUBMIT) {
  console.log(`💙 Starting feed engagement: ${likeCount} likes, ${commentCount} comments (comment="${commentText}", autoSubmit=${autoSubmit})`);
  
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
    
    // Inject a self-contained function into the feed tab. It defines simulateTyping and all logic
    await chrome.scripting.executeScript({
      target: { tabId: feedTab.id },
      func: (likeCount, commentCount, defaultComment, autoSubmit) => {
        // Helper: simulate typing into inputs / contenteditable to trigger React handlers
        async function simulateTyping(targetEl, text, charDelay = 60) {
          if (!targetEl) return;
          try { targetEl.focus(); } catch (e) {}
          const tag = (targetEl.tagName || '').toUpperCase();
          if (tag === 'TEXTAREA' || tag === 'INPUT') {
            targetEl.value = '';
            for (const ch of text) {
              targetEl.value += ch;
              targetEl.dispatchEvent(new Event('input', { bubbles: true }));
              await new Promise(r => setTimeout(r, charDelay));
            }
            targetEl.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
          // contenteditable
          try {
            targetEl.focus();
            targetEl.innerText = '';
            for (const ch of text) {
              targetEl.textContent = (targetEl.textContent || '') + ch;
              try {
                const range = document.createRange();
                range.selectNodeContents(targetEl);
                range.collapse(false);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
              } catch (e) {}
              targetEl.dispatchEvent(new InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' }));
              await new Promise(r => setTimeout(r, charDelay));
            }
            targetEl.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertFromPaste' }));
          } catch (e) {
            try { targetEl.textContent = text; targetEl.dispatchEvent(new Event('input', { bubbles: true })); } catch (err) {}
          }
        }

        // Main engagement logic (self-contained)
        (async function runEngagement() {
          try {
            // Basic scrolling to load posts
            window.scrollTo(0, 0);
            await new Promise(r => setTimeout(r, 1200));
            for (let s = 0; s < 4; s++) { window.scrollBy(0, 700); await new Promise(r => setTimeout(r, 800)); }

            // Find like buttons and dedupe post containers
            const likeButtons = Array.from(document.querySelectorAll(
              'button[aria-label*="Like"], button[aria-label*="React"], button[class*="like-button"]'
            ));
            const postsMap = new Map();
            likeButtons.forEach((btn, idx) => {
              let parent = btn;
              let depth = 0;
              while (parent && depth < 16) {
                parent = parent.parentElement;
                depth++;
                if (!parent) break;
                const classes = parent.className || '';
                const id = parent.id || '';
                if (classes.includes('update') || classes.includes('feed-shared') || id.includes('activity') || (parent.getAttribute && (parent.getAttribute('data-id')||'').includes('activity'))) {
                  const key = (parent.className || '') + '|' + (parent.id || '') + '|' + (parent.getAttribute('data-id') || '');
                  if (!postsMap.has(key)) postsMap.set(key, { container: parent, likeButton: btn, index: idx });
                  return;
                }
              }
              // fallback
              const postContainer = btn.closest('article, div[class*="feed"], div[class*="scaffold"]') || btn.closest('div');
              const key = 'fallback-' + idx;
              if (postContainer && !postsMap.has(key)) postsMap.set(key, { container: postContainer, likeButton: btn, index: idx });
            });
            const posts = Array.from(postsMap.values());

            // Engage: like then fill comment (leave editable if autoSubmit is false)
            let liked = 0, commented = 0;
            const total = Math.max(0, Math.min(likeCount + commentCount, posts.length));
            for (let i = 0; i < total; i++) {
              const post = posts[i];
              if (!post) continue;
              // Like
              if (liked < likeCount && post.likeButton) {
                try {
                  post.likeButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  await new Promise(r => setTimeout(r, 400));
                  const isLiked = post.likeButton.getAttribute('aria-pressed') === 'true' || (post.likeButton.className || '').includes('react');
                  if (!isLiked) { post.likeButton.click(); liked++; await new Promise(r => setTimeout(r, 800 + Math.random()*900)); }
                } catch (e) {}
              }
  
              // Comment
              if (commented < commentCount) {
                try {
                  // Find comment button(s) for this post
                  let commentBtn = null;
                  const commentSelectors = ['button[aria-label*="Comment"]', 'button[aria-label*="Reply"]', 'button[class*="comment-button"]'];
                  for (const sel of commentSelectors) {
                    const found = post.container.querySelector(sel);
                    if (found) { commentBtn = found; break; }
                  }
                  if (!commentBtn) {
                    // try global
                    for (const sel of commentSelectors) {
                      const found = document.querySelector(sel);
                      if (found) { commentBtn = found; break; }
                    }
                  }
                  if (!commentBtn) continue;
                  commentBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  await new Promise(r => setTimeout(r, 400));
                  commentBtn.click();
                  await new Promise(r => setTimeout(r, 800));
  
                  // Wait/poll for comment editor
                  async function waitForSelectorIn(root, selector, timeout = 3000, interval = 120) {
                    const start = Date.now();
                    while (Date.now() - start < timeout) {
                      try {
                        const el = (root || document).querySelector(selector);
                        if (el) return el;
                      } catch (e) {}
                      await new Promise(r => setTimeout(r, interval));
                    }
                    return null;
                  }
                  const editorSelectors = ['textarea[class*="comment"]','[contenteditable="true"][role="textbox"]','[contenteditable="true"]','.ql-editor','div[role="textbox"]','textarea'];
                  let commentBox = null;
                  for (const sel of editorSelectors) {
                    commentBox = await waitForSelectorIn(post.container, sel, 1800, 120);
                    if (commentBox) break;
                  }
                  if (!commentBox) {
                    for (const sel of editorSelectors) {
                      commentBox = await waitForSelectorIn(document, sel, 2000, 150);
                      if (commentBox) break;
                    }
                  }
                  if (!commentBox) continue;

                  await simulateTyping(commentBox, defaultComment, 70);
                  await new Promise(r => setTimeout(r, 700));

                  if (!autoSubmit) {
                    try { commentBox.focus(); } catch (e) {}
                    continue;
                  }

                  const submitSelectors = ['button.comments-comment-box__submit-button','button[aria-label*="Post"]','button[aria-label*="Send"]','button[type="submit"]','button[class*="submit"]'];
                  let submitButton = null;
                  const commentContainer = commentBox.closest('[class*="comment"]') || post.container || document;
                  for (const sel of submitSelectors) {
                    const found = commentContainer.querySelector(sel);
                    if (found && !found.disabled && found.offsetParent !== null) { submitButton = found; break; }
                  }
                  if (!submitButton) {
                    for (const sel of submitSelectors) {
                      const found = document.querySelector(sel);
                      if (found && !found.disabled && found.offsetParent !== null) { submitButton = found; break; }
                    }
                  }
                  if (submitButton && !submitButton.disabled) {
                    submitButton.click();
                    commented++;
                    await new Promise(r => setTimeout(r, 900 + Math.random()*800));
                  } else {
                    // fallback
                    try {
                      commentBox.focus();
                      commentBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, ctrlKey: true, bubbles: true }));
                      commented++;
                      await new Promise(r => setTimeout(r, 700 + Math.random()*700));
                    } catch (e) {}
                  }
                } catch (err) {}
              }
              // break early if done
              if (liked >= likeCount && commented >= commentCount) break;
            }

            console.log('Injected engagement finished', { liked, commented });
          } catch (err) {
            console.error('Injected engagement error', err);
          }
        })();
      },
      args: [likeCount, commentCount, commentText, autoSubmit]
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
