# SolarSight 3.0 - Intern Onboarding Guide

Welcome to SolarSight 3.0! This is an interactive solar panel array layout tool built with React and Google Maps.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Google Maps API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pzsejbish/SolarSight3.0.git
   cd SolarSight3.0
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example env file
   cp .env.example .env
   
   # Edit .env and add your Google Maps API key
   # REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   - Navigate to `http://localhost:3000`
   - You should see the SolarSight interface!

## 📚 Documentation

We have comprehensive guides to help you understand the system:

- **[QUICK_START_TESTING.md](QUICK_START_TESTING.md)** - How to test the tool
- **[ARRAY_SYSTEM_ARCHITECTURE.md](ARRAY_SYSTEM_ARCHITECTURE.md)** - Technical architecture
- **[ARRAY_INTEGRATION_GUIDE.md](ARRAY_INTEGRATION_GUIDE.md)** - Integration guide
- **[OBSTRUCTION_WORKFLOW_GUIDE.md](OBSTRUCTION_WORKFLOW_GUIDE.md)** - Obstruction features
- **[SOLARSIGHT_PORT_CHECKLIST.md](SOLARSIGHT_PORT_CHECKLIST.md)** - Porting to other projects

## 🎯 What Does This Tool Do?

SolarSight helps design solar panel layouts on commercial rooftops:

1. **Draw Building** - Click to outline the building on satellite imagery
2. **Add Obstructions** - Mark HVAC units, vents, and other obstacles
3. **Create Arrays** - Interactively place and size solar panel arrays
4. **Export Data** - Generate Excel-compatible grid layouts

## 🏗️ Project Structure

```
src/
├── SolarSight.js              # Main component
├── Components/
│   ├── ArrayCreationTool.js   # Interactive array creation
│   ├── ArrayControlPanel.js   # Array management UI
│   ├── ArrayWorkflowPanel.js  # Step-by-step workflow
│   ├── ObstructionDrawingTool.js  # Obstruction drawing
│   └── WorkflowControlPanel.js    # Main workflow navigation
└── utils/
    ├── ArrayManager.js        # Array data management
    ├── ArrayToGridReconciler.js   # Excel export logic
    └── ObstructionSetback.js  # Setback calculations
```

## 🔑 Getting a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials → API Key
5. Copy the key to your `.env` file

**Important:** For development, you can restrict the key to `localhost:3000`

## 🐛 Common Issues

### "Google Maps failed to load"
- Check your API key is correct in `.env`
- Verify the APIs are enabled in Google Cloud Console
- Make sure you restarted the dev server after changing `.env`

### "Panels not appearing"
- Ensure you've drawn a building polygon first
- Check that panel dimensions are set in the form
- Verify the setback polygon is valid (green outline)

### "Arrays not saving dimensions"
- This was recently fixed! Make sure you have the latest code
- Arrays now properly save when you click "Save" in the workflow

## 📝 Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Edit files in `src/`
   - Test thoroughly
   - Check browser console for errors

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Testing Checklist

Before submitting a PR, test these workflows:

- [ ] Draw a building polygon
- [ ] Create an array with rows and columns
- [ ] Edit an existing array
- [ ] Add an obstruction
- [ ] Delete an array
- [ ] Save and verify data structure

## 🎓 Learning Resources

### React Concepts Used
- Hooks (useState, useEffect, useCallback, useRef)
- Component composition
- Props and state management
- Event handling

### Google Maps API
- Polygon drawing
- Marker manipulation
- Geometry calculations
- Spherical computations

### Key Algorithms
- Setback polygon calculation (buffer zones)
- Panel grid generation
- Collision detection
- Coordinate transformations

## 💡 Tips for Interns

1. **Start with the docs** - Read QUICK_START_TESTING.md first
2. **Use console.log** - Many functions have helpful debug logs
3. **Check the browser console** - Errors and warnings appear there
4. **Ask questions** - If something is unclear, ask!
5. **Test incrementally** - Don't make too many changes at once

## 🤝 Contributing

1. Follow the existing code style
2. Add comments for complex logic
3. Test your changes thoroughly
4. Update documentation if needed
5. Keep commits focused and descriptive

## 📞 Getting Help

If you're stuck:
1. Check the documentation files
2. Look at the browser console for errors
3. Review similar code in the project
4. Ask your supervisor or team lead

## 🎉 Welcome to the Team!

You're working on a tool that helps design real solar installations. Your work matters!

Good luck and happy coding! 🌞
