# SolarSight 3.0 - Setup Instructions

## For Interns: First Time Setup

Follow these steps exactly to get SolarSight running on your machine.

### Step 1: Install Node.js

**Check if you have Node.js:**
```bash
node --version
```

If you see a version number (like `v18.x.x`), you're good! Skip to Step 2.

**If you don't have Node.js:**
1. Go to https://nodejs.org/
2. Download the LTS (Long Term Support) version
3. Run the installer
4. Restart your terminal/command prompt
5. Verify: `node --version`

### Step 2: Clone the Repository

```bash
# Navigate to where you want the project
cd ~/Documents  # or wherever you keep projects

# Clone the repo
git clone https://github.com/pzsejbish/SolarSight3.0.git

# Enter the directory
cd SolarSight3.0
```

### Step 3: Install Dependencies

```bash
npm install
```

This will take a few minutes. It's downloading all the libraries the project needs.

### Step 4: Get a Google Maps API Key

**Ask your supervisor for the API key**, or create your own:

1. Go to https://console.cloud.google.com/
2. Sign in with your Google account
3. Create a new project called "SolarSight Dev"
4. Click "Enable APIs and Services"
5. Enable these three APIs:
   - Maps JavaScript API
   - Places API  
   - Geocoding API
6. Go to "Credentials" → "Create Credentials" → "API Key"
7. Copy the key (it looks like: `AIzaSyAXhh_c0rrL1J9fruPB_l6Hz9d9EwVWFPM`)

### Step 5: Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Open .env in your text editor
# Replace "your_google_maps_api_key_here" with your actual key
```

Your `.env` file should look like:
```
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyAXhh_c0rrL1J9fruPB_l6Hz9d9EwVWFPM
GENERATE_SOURCEMAP=false
HOST=0.0.0.0
```

**Important:** Never commit the `.env` file to git! It's already in `.gitignore`.

### Step 6: Start the Development Server

```bash
npm start
```

You should see:
```
Compiled successfully!

You can now view the app in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

### Step 7: Open in Browser

1. Open your browser (Chrome recommended)
2. Go to `http://localhost:3000`
3. You should see the SolarSight interface!

## Troubleshooting

### "npm: command not found"
- Node.js isn't installed or not in your PATH
- Reinstall Node.js and restart your terminal

### "Failed to compile"
- Check the error message in the terminal
- Make sure all dependencies installed: `npm install`
- Try deleting `node_modules` and running `npm install` again

### "Google Maps failed to load"
- Check your API key in `.env`
- Make sure the APIs are enabled in Google Cloud Console
- Restart the dev server after changing `.env`

### Port 3000 already in use
```bash
# Kill the process using port 3000
# On Mac/Linux:
lsof -ti:3000 | xargs kill -9

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

### Still stuck?
1. Check the browser console (F12) for errors
2. Read the error messages carefully
3. Google the error message
4. Ask your supervisor

## Next Steps

Once you have it running:

1. Read [README_INTERNS.md](README_INTERNS.md) for an overview
2. Follow [QUICK_START_TESTING.md](QUICK_START_TESTING.md) to test features
3. Review [ARRAY_SYSTEM_ARCHITECTURE.md](ARRAY_SYSTEM_ARCHITECTURE.md) to understand the code

## Development Commands

```bash
# Start development server
npm start

# Run tests (if available)
npm test

# Build for production
npm run build

# Check for errors
npm run lint  # if configured
```

## Git Workflow

```bash
# Create a new branch for your work
git checkout -b feature/my-feature

# Make changes, then stage them
git add .

# Commit with a descriptive message
git commit -m "Add feature: description"

# Push to GitHub
git push origin feature/my-feature

# Create a Pull Request on GitHub
```

## Tips

- Keep the dev server running while you code
- Changes will auto-reload in the browser
- Check the browser console (F12) often
- Use `console.log()` to debug
- Save your work frequently with git commits

## Getting Help

- **Documentation:** Check the other .md files in this repo
- **Browser Console:** Press F12 to see errors and logs
- **Google:** Most errors have been solved by someone before
- **Team:** Ask your supervisor or teammates

Good luck! 🚀
