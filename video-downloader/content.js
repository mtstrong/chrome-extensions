// Content script that runs on web pages to detect video URLs
// This can intercept network requests and find videos more reliably

(function() {
  'use strict';

  // Store detected video URLs
  const detectedVideos = new Set();

  // Listen for video element events
  document.addEventListener('play', function(e) {
    if (e.target.tagName === 'VIDEO' && e.target.src) {
      detectedVideos.add(e.target.src);
    }
  }, true);

  // Observe DOM for new video elements
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.tagName === 'VIDEO') {
          if (node.src && node.src.includes('.mp4')) {
            detectedVideos.add(node.src);
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Make detected videos available to the extension
  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    if (event.data.type === 'GET_DETECTED_VIDEOS') {
      window.postMessage({
        type: 'DETECTED_VIDEOS',
        videos: Array.from(detectedVideos)
      }, '*');
    }
  });

})();
