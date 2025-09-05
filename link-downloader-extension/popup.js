document.getElementById('downloadLinks').addEventListener('click', () => {
  console.log('Button clicked!');
  const status = document.getElementById('status');
  status.textContent = 'Capturing links...';
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      console.error('No active tab found');
      alert('Error: No active tab found');
      status.textContent = 'Error: No tab';
      return;
    }
    
    console.log('Active tab ID:', tabs[0].id);
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: capturePdfLinks
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error('Script execution error:', chrome.runtime.lastError);
        alert('Error: ' + chrome.runtime.lastError.message);
        status.textContent = 'Error executing script';
        return;
      }
      
      console.log('Script results:', results);
      const links = results[0]?.result;
      if (links && links.length > 0) {
        console.log('Sending links to background:', links);
        chrome.runtime.sendMessage({ action: 'startDownloads', links: links }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Send error:', chrome.runtime.lastError);
            status.textContent = 'Error: Background not responding';
          } else {
            console.log('Response:', response);
            status.textContent = `Found ${links.length} PDF links. Starting...`;
            document.getElementById('downloadLinks').style.display = 'none';
            document.getElementById('stopDownloads').style.display = 'block';
          }
        });
      } else {
        console.log('No PDF links found');
        alert('No PDF links found on this page.');
        status.textContent = 'No PDF links found';
      }
    });
  });
});

document.getElementById('stopDownloads').addEventListener('click', () => {
  console.log('Stop button clicked!');
  chrome.runtime.sendMessage({ action: 'stopDownloads' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Stop send error:', chrome.runtime.lastError);
    } else {
      console.log('Stop response:', response);
      document.getElementById('status').textContent = 'Downloads stopped';
      document.getElementById('progressBar').value = 0;
      document.getElementById('progressPercentage').textContent = '0%';
      document.getElementById('downloadLinks').style.display = 'block';
      document.getElementById('stopDownloads').style.display = 'none';
    }
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateProgress') {
    const progressBar = document.getElementById('progressBar');
    const progressPercentage = document.getElementById('progressPercentage');
    const status = document.getElementById('status');
    progressBar.value = message.progress;
    progressPercentage.textContent = `${message.progress}%`;
    status.textContent = `Downloading: ${message.current}/${message.total}`;
  } else if (message.action === 'downloadsComplete') {
    document.getElementById('status').textContent = 'All downloads complete!';
    document.getElementById('progressBar').value = 100;
    document.getElementById('progressPercentage').textContent = '100%';
    document.getElementById('downloadLinks').style.display = 'block';
    document.getElementById('stopDownloads').style.display = 'none';
  }
});

function capturePdfLinks() {
  const anchorTags = document.getElementsByTagName('a');
  const pdfLinks = [];
  
  for (let anchor of anchorTags) {
    if (anchor.href && anchor.href.startsWith('http') && anchor.href.toLowerCase().endsWith('.pdf')) {
      pdfLinks.push(anchor.href);
    }
  }
  console.log('Captured PDF links from page:', pdfLinks);
  return pdfLinks;
}