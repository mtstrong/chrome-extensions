document.addEventListener('DOMContentLoaded', function() {
  const scanBtn = document.getElementById('scanBtn');
  const downloadLargestBtn = document.getElementById('downloadLargestBtn');
  const statusDiv = document.getElementById('status');
  const videoListDiv = document.getElementById('videoList');

  let pageTitle = '';
  let videoData = []; // Store video URLs and their sizes

  scanBtn.addEventListener('click', async function() {
    scanBtn.disabled = true;
    statusDiv.textContent = 'Scanning for videos...';
    videoListDiv.innerHTML = '';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Store the page title
      pageTitle = tab.title || 'video';
      
      // Inject script to find video sources
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: findVideoSources
      });

      const videoUrls = results[0].result;

      if (videoUrls && videoUrls.length > 0) {
        statusDiv.textContent = `Found ${videoUrls.length} video(s):`;
        videoData = []; // Reset video data
        displayVideos(videoUrls);
      } else {
        statusDiv.textContent = 'No MP4 videos found on this page.';
      }
    } catch (error) {
      statusDiv.textContent = 'Error: ' + error.message;
    } finally {
      scanBtn.disabled = false;
    }
  });

  downloadLargestBtn.addEventListener('click', async function() {
    downloadLargestBtn.disabled = true;
    statusDiv.textContent = 'Scanning for videos...';
    videoListDiv.innerHTML = '';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Store the page title
      pageTitle = tab.title || 'video';
      
      // Inject script to find video sources
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: findVideoSources
      });

      const videoUrls = results[0].result;

      if (videoUrls && videoUrls.length > 0) {
        statusDiv.textContent = `Found ${videoUrls.length} video(s). Checking sizes...`;
        videoData = [];
        
        // Fetch all sizes
        await Promise.all(videoUrls.map((url, index) => 
          fetchVideoSizeForLargest(url, index)
        ));

        // Filter videos with known sizes
        const videosWithSize = videoData.filter(v => v.size > 0);
        
        if (videosWithSize.length === 0) {
          statusDiv.textContent = 'Could not determine video sizes. Please use "Scan for Videos" and download manually.';
          downloadLargestBtn.disabled = false;
          return;
        }

        // Find the largest video
        const largestVideo = videosWithSize.reduce((max, video) => 
          video.size > max.size ? video : max
        );

        statusDiv.textContent = `Downloading largest video (${formatBytes(largestVideo.size)})...`;
        downloadVideo(largestVideo.url, largestVideo.index);
      } else {
        statusDiv.textContent = 'No MP4 videos found on this page.';
      }
    } catch (error) {
      statusDiv.textContent = 'Error: ' + error.message;
    } finally {
      downloadLargestBtn.disabled = false;
    }
  });

  function displayVideos(videoUrls) {
    videoUrls.forEach((url, index) => {
      const videoItem = document.createElement('div');
      videoItem.className = 'video-item';

      const urlDiv = document.createElement('div');
      urlDiv.className = 'video-url';
      urlDiv.textContent = url;

      const sizeDiv = document.createElement('div');
      sizeDiv.className = 'video-size';
      sizeDiv.textContent = 'Size: Checking...';

      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = `Download Video ${index + 1}`;
      downloadBtn.addEventListener('click', function() {
        downloadVideo(url, index + 1);
      });

      videoItem.appendChild(urlDiv);
      videoItem.appendChild(sizeDiv);
      videoItem.appendChild(downloadBtn);
      videoListDiv.appendChild(videoItem);

      // Initialize video data entry
      videoData.push({
        url: url,
        index: index + 1,
        size: 0
      });

      // Fetch video size
      fetchVideoSize(url, sizeDiv, index);
    });
  }

  async function fetchVideoSize(url, sizeDiv, index) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      
      if (contentLength) {
        const sizeInBytes = parseInt(contentLength);
        const sizeFormatted = formatBytes(sizeInBytes);
        sizeDiv.textContent = `Size: ${sizeFormatted}`;
        
        // Update video data with size
        videoData[index].size = sizeInBytes;
      } else {
        sizeDiv.textContent = 'Size: Unknown';
      }
    } catch (error) {
      sizeDiv.textContent = 'Size: Unable to fetch';
    }
  }

  async function fetchVideoSizeForLargest(url, index) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      
      const sizeInBytes = contentLength ? parseInt(contentLength) : 0;
      
      videoData.push({
        url: url,
        index: index + 1,
        size: sizeInBytes
      });
    } catch (error) {
      videoData.push({
        url: url,
        index: index + 1,
        size: 0
      });
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function downloadVideo(url, index) {
    try {
      // Clean the page title to make it a valid filename
      let filename = sanitizeFilename(pageTitle);
      
      // Add index if there are multiple videos
      if (videoListDiv.children.length > 1) {
        filename = `${filename}_${index}`;
      }
      
      // Ensure .mp4 extension
      if (!filename.endsWith('.mp4')) {
        filename += '.mp4';
      }

      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      }, function(downloadId) {
        if (chrome.runtime.lastError) {
          alert('Download failed: ' + chrome.runtime.lastError.message);
        } else {
          statusDiv.textContent = 'Download started!';
        }
      });
    } catch (error) {
      alert('Download error: ' + error.message);
    }
  }

  function sanitizeFilename(filename) {
    // Remove invalid characters for filenames
    return filename
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 100) // Limit length
      .trim() || 'video'; // Fallback to 'video' if empty
  }
});

// This function runs in the context of the webpage
function findVideoSources() {
  const videoUrls = new Set();

  // Method 1: Find all <video> elements and their sources
  document.querySelectorAll('video').forEach(video => {
    if (video.src && video.src.includes('.mp4')) {
      videoUrls.add(video.src);
    }
    // Check source elements within video tags
    video.querySelectorAll('source').forEach(source => {
      if (source.src && source.src.includes('.mp4')) {
        videoUrls.add(source.src);
      }
    });
  });

  // Method 2: Find all <source> elements
  document.querySelectorAll('source[src*=".mp4"]').forEach(source => {
    videoUrls.add(source.src);
  });

  // Method 3: Search for MP4 URLs in the page HTML
  const htmlContent = document.documentElement.innerHTML;
  const mp4Regex = /(https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*)/gi;
  const matches = htmlContent.match(mp4Regex);
  if (matches) {
    matches.forEach(url => {
      // Clean up the URL (remove potential trailing characters)
      url = url.replace(/[,;)}\]]+$/, '');
      videoUrls.add(url);
    });
  }

  // Method 4: Check data attributes
  document.querySelectorAll('[data-src*=".mp4"], [data-video*=".mp4"], [data-url*=".mp4"]').forEach(elem => {
    const url = elem.getAttribute('data-src') || elem.getAttribute('data-video') || elem.getAttribute('data-url');
    if (url && url.includes('.mp4')) {
      videoUrls.add(url);
    }
  });

  // Convert Set to Array and return
  return Array.from(videoUrls);
}
