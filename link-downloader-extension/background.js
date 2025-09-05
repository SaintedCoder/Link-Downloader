console.log('Background script loaded');

let activeDownloads = [];
let currentIndex = 0;
let downloadTimeout = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  if (message.action === 'startDownloads') {
    activeDownloads = message.links;
    currentIndex = 0;
    downloadNext();
    sendResponse({ status: 'started' });
    return true; // Keep channel open
  } else if (message.action === 'stopDownloads') {
    if (downloadTimeout) {
      clearTimeout(downloadTimeout);
      downloadTimeout = null;
    }
    activeDownloads = [];
    currentIndex = 0;
    console.log('Downloads stopped');
    sendResponse({ status: 'stopped' });
  }
});

function downloadNext() {
  if (currentIndex >= activeDownloads.length || activeDownloads.length === 0) {
    console.log('All downloads complete or stopped');
    chrome.runtime.sendMessage({ action: 'downloadsComplete' });
    activeDownloads = [];
    currentIndex = 0;
    return;
  }

  const link = activeDownloads[currentIndex];
  console.log(`Initiating download: ${link}`);
  chrome.downloads.download({
    url: link,
    conflictAction: 'uniquify'
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error(`Download failed for ${link}:`, chrome.runtime.lastError);
    } else {
      console.log(`Download started for ${link}, ID: ${downloadId}`);
    }
    
    const progress = Math.round(((currentIndex + 1) / activeDownloads.length) * 100);
    chrome.runtime.sendMessage({
      action: 'updateProgress',
      progress: progress,
      current: currentIndex + 1,
      total: activeDownloads.length
    });
    
    currentIndex++;
    if (activeDownloads.length > 0) {
      downloadTimeout = setTimeout(downloadNext, 5000); // 5 seconds delay
    }
  });
}