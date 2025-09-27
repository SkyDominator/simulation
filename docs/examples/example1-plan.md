# Zoom Download & YouTube Upload CLI Tools Implementation Plan

## Overview

Implement two CLI tools to automate the content pipeline: a Zoom asset downloader that fetches recordings and transcripts, and a YouTube uploader that handles OAuth authentication, video uploads with thumbnails, and scheduled publishing.

## Current State Analysis

The codebase has existing implementations we can leverage:
- **Zoom Integration**: Working S2S OAuth in `tools/zoom.ts` and full download logic in `content-pipeline-2/backend/video_processor.py:126-243`
- **YouTube Upload**: Complete Python implementation in `content-pipeline-2/backend/video_processor.py:260-307`
- **Gmail OAuth**: Local server flow in `content-pipeline-2/backend/auth.py:42-66` using port 3000
- **Data Patterns**: Existing tools use `tools/data/` for output with `YYYY-MM-DD` naming

### Key Discoveries:
- Zoom URLs are download links like `https://us06web.zoom.us/rec/download/...` with embedded tokens
- YouTube requires separate API calls for video upload and thumbnail setting
- Scheduled publishing requires videos to be private with `publishAt` in UTC
- Gmail OAuth uses `InstalledAppFlow` with local server for desktop apps

## What We're NOT Doing

- Building a web-based OAuth flow (using desktop app flow instead)
- Supporting bulk/batch operations (single asset at a time)
- Implementing video editing or processing features
- Creating a unified pipeline tool (keeping tools separate)
- Supporting other video platforms besides YouTube

## Implementation Approach

Extend the existing TypeScript Zoom CLI with download capabilities and create a new YouTube upload CLI that ports the Python OAuth logic to TypeScript/Bun, maintaining consistency with existing tool patterns.

## Phase 1: Zoom Asset Download CLI

### Overview
Extend `tools/zoom.ts` with a new `download-asset` command that downloads videos and transcripts from Zoom URLs.

### Changes Required:

#### 1. Update Zoom CLI (`tools/zoom.ts`)
**File**: `tools/zoom.ts`
**Changes**: Add new command and download functionality

```typescript
// Add new command handler in main()
if (command === 'download-asset') {
  const urlIndex = args.indexOf('--url');
  const nameIndex = args.indexOf('--name');
  
  if (urlIndex === -1 || nameIndex === -1) {
    console.error('Error: --url and --name are required');
    console.error('Usage: bun run tools/zoom.ts download-asset --url URL --name NAME');
    process.exit(1);
  }
  
  const url = args[urlIndex + 1];
  const name = args[nameIndex + 1];
  
  const client = new ZoomClient();
  await client.downloadAsset(url, name);
}

// Add to ZoomClient class
async downloadAsset(url: string, name: string): Promise<void> {
  // Ensure output directory exists
  await Bun.$`mkdir -p tools/data/raw`;
  
  const date = new Date().toISOString().split('T')[0];
  const token = await this.getAccessToken();
  
  // Download video
  console.log('Downloading video...');
  const videoResponse = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'Mozilla/5.0'
    }
  });
  
  if (!videoResponse.ok && videoResponse.status === 401) {
    // Try without auth as fallback
    videoResponse = await fetch(url);
  }
  
  const videoPath = `tools/data/raw/${date}-${name}.mp4`;
  await Bun.write(videoPath, videoResponse);
  console.log(`✓ Saved video to ${videoPath}`);
  
  // Try to download transcript by modifying URL
  const transcriptUrl = url.replace(/\.(mp4|m4a)/, '.vtt');
  try {
    const transcriptResponse = await fetch(transcriptUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (transcriptResponse.ok) {
      const transcriptPath = `tools/data/raw/${date}-${name}.vtt`;
      await Bun.write(transcriptPath, transcriptResponse);
      console.log(`✓ Saved transcript to ${transcriptPath}`);
    }
  } catch (e) {
    console.log('Note: No transcript available for this recording');
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `bun run tools/zoom.ts --help`
- [ ] Output directory is created: `test -d tools/data/raw`
- [ ] Command validates required arguments

#### Manual Verification:
- [ ] Video downloads successfully from Zoom URL
- [ ] Transcript downloads when available
- [ ] Files are saved with correct naming pattern
- [ ] Authentication fallback works for public recordings

---

## Phase 2: YouTube Upload CLI - Core Authentication

### Overview
Create a new YouTube upload CLI with Gmail OAuth authentication using a local server on port 3050.

### Changes Required:

#### 1. Install Dependencies
**Command**: Run in tools directory
```bash
bun add googleapis google-auth-library @types/node open
```

#### 2. Create YouTube Upload CLI
**File**: `tools/yt-upload.ts`
**Changes**: New file with OAuth implementation

```typescript
#!/usr/bin/env bun

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { createServer } from 'http';
import { parse } from 'url';
import open from 'open';
import fs from 'fs/promises';
import path from 'path';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube'
];

