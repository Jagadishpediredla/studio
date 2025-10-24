# Arduino Cloud Compilation System

A distributed Arduino compilation system that uses Firebase for real-time coordination and GitHub for binary storage, providing unlimited free storage with permanent download URLs.

## 🚀 Features

- **Cloud-based Arduino compilation** - Compile Arduino sketches remotely
- **Real-time status updates** - Live progress tracking via Firebase
- **GitHub binary storage** - Unlimited free storage with permanent URLs
- **Multi-board support** - Arduino Uno, ESP32, and more
- **Library management** - Automatic library installation
- **Version control** - Every build stored as GitHub release
- **Unified logging** - Complete audit trail of all operations
- **RESTful API** - Easy integration with web applications

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cloud App     │    │    Firebase      │    │ Desktop Client  │
│  (Your Web App) │◄──►│  (Coordination)  │◄──►│   (Compiler)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌──────────────────┐
                    │     GitHub       │
                    │ (Binary Storage) │
                    └──────────────────┘
```

### Components

1. **Desktop Client (Server)** - Executes Arduino CLI compilation
2. **Firebase Realtime Database** - Coordinates requests and status
3. **GitHub Releases** - Stores compiled binaries with permanent URLs
4. **Cloud App (Client)** - Your web application that submits requests

## 📋 System Requirements

### Desktop Client
- Node.js 16+
- Arduino CLI installed
- Firebase service account
- GitHub personal access token

### Cloud App
- Firebase Admin SDK
- Internet connection
- GitHub access (for downloads)

## ⚡ Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/Jagadishpediredla/aiide.git
cd aiide/arduino-cloud-system
npm install
```

### 2. Configure Firebase
```bash
# Add your Firebase service account
cp firebase-service-account.example.json firebase-service-account.json
# Edit with your Firebase credentials
```

### 3. Configure GitHub
```bash
# Create GitHub config
cp github-config.example.json github-config.json
# Edit with your GitHub credentials
```

### 4. Start Desktop Client
```bash
node minimal-cloud-client-v2.js
```

### 5. Test System
```bash
node test-cloud-api.js
```

## 🔧 Configuration

### GitHub Configuration

Create `github-config.json`:
```json
{
  "owner": "your-github-username",
  "repo": "your-repository-name", 
  "token": "ghp_your_personal_access_token"
}
```

**Requirements:**
- GitHub repository (public for free unlimited storage)
- Personal access token with `repo` scope
- Repository must have at least one commit

### Firebase Configuration

Create `firebase-service-account.json`:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "...",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

## 📡 API Documentation

### Submit Compilation Request

```javascript
const admin = require('firebase-admin');

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(require('./firebase-service-account.json')),
  databaseURL: "your-firebase-database-url"
});

const db = admin.database();

async function compileArduino(code, board = 'arduino:avr:uno', libraries = []) {
  // 1. Find active desktop client
  const desktopsSnapshot = await db.ref('desktops').once('value');
  const desktops = desktopsSnapshot.val() || {};
  
  const now = Date.now();
  const activeClient = Object.entries(desktops).find(([id, info]) => {
    const timeDiff = now - info.lastSeen;
    return info.status === 'online' && timeDiff < 30000;
  });
  
  if (!activeClient) {
    throw new Error('No active desktop client available');
  }
  
  const clientId = activeClient[0];
  
  // 2. Submit compilation request
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await db.ref(`requests/${clientId}/${requestId}`).set({
    code: code,
    board: board,
    libraries: libraries,
    timestamp: Date.now(),
    clientMetadata: {
      userId: 'your-user-id',
      source: 'web-app'
    }
  });
  
  // 3. Monitor compilation status
  return new Promise((resolve, reject) => {
    const statusRef = db.ref(`status/${requestId}`);
    
    const timeout = setTimeout(() => {
      statusRef.off();
      reject(new Error('Compilation timeout'));
    }, 180000); // 3 minutes
    
    statusRef.on('value', async (snapshot) => {
      const status = snapshot.val();
      if (!status) return;
      
      console.log(`[${status.phase}] ${status.status} (${status.progress}%)`);
      console.log(`Message: ${status.message}`);
      
      if (status.status === 'completed') {
        clearTimeout(timeout);
        statusRef.off();
        
        // Get build metadata
        const buildSnapshot = await db.ref(`builds/${status.buildId}`).once('value');
        const build = buildSnapshot.val();
        
        resolve({
          success: true,
          buildId: status.buildId,
          logId: status.logId,
          storage: build.storage,
          releaseUrl: build.github?.releaseUrl,
          files: build.files
        });
      }
      
      if (status.status === 'failed') {
        clearTimeout(timeout);
        statusRef.off();
        reject(new Error(status.message));
      }
    });
  });
}
```

