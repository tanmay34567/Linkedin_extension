// Popup UI logic and scraping orchestration
const urlsTextarea = document.getElementById('urls');
const startBtn = document.getElementById('startBtn');
const statusDiv = document.getElementById('status');
const progressDiv = document.getElementById('progress');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');

// Show status message
function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status show ${type}`;
}

// Update progress bar
function updateProgress(current, total) {
  progressDiv.style.display = 'block';
  progressText.textContent = `Processing: ${current}/${total}`;
  const percentage = (current / total) * 100;
  progressFill.style.width = `${percentage}%`;
}

// Validate LinkedIn URL
function isValidLinkedInUrl(url) {
  const pattern = /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/;
  return pattern.test(url.trim());
}

// Parse URLs from textarea
function parseUrls() {
  const text = urlsTextarea.value.trim();
  if (!text) return [];
  
  const urls = text.split('\n')
    .map(url => url.trim())
    .filter(url => url.length > 0);
  
  return urls;
}

// Start scraping process
startBtn.addEventListener('click', async () => {
  const urls = parseUrls();
  
  // Validation
  if (urls.length < 3) {
    showStatus('❌ Please enter at least 3 LinkedIn profile URLs', 'error');
    return;
  }

  // Validate each URL
  const invalidUrls = urls.filter(url => !isValidLinkedInUrl(url));
  if (invalidUrls.length > 0) {
    showStatus(`❌ Invalid LinkedIn URLs detected. Please check your input.`, 'error');
    return;
  }

  // Disable button and start scraping
  startBtn.disabled = true;
  showStatus('🔄 Starting scraping process...', 'info');
  updateProgress(0, urls.length);

  try {
    // Send message to background script to start scraping
    chrome.runtime.sendMessage({
      action: 'startScraping',
      urls: urls
    }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('❌ Error: ' + chrome.runtime.lastError.message, 'error');
        startBtn.disabled = false;
        return;
      }
      
      if (response && response.success) {
        showStatus('✅ Scraping started! Check console for progress.', 'success');
      } else {
        showStatus('❌ Failed to start scraping', 'error');
        startBtn.disabled = false;
      }
    });
  } catch (error) {
    showStatus('❌ Error: ' + error.message, 'error');
    startBtn.disabled = false;
  }
});

// Listen for progress updates from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'scrapingProgress') {
    updateProgress(message.current, message.total);
    showStatus(`🔄 Scraping profile ${message.current}/${message.total}...`, 'info');
  } else if (message.action === 'scrapingComplete') {
    updateProgress(message.total, message.total);
    showStatus(`✅ Scraping complete! ${message.successful} profiles saved, ${message.failed} failed.`, 'success');
    startBtn.disabled = false;
  } else if (message.action === 'scrapingError') {
    showStatus(`❌ Error: ${message.error}`, 'error');
    startBtn.disabled = false;
  }
});

// Load saved URLs from storage on popup open
chrome.storage.local.get(['savedUrls'], (result) => {
  if (result.savedUrls) {
    urlsTextarea.value = result.savedUrls;
  }
});

// Save URLs to storage when textarea changes
urlsTextarea.addEventListener('input', () => {
  chrome.storage.local.set({ savedUrls: urlsTextarea.value });
});

// ===== Feed Auto-Engagement =====
const likeCountInput = document.getElementById('likeCount');
const commentCountInput = document.getElementById('commentCount');
const engageBtn = document.getElementById('engageBtn');
const engageStatusDiv = document.getElementById('engageStatus');

// Show engagement status
function showEngageStatus(message, type = 'info') {
  engageStatusDiv.textContent = message;
  engageStatusDiv.className = `status show ${type}`;
}

// Enable engage button only when both fields have values
function checkEngageButton() {
  const likeCount = parseInt(likeCountInput.value);
  const commentCount = parseInt(commentCountInput.value);
  
  engageBtn.disabled = !(likeCount > 0 && commentCount > 0);
}

likeCountInput.addEventListener('input', checkEngageButton);
commentCountInput.addEventListener('input', checkEngageButton);

// Start engagement process
engageBtn.addEventListener('click', async () => {
  const likeCount = parseInt(likeCountInput.value);
  const commentCount = parseInt(commentCountInput.value);
  
  if (!likeCount || !commentCount || likeCount < 1 || commentCount < 1) {
    showEngageStatus('❌ Please enter valid counts for both fields', 'error');
    return;
  }
  
  // Disable button
  engageBtn.disabled = true;
  showEngageStatus('🔄 Starting engagement on LinkedIn feed...', 'info');
  
  try {
    chrome.runtime.sendMessage({
      action: 'startEngagement',
      likeCount: likeCount,
      commentCount: commentCount
    }, (response) => {
      if (chrome.runtime.lastError) {
        showEngageStatus('❌ Error: ' + chrome.runtime.lastError.message, 'error');
        engageBtn.disabled = false;
        checkEngageButton();
        return;
      }
      
      if (response && response.success) {
        showEngageStatus('✅ Engagement started! Check the LinkedIn feed tab.', 'success');
      } else {
        showEngageStatus('❌ Failed to start engagement', 'error');
        engageBtn.disabled = false;
        checkEngageButton();
      }
    });
  } catch (error) {
    showEngageStatus('❌ Error: ' + error.message, 'error');
    engageBtn.disabled = false;
    checkEngageButton();
  }
});

// Listen for engagement updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'engagementProgress') {
    showEngageStatus(`🔄 ${message.message}`, 'info');
  } else if (message.action === 'engagementComplete') {
    showEngageStatus(`✅ Complete! Liked: ${message.liked}, Commented: ${message.commented}`, 'success');
    engageBtn.disabled = false;
    checkEngageButton();
  }
});