const PORT = 3050;
const CREDS_PATH = 'tools/gmail_creds.json';
const TOKEN_PATH = 'tools/gmail_token.json';

interface Credentials {
  installed: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

interface Token {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

class YouTubeUploader {
  private oauth2Client?: OAuth2Client;
  
  async initialize(): Promise<void> {
    // Check for credentials file
    try {
      await fs.access(CREDS_PATH);
    } catch {
      console.error(`Error: Credentials file not found at ${CREDS_PATH}`);
      console.error('Please download OAuth credentials from Google Cloud Console');
      process.exit(1);
    }
    
    const credsContent = await fs.readFile(CREDS_PATH, 'utf-8');
    const creds: Credentials = JSON.parse(credsContent);
    
    this.oauth2Client = new OAuth2Client(
      creds.installed.client_id,
      creds.installed.client_secret,
      `http://localhost:${PORT}/oauth2callback`
    );
    
    // Try to load existing token
    try {
      const tokenContent = await fs.readFile(TOKEN_PATH, 'utf-8');
      const token: Token = JSON.parse(tokenContent);
      this.oauth2Client.setCredentials(token);
      
      // Check if token is expired
      if (token.expiry_date && token.expiry_date <= Date.now()) {
        console.log('Token expired, refreshing...');
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        await this.saveToken(credentials);
      }
    } catch {
      // No token found, need to authenticate
      await this.authenticate();
    }
  }
  
  private async authenticate(): Promise<void> {
    const authUrl = this.oauth2Client!.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });
    
    console.log('Opening browser for authentication...');
    console.log('If browser doesn\'t open, visit:', authUrl);
    
    // Start local server to handle callback
    const code = await this.startCallbackServer();
    
    // Exchange code for token
    const { tokens } = await this.oauth2Client!.getToken(code);
    this.oauth2Client!.setCredentials(tokens);
    await this.saveToken(tokens);
    
    console.log('✓ Authentication successful!');
  }
  
  private startCallbackServer(): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = createServer(async (req, res) => {
        const queryObject = parse(req.url!, true).query;
        const code = queryObject.code as string;
        
        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Success!</h1><p>You can close this window.</p>');
          server.close();
          resolve(code);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Error</h1><p>No authorization code received.</p>');
          server.close();
          reject(new Error('No authorization code received'));
        }
      });
      
      server.listen(PORT, () => {
        const authUrl = this.oauth2Client!.generateAuthUrl({
          access_type: 'offline',
          scope: SCOPES,
          prompt: 'consent'
        });
        open(authUrl);
      });
    });
  }
  
  private async saveToken(tokens: any): Promise<void> {
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  }
  
  getYouTubeClient() {
    return google.youtube({ version: 'v3', auth: this.oauth2Client });
  }
}

export { YouTubeUploader };
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `bun run tools/yt-upload.ts --help`
- [ ] Dependencies installed: `test -f tools/node_modules/googleapis/package.json`
- [ ] OAuth client initialization works

#### Manual Verification:
- [ ] OAuth flow opens browser on port 3050
- [ ] Token is saved to `tools/gmail_token.json`
- [ ] Token refresh works on expiration
- [ ] Error message shown if credentials missing

---

## Phase 3: YouTube Upload CLI - Video Upload Features

### Overview
Implement video upload with thumbnails, scheduled publishing, and show notes processing.

### Changes Required:

#### 1. Complete YouTube Upload CLI
**File**: `tools/yt-upload.ts`
**Changes**: Add upload functionality and CLI interface