### Response Format

#### Successful Compilation
```javascript
{
  success: true,
  buildId: "build_1761324073116_1792a178",
  logId: "log_1761324073117_1dpdfxui", 
  storage: "github",
  releaseUrl: "https://github.com/username/repo/releases/tag/build_1761324073116_1792a178",
  files: {
    hex: {
      filename: "sketch.ino.hex",
      size: 5725,
      checksum: "abc123def456",
      downloadUrl: "https://github.com/username/repo/releases/download/build_1761324073116_1792a178/sketch.ino.hex"
    },
    elf: {
      filename: "sketch.ino.elf", 
      size: 25716,
      checksum: "def456ghi789",
      downloadUrl: "https://github.com/username/repo/releases/download/build_1761324073116_1792a178/sketch.ino.elf"
    }
  }
}
```

#### Failed Compilation
```javascript
{
  success: false,
  error: "Compilation error message"
}
```

### Status Updates

During compilation, you'll receive real-time status updates:

```javascript
{
  status: "compiling",
  progress: 60,
  message: "Compiling Arduino sketch...",
  phase: "compilation",
  elapsedTime: 13420,
  iteration: 3,
  logId: "log_1761324073117_1dpdfxui",
  buildId: "build_1761324073116_1792a178"
}
```

**Status Phases:**
- `handshake` (0-10%) - Request acknowledged
- `preparation` (10-40%) - Setting up environment
- `compilation` (40-80%) - Compiling code
- `delivery` (80-95%) - Uploading binaries
- `completion` (100%) - Finished successfully
- `error` (0%) - Failed

## 🌐 Web App Integration

### Express.js Example

```javascript
const express = require('express');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(require('./firebase-service-account.json')),
  databaseURL: "your-firebase-database-url"
});

const db = admin.database();

// Compile endpoint
app.post('/api/compile', async (req, res) => {
  const { code, board, libraries } = req.body;
  
  try {
    const result = await compileArduino(code, board, libraries);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Download redirect endpoint
app.get('/api/download/:buildId/:fileType', async (req, res) => {
  const { buildId, fileType } = req.params;
  
  try {
    const buildSnapshot = await db.ref(`builds/${buildId}`).once('value');
    const build = buildSnapshot.val();
    
    if (!build || !build.files[fileType]) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Redirect to GitHub download URL
    res.redirect(build.files[fileType].downloadUrl);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Arduino Cloud API running on port 3000');
});
```

### Next.js API Route Example

```javascript
// pages/api/compile.js
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

const db = admin.database();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { code, board, libraries } = req.body;
  
  try {
    const result = await compileArduino(code, board, libraries);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

### Frontend JavaScript Example

```javascript
async function compileCode() {
  const code = document.getElementById('arduino-code').value;
  const board = document.getElementById('board-select').value;
  
  try {
    // Show loading
    document.getElementById('status').textContent = 'Compiling...';
    
    // Submit compilation
    const response = await fetch('/api/compile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: code,
        board: board,
        libraries: []
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Show success
      document.getElementById('status').textContent = 'Compilation successful!';
      
      // Show download links
      const downloadDiv = document.getElementById('downloads');
      downloadDiv.innerHTML = '<h3>Download Files:</h3>';
      
      for (const [type, file] of Object.entries(result.files)) {
        const link = document.createElement('a');
        link.href = file.downloadUrl;
        link.textContent = `${file.filename} (${file.size} bytes)`;
        link.download = file.filename;
        downloadDiv.appendChild(link);
        downloadDiv.appendChild(document.createElement('br'));
      }
      
      // Show GitHub release
      if (result.releaseUrl) {
        const releaseLink = document.createElement('a');
        releaseLink.href = result.releaseUrl;
        releaseLink.textContent = 'View on GitHub';
        releaseLink.target = '_blank';
        downloadDiv.appendChild(releaseLink);
      }
      
    } else {
      document.getElementById('status').textContent = `Error: ${result.error}`;
    }
    
  } catch (error) {
    document.getElementById('status').textContent = `Network error: ${error.message}`;
  }
}
```

## 📊 Data Structures

### Firebase Paths

```
/desktops/{clientId}          # Desktop client registry
/requests/{clientId}/{requestId}  # Compilation requests  
/status/{requestId}           # Real-time status updates
/logs/{logId}                 # Unified logging system
/builds/{buildId}             # Build metadata with GitHub URLs
```

### Build Metadata Structure

```javascript
{
  buildId: "build_1761324073116_1792a178",
  requestId: "req_1761324073031_53dnx9yov", 
  logId: "log_1761324073117_1dpdfxui",
  clientId: "client_ZERO_BOOK_13_1761324051023",
  timestamp: 1761324073116,
  board: "arduino:avr:uno",
  status: "completed",
  storage: "github",
  
  github: {
    repo: "username/repository",
    releaseId: 257062482,
    releaseUrl: "https://github.com/username/repository/releases/tag/build_1761324073116_1792a178",
    releaseTag: "build_1761324073116_1792a178"
  },
  
  files: {
    hex: {
      filename: "sketch.ino.hex",
      size: 5725,
      checksum: "abc123def456", 
      githubUrl: "https://github.com/username/repository/releases/download/build_1761324073116_1792a178/sketch.ino.hex",
      downloadUrl: "https://github.com/username/repository/releases/download/build_1761324073116_1792a178/sketch.ino.hex"
    }
  }
}
```

## 🔍 Monitoring and Debugging

### Check System Status

```bash
# Check if desktop client is running
tasklist | findstr node

