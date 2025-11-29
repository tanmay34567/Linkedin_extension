// Content script that runs on LinkedIn pages
// This script can access the DOM of LinkedIn pages

console.log('🔗 LinkedIn Scraper content script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'scrapeProfile') {
    const profileData = scrapeCurrentProfile();
    sendResponse({ success: true, data: profileData });
  }
  return true;
});

// Function to scrape current LinkedIn profile page
function scrapeCurrentProfile() {
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

    // Extract name
    const nameElement = document.querySelector('h1.text-heading-xlarge') || 
                       document.querySelector('.pv-text-details__left-panel h1') ||
                       document.querySelector('[data-generated-suggestion-target]');
    if (nameElement) {
      data.name = nameElement.innerText.trim();
    }

    // Extract bio/headline
    const bioElement = document.querySelector('.text-body-medium.break-words') ||
                      document.querySelector('.pv-text-details__left-panel .text-body-medium') ||
                      document.querySelector('.pv-top-card--list-bullet li:first-child');
    if (bioElement) {
      data.bio = bioElement.innerText.trim();
    }

    // Extract location
    const locationElement = document.querySelector('.text-body-small.inline.t-black--light.break-words') ||
                           document.querySelector('.pv-text-details__left-panel .text-body-small') ||
                           document.querySelector('.pv-top-card--list-bullet li');
    if (locationElement) {
      data.location = locationElement.innerText.trim();
    }

    // Extract about section
    const aboutSection = document.querySelector('#about');
    if (aboutSection) {
      const aboutContainer = aboutSection.closest('section');
      if (aboutContainer) {
        const aboutText = aboutContainer.querySelector('.display-flex.ph5.pv3') ||
                         aboutContainer.querySelector('.pv-shared-text-with-see-more span[aria-hidden="true"]') ||
                         aboutContainer.querySelector('.inline-show-more-text') ||
                         aboutContainer.querySelector('.pv-about__summary-text');
        if (aboutText) {
          data.about = aboutText.innerText.trim();
        }
      }
    }

    // Extract follower count
    const followerElements = document.querySelectorAll('.pv-text-details__left-panel .text-body-small, .pv-top-card--list li');
    followerElements.forEach(el => {
      const text = el.innerText.toLowerCase();
      if (text.includes('follower')) {
        const match = text.match(/(\d+[\d,]*)\s*follower/);
        if (match) {
          data.followerCount = parseInt(match[1].replace(/,/g, ''));
        }
      }
    });

    // Extract connection count
    const connectionElements = document.querySelectorAll('.pv-text-details__left-panel .text-body-small, .pv-top-card--list li');
    connectionElements.forEach(el => {
      const text = el.innerText.toLowerCase();
      if (text.includes('connection')) {
        const match = text.match(/(\d+[\d,]*)\+?\s*connection/);
        if (match) {
          data.connectionCount = parseInt(match[1].replace(/,/g, ''));
        }
      }
    });

    // Alternative method for connections
    if (data.connectionCount === 0) {
      const connectionLink = document.querySelector('a[href*="/search/results/people/?network="]');
      if (connectionLink) {
        const text = connectionLink.innerText;
        const match = text.match(/(\d+[\d,]*)\+?\s*connection/i);
        if (match) {
          data.connectionCount = parseInt(match[1].replace(/,/g, ''));
        }
      }
    }

    console.log('✅ Scraped profile data:', data);
    return data;

  } catch (error) {
    console.error('❌ Error scraping profile:', error);
    return null;
  }
}

// Optional: Add visual indicator when scraping is active
function showScrapingIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'linkedin-scraper-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    animation: fadeIn 0.3s;
  `;
  indicator.innerHTML = '🔄 Scraping profile...';
  document.body.appendChild(indicator);

  setTimeout(() => {
    indicator.remove();
  }, 3000);
}