```typescript
// Add to yt-upload.ts

interface UploadOptions {
  video: string;
  thumbnail?: string;
  title: string;
  publishDate?: string;
  showNotesFile?: string;
}

async function parseArgs(): Promise<UploadOptions> {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: bun run yt-upload.ts \\
  --video path/to/video.mp4 \\
  --title "Episode Title" \\
  [--thumbnail url-or-path] \\
  [--publish-date "YYYY-MM-DDTHH:MM:SS"] \\
  [--show-notes-file path/to/notes.md]`);
    process.exit(0);
  }
  
  const getArg = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    return index > -1 ? args[index + 1] : undefined;
  };
  
  const video = getArg('--video');
  const title = getArg('--title');
  
  if (!video || !title) {
    console.error('Error: --video and --title are required');
    process.exit(1);
  }
  
  // Validate video file exists
  try {
    await fs.access(video);
  } catch {
    console.error(`Error: Video file not found: ${video}`);
    process.exit(1);
  }
  
  return {
    video,
    title,
    thumbnail: getArg('--thumbnail'),
    publishDate: getArg('--publish-date'),
    showNotesFile: getArg('--show-notes-file')
  };
}

async function uploadVideo(uploader: YouTubeUploader, options: UploadOptions) {
  const youtube = uploader.getYouTubeClient();
  
  // Process show notes if provided
  let description = `Episode: ${options.title}\n\n`;
  if (options.showNotesFile) {
    const showNotes = await fs.readFile(options.showNotesFile, 'utf-8');
    const episodePath = path.basename(path.dirname(options.video));
    description += showNotes;
    description += `\n\nShow notes: https://github.com/ai-that-works/ai-that-works/tree/main/${episodePath}`;
  }
  
  // Handle scheduled publishing
  const requestBody: any = {
    snippet: {
      title: options.title,
      description,
      tags: ['podcast', 'ai', 'technology'],
      categoryId: '28' // Science & Technology
    },
    status: {
      privacyStatus: 'private'
    }
  };
  
  if (options.publishDate) {
    // Convert PT to UTC
    const ptDate = new Date(options.publishDate + ' PST');
    requestBody.status.publishAt = ptDate.toISOString();
    console.log(`Scheduling for: ${requestBody.status.publishAt}`);
  }
  
  // Upload video
  console.log('Uploading video...');
  const videoSize = (await fs.stat(options.video)).size;
  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody,
    media: {
      body: fs.createReadStream(options.video)
    },
    onUploadProgress: (evt: any) => {
      const progress = (evt.bytesRead / videoSize) * 100;
      process.stdout.write(`\rUpload progress: ${Math.round(progress)}%`);
    }
  });
  
  console.log('\n✓ Video uploaded!');
  const videoId = res.data.id!;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  // Handle thumbnail
  if (options.thumbnail) {
    console.log('Processing thumbnail...');
    let thumbnailPath = options.thumbnail;
    
    // Download if URL
    if (options.thumbnail.startsWith('http')) {
      const response = await fetch(options.thumbnail);
      thumbnailPath = '/tmp/thumbnail.jpg';
      await Bun.write(thumbnailPath, response);
    }
    
    // Upload thumbnail
    try {
      await youtube.thumbnails.set({
        videoId,
        media: {
          body: fs.createReadStream(thumbnailPath)
        }
      });
      console.log('✓ Thumbnail uploaded!');
    } catch (e) {
      console.error('Warning: Thumbnail upload failed:', e.message);
      console.error('Note: Account must be verified at youtube.com/verify');
    }
  }
  
  console.log(`\nVideo URL: ${videoUrl}`);
  if (options.publishDate) {
    console.log(`Scheduled to publish at: ${requestBody.status.publishAt}`);
  }
}

async function main() {
  const options = await parseArgs();
  const uploader = new YouTubeUploader();
  await uploader.initialize();
  await uploadVideo(uploader, options);
}