# View client logs
type arduino-cloud-system\client.log

# Check Firebase for active clients
# Use Firebase console or custom script
```

### Access Logs

```javascript
// Get unified log
const logSnapshot = await db.ref(`logs/${logId}`).once('value');
const log = logSnapshot.val();

// View timeline
const timeline = Object.values(log.timeline)
  .sort((a, b) => a.timestamp - b.timestamp);

timeline.forEach(entry => {
  console.log(`[${entry.source}] ${new Date(entry.timestamp).toISOString()} - ${entry.event}`);
});
```

### GitHub Integration

- **View Releases:** https://github.com/username/repository/releases
- **Download Files:** Direct URLs from build metadata
- **Version History:** Git release history

## 🚨 Error Handling

### Common Issues

1. **No Active Desktop Client**
   ```javascript
   Error: No active desktop client available
   ```
   **Solution:** Start desktop client with `node minimal-cloud-client-v2.js`

2. **Compilation Timeout**
   ```javascript
   Error: Compilation timeout
   ```
   **Solution:** Check Arduino CLI installation and board configuration

3. **GitHub Upload Failed**
   ```javascript
   Error: GitHub API error: 401
   ```
   **Solution:** Check GitHub token and repository permissions

4. **Firebase Connection Error**
   ```javascript
   Error: Firebase connection failed
   ```
   **Solution:** Verify service account credentials and database URL

### Error Response Format

```javascript
{
  success: false,
  error: "Detailed error message",
  code: "ERROR_CODE",
  details: {
    // Additional error context
  }
}
```

## 🔒 Security Considerations

### GitHub Token
- Use personal access tokens with minimal required scopes
- Store tokens securely (environment variables)
- Rotate tokens regularly

### Firebase
- Use service accounts with minimal permissions
- Secure database rules
- Monitor access logs

### Network Security
- Use HTTPS for all communications
- Validate all inputs
- Implement rate limiting

## 📈 Performance

### Compilation Times
- **Arduino Uno:** 3-5 seconds
- **ESP32:** 15-30 seconds  
- **With Libraries:** +5-10 seconds

### Storage Efficiency
- **GitHub:** Direct binary storage (no overhead)
- **Firebase:** Base64 encoding (+33% overhead)
- **Recommendation:** Use GitHub for production

### Scalability
- **Desktop Clients:** Multiple clients supported
- **Concurrent Requests:** Limited by desktop client capacity
- **Storage:** Unlimited (GitHub public repos)

## 🛠️ Development

### Project Structure
```
arduino-cloud-system/
├── minimal-cloud-client-v2.js    # Desktop client
├── github-uploader.js            # GitHub integration
├── job-logger.js                 # Logging system
├── status-checker.js             # Status API
├── comprehensive-test.js         # Test suite
├── firebase-service-account.json # Firebase credentials
├── github-config.json            # GitHub credentials
└── README.md                     # This file
```

### Running Tests

```bash
# Run comprehensive test suite
node comprehensive-test.js

# Test specific components
node status-checker.js [jobId]
```

### Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Support

- **Issues:** https://github.com/Jagadishpediredla/aiide/issues
- **Documentation:** This README and included guides
- **Examples:** See `test-cloud-api.js` for usage examples

## 🎯 Roadmap

- [ ] Multi-client load balancing
- [ ] Build caching system
- [ ] WebSocket real-time updates
- [ ] Docker containerization
- [ ] Kubernetes deployment
- [ ] Build analytics dashboard

---

**Built with ❤️ for the Arduino community**
