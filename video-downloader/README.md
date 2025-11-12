# Video Downloader Chrome Extension

A Chrome extension to detect and download MP4 video files from websites.

## Features

- Scans web pages for MP4 video URLs
- Multiple detection methods:
  - Video elements and source tags
  - Data attributes
  - Regex pattern matching in page HTML
- Simple one-click download interface
- Custom filename support

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `video-downloader` folder
5. The extension icon should appear in your toolbar

## Usage

1. Navigate to a webpage with video content
2. Click the Video Downloader extension icon
3. Click "Scan for Videos"
4. Review the detected video URLs
5. Click "Download Video" for the video you want to save
6. Choose where to save the file

## How It Works

The extension uses multiple methods to find videos:
- Scans `<video>` elements and their `<source>` children
- Searches for `.mp4` URLs in the page HTML
- Checks data attributes like `data-src`, `data-video`, `data-url`
- Uses regex to find MP4 URLs in the page content

## Permissions

- `activeTab`: Access the current tab to scan for videos
- `scripting`: Inject scripts to find video sources
- `downloads`: Download detected videos
- `host_permissions`: Access all URLs to scan any website

## Notes

- Some websites may use encrypted or protected video streams that cannot be downloaded
- The extension works best with direct MP4 links
- Always respect copyright and website terms of service when downloading content