if (import.meta.main) {
  main().catch(console.error);
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Video file validation works
- [ ] PT to UTC conversion is correct
- [ ] Show notes file is read successfully
- [ ] GitHub URL is generated correctly

#### Manual Verification:
- [ ] Video uploads with progress indicator
- [ ] Thumbnail downloads from URL and uploads
- [ ] Scheduled publishing sets correct future date
- [ ] Show notes appear in video description
- [ ] Video URL is returned after upload

---

## Phase 4: Dependencies and Testing

### Overview
Install all required dependencies and create test scripts.

### Changes Required:

#### 1. Update package.json
**Command**: Run in tools directory
```bash
bun add googleapis google-auth-library open node-fetch @types/node
```

#### 2. Create Test Script
**File**: `tools/test-cli.sh`
**Changes**: New test script

```bash
#!/bin/bash

echo "Testing Zoom CLI..."
bun run tools/zoom.ts --help

echo "Testing YouTube CLI..."
bun run tools/yt-upload.ts --help

echo "Checking data directories..."
mkdir -p tools/data/raw
ls -la tools/data/

echo "✓ Basic tests passed"
```

### Success Criteria:

#### Automated Verification:
- [ ] All dependencies installed: `bun install`
- [ ] TypeScript compiles without errors: `bun run tools/zoom.ts --help`
- [ ] Test script runs successfully: `bash tools/test-cli.sh`

#### Manual Verification:
- [ ] Zoom download works with real URL
- [ ] YouTube OAuth completes successfully
- [ ] Video upload works with test file
- [ ] Scheduled publishing accepted by API

---

## Phase 5: Error Handling and Polish

### Overview
Add comprehensive error handling and user-friendly messages.

### Changes Required:

#### 1. Enhanced Error Handling
**Files**: `tools/zoom.ts`, `tools/yt-upload.ts`
**Changes**: Add try-catch blocks and helpful messages

```typescript
// Add to both tools
process.on('unhandledRejection', (error) => {
  console.error('Error:', error);
  process.exit(1);
});

// Add network retry logic
async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status === 404) return response;
      if (i === maxRetries - 1) throw new Error(`Failed after ${maxRetries} attempts`);
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
  throw new Error('Fetch failed');
}
```

#### 2. Create README
**File**: `tools/README-CLI.md`
**Changes**: Documentation for both tools

```markdown
# Zoom & YouTube CLI Tools

## Setup

1. Install dependencies:
   \`\`\`bash
   bun install
   \`\`\`

2. Configure Zoom credentials in `.env`:
   \`\`\`
   ZOOM_ACCOUNT_ID=...
   ZOOM_CLIENT_ID=...
   ZOOM_CLIENT_SECRET=...
   \`\`\`

3. Get YouTube OAuth credentials:
   - Go to Google Cloud Console
   - Enable YouTube Data API v3
   - Create OAuth 2.0 credentials (Desktop app)
   - Download as `tools/gmail_creds.json`

## Usage

### Zoom Asset Download
\`\`\`bash
bun run tools/zoom.ts download-asset --url URL --name episode-name
\`\`\`

### YouTube Upload
\`\`\`bash
bun run tools/yt-upload.ts \\
  --video tools/data/raw/2025-08-20-episode.mp4 \\
  --title "Episode Title" \\
  --thumbnail https://example.com/thumb.jpg \\
  --publish-date "2025-08-25T10:00:00" \\
  --show-notes-file episode/notes.md
\`\`\`

## Features
- Automatic OAuth token refresh
- Progress indicators for uploads
- Scheduled publishing support
- Thumbnail handling (URL or local file)
- Show notes integration with GitHub links
```

### Success Criteria:

#### Automated Verification:
- [ ] Error handling catches all exceptions
- [ ] Retry logic works for network failures
- [ ] Help text displays correctly

#### Manual Verification:
- [ ] Clear error messages for missing credentials
- [ ] Helpful feedback for invalid inputs
- [ ] Progress indicators work correctly
- [ ] Documentation is complete and accurate

---

## Testing Strategy

### Unit Tests:
- OAuth token refresh logic
- PT to UTC timezone conversion
- URL parsing and validation
- File path validation

### Integration Tests:
- Full Zoom download flow with real URL
- YouTube OAuth authentication flow
- Video upload with small test file
- Thumbnail upload verification

### Manual Testing Steps:
1. Download Zoom recording with transcript
2. Authenticate with YouTube OAuth
3. Upload video with thumbnail
4. Verify scheduled publishing works
5. Check show notes appear in description

## Performance Considerations

- Streaming downloads to avoid memory issues with large files
- Progress indicators for long-running operations
- Resumable uploads for YouTube videos
- Token caching to avoid repeated authentication

## Migration Notes

For existing scripts using the content pipeline:
1. Export Zoom OAuth credentials to `.env`
2. Copy Google credentials to `tools/gmail_creds.json`
3. Update scripts to use new CLI commands
4. Migrate any custom processing logic

## References

- Original ticket: User request for CLI tools
- Related research: `thoughts/shared/research/2025-08-16_11-05-39_content_pipeline_architecture.md`
- Python implementation: `2025-07-01-ai-content-pipeline-2/backend/video_processor.py:260`
- Zoom implementation: `2025-07-01-ai-content-pipeline-2/backend/zoom_client.py:173`