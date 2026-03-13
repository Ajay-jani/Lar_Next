# Temporary File Share Utility

A lightweight, secure file sharing utility built with Next.js that allows users to share files with temporary, expiring links.

## Features

### 🚀 **Core Functionality**
- **Drag & Drop Upload**: Intuitive file upload interface
- **Temporary Links**: Unique URLs that expire automatically
- **Auto-Cleanup**: Files are deleted after expiration
- **Download Tracking**: Monitor download counts and limits
- **Real-time Countdown**: Live expiration timer

### 🔒 **Security Features**
- **Randomized URLs**: UUID-based file identifiers
- **Time-based Expiry**: Files expire after 1 hour
- **Download Limits**: Maximum 10 downloads per file
- **File Size Limits**: 50MB maximum file size
- **No Path Traversal**: Secure file access

### 📱 **User Experience**
- **Responsive Design**: Works on desktop and mobile
- **Copy to Clipboard**: One-click link copying
- **File Type Support**: Any file type supported
- **Progress Indicators**: Upload and processing feedback
- **Error Handling**: Clear error messages

## Technical Architecture

### **Frontend (React/Next.js)**
- **Component**: `src/components/tools/FileShare/FileShare.tsx`
- **Page**: `src/app/tools/file-share/page.tsx`
- **Features**: Drag & drop, real-time countdown, clipboard integration

### **Backend (Next.js API Routes)**
- **Upload**: `src/app/api/file-share/upload/route.ts`
- **Download**: `src/app/api/file-share/download/[id]/route.ts`
- **Stats**: `src/app/api/file-share/stats/route.ts`

### **Storage & Cleanup**
- **File Store**: `src/lib/file-store.ts` (in-memory, replace with Redis for production)
- **Cleanup**: `src/lib/file-cleanup.ts` (automatic expired file removal)
- **Directory**: `temp-uploads/` (gitignored)

## Configuration

### **Default Settings**
```typescript
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const EXPIRY_HOURS = 1 // 1 hour
const MAX_DOWNLOADS = 10 // Maximum downloads per file
const CLEANUP_INTERVAL = 15 * 60 * 1000 // 15 minutes
```

### **Customization**
Edit these values in the respective files to adjust:
- File size limits
- Expiration time
- Download limits
- Cleanup frequency

## API Endpoints

### **POST /api/file-share/upload**
Upload a new file and get a temporary share link.

**Request**: FormData with 'file' field
**Response**:
```json
{
  "success": true,
  "file": {
    "id": "uuid",
    "name": "filename.ext",
    "size": 1024,
    "type": "image/png",
    "url": "http://localhost:3001/api/file-share/download/uuid",
    "expiresAt": "2024-01-01T12:00:00.000Z",
    "downloadCount": 0,
    "maxDownloads": 10
  }
}
```

### **GET /api/file-share/download/[id]**
Download a file by its unique ID.

**Response**: File download or error message

### **HEAD /api/file-share/download/[id]**
Get file metadata without downloading.

**Headers**:
- `X-File-Name`: Original filename
- `X-Downloads-Remaining`: Downloads left
- `X-Expires-At`: Expiration timestamp

### **GET /api/file-share/stats**
Get system statistics (admin endpoint).

**Response**:
```json
{
  "success": true,
  "stats": {
    "activeFiles": 5,
    "totalDownloads": 23,
    "expiredFiles": 2,
    "filesystemStats": {
      "totalFiles": 5,
      "totalSize": 1048576,
      "oldestFile": "2024-01-01T11:00:00.000Z"
    }
  }
}
```

## Usage Instructions

### **For Users**
1. **Navigate** to `/tools/file-share`
2. **Upload** by dragging & dropping or clicking "Choose File"
3. **Copy** the generated share link
4. **Share** the link with recipients
5. **Monitor** downloads and expiration time

### **For Recipients**
1. **Click** the shared link
2. **Download** starts automatically
3. **Note**: Link expires after 1 hour or 10 downloads

## Development Setup

### **Prerequisites**
- Node.js 18+
- npm or yarn

### **Installation**
```bash
# Dependencies already installed in main project
npm install uuid @types/uuid

# Create upload directory
mkdir -p temp-uploads
```

### **Running Locally**
```bash
npm run dev
# Visit http://localhost:3001/tools/file-share
```

### **Building for Production**
```bash
npm run build
npm start
```

## Production Deployment

### **Environment Considerations**
1. **File Storage**: Replace in-memory store with Redis or database
2. **File System**: Use cloud storage (AWS S3, Google Cloud) for scalability
3. **Cleanup**: Implement proper background job for file cleanup
4. **Security**: Add rate limiting and virus scanning
5. **Monitoring**: Add logging and analytics

### **Recommended Upgrades**
```typescript
// Replace file-store.ts with Redis
import Redis from 'ioredis'
const redis = new Redis(process.env.REDIS_URL)

// Use cloud storage
import { S3Client } from '@aws-sdk/client-s3'
const s3 = new S3Client({ region: 'us-east-1' })
```

### **Security Enhancements**
- Add CSRF protection
- Implement rate limiting
- Add virus scanning
- Use signed URLs for downloads
- Add user authentication (optional)

## File Structure

```
src/
├── app/
│   ├── api/file-share/
│   │   ├── upload/route.ts          # File upload endpoint
│   │   ├── download/[id]/route.ts   # File download endpoint
│   │   └── stats/route.ts           # Statistics endpoint
│   └── tools/file-share/
│       └── page.tsx                 # File share page
├── components/tools/FileShare/
│   ├── FileShare.tsx                # Main component
│   └── index.ts                     # Component export
└── lib/
    ├── file-store.ts                # In-memory file storage
    └── file-cleanup.ts              # Cleanup utilities

temp-uploads/                        # Temporary file storage
```

## Testing

### **Manual Testing**
1. Upload various file types and sizes
2. Test expiration by waiting or changing system time
3. Test download limits by downloading multiple times
4. Test drag & drop functionality
5. Test copy to clipboard feature

### **Test Files**
Create test files of different sizes:
```bash
# Small text file
echo "Hello World" > test-small.txt

# Medium image (if available)
cp /path/to/image.jpg test-medium.jpg

# Large file (for size limit testing)
dd if=/dev/zero of=test-large.bin bs=1M count=60
```

## Troubleshooting

### **Common Issues**

**Upload Fails**
- Check file size (max 50MB)
- Ensure `temp-uploads/` directory exists
- Check disk space

**Download Fails**
- File may have expired
- Download limit may be reached
- Check file exists in `temp-uploads/`

**Performance Issues**
- Implement Redis for file metadata
- Use cloud storage for files
- Add CDN for downloads

### **Logs**
Check console logs for detailed error messages during development.

## License

This file sharing utility is part of the Developer Utilities Hub project and follows the same license terms.

## Support

For issues and feature requests, please refer to the main project documentation or create an issue in the project repository.