# SolarSight 3.0

An interactive solar panel array layout tool for commercial rooftops, built with React and Google Maps API.

![SolarSight Demo](https://img.shields.io/badge/status-active-success.svg)
![React](https://img.shields.io/badge/react-18.x-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🌟 Features

- **Interactive Building Drawing** - Click to draw building polygons on satellite imagery
- **Automatic Setback Calculation** - Generates code-compliant setback zones
- **Obstruction Management** - Draw and manage rooftop obstructions (HVAC, vents, etc.)
- **4-Directional Array Creation** - Intuitive drag-to-expand array placement
- **Array Editing** - Resize, rotate, and reposition existing arrays
- **Excel Export** - Converts arrays to giant grid format for calculations
- **Real-time Validation** - Prevents panel placement in invalid areas

## 🚀 Quick Start

### For Interns & New Developers

**Start here:** [SETUP.md](SETUP.md) - Complete setup instructions

**Then read:** [README_INTERNS.md](README_INTERNS.md) - Onboarding guide

### For Experienced Developers

```bash
# Clone and install
git clone https://github.com/pzsejbish/SolarSight3.0.git
cd SolarSight3.0
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your Google Maps API key

# Start development server
npm start
```

## 📚 Documentation

- **[SETUP.md](SETUP.md)** - Detailed setup instructions
- **[README_INTERNS.md](README_INTERNS.md)** - Intern onboarding guide
- **[QUICK_START_TESTING.md](QUICK_START_TESTING.md)** - Testing guide
- **[ARRAY_SYSTEM_ARCHITECTURE.md](ARRAY_SYSTEM_ARCHITECTURE.md)** - Technical architecture
- **[ARRAY_INTEGRATION_GUIDE.md](ARRAY_INTEGRATION_GUIDE.md)** - Integration guide
- **[OBSTRUCTION_WORKFLOW_GUIDE.md](OBSTRUCTION_WORKFLOW_GUIDE.md)** - Obstruction features
- **[SOLARSIGHT_PORT_CHECKLIST.md](SOLARSIGHT_PORT_CHECKLIST.md)** - Porting to other projects

## 🏗️ Architecture

```
src/
├── SolarSight.js                    # Main orchestrator component
├── Components/
│   ├── ArrayCreationTool.js         # Interactive array creation
│   ├── ArrayControlPanel.js         # Array management UI
│   ├── ArrayWorkflowPanel.js        # Step-by-step workflow
│   ├── ObstructionDrawingTool.js    # Obstruction drawing
│   ├── WorkflowControlPanel.js      # Main workflow navigation
│   └── ErrorBoundary.js             # Error handling
└── utils/
    ├── ArrayManager.js              # Array data management
    ├── ArrayToGridReconciler.js     # Excel export logic
    ├── ObstructionSetback.js        # Setback calculations
    └── PolygonProcessing.js         # Polygon utilities
```

## 🔑 Requirements

- Node.js 16+
- Google Maps API key with these APIs enabled:
  - Maps JavaScript API
  - Places API
  - Geocoding API

## 🎯 Workflow

1. **Draw Building** - Click points to outline the building
2. **Add Obstructions** - Draw polygons around obstacles
3. **Create Arrays** - Click origin, drag arrows to size
4. **Edit & Refine** - Adjust arrays as needed
5. **Export** - Generate Excel-compatible grid data

## 🛠️ Development

```bash
# Start dev server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## 🐛 Troubleshooting

### Google Maps not loading
- Verify API key in `.env`
- Check APIs are enabled in Google Cloud Console
- Restart dev server after changing `.env`

### Panels not appearing
- Draw building polygon first
- Verify panel dimensions in form data
- Check browser console for errors

See [SETUP.md](SETUP.md) for more troubleshooting tips.

## 📦 Key Dependencies

- `react` - UI framework
- `@googlemaps/js-api-loader` - Google Maps integration
- `react-dom` - React rendering

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Test thoroughly (see [QUICK_START_TESTING.md](QUICK_START_TESTING.md))
4. Commit: `git commit -m "Add feature: description"`
5. Push: `git push origin feature/my-feature`
6. Create a Pull Request

## 📝 Recent Updates

- **Array Dimension Persistence** - Fixed bug where array dimensions weren't saved correctly
- **Clean Public Release** - Removed sensitive data, added comprehensive documentation
- **Intern-Friendly** - Added detailed setup and onboarding guides

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

Built for PZSE by the engineering team. Special thanks to all contributors and interns who have worked on this project.

## 📞 Support

- Check the documentation files first
- Review browser console for errors
- Contact your supervisor or team lead

---

**Built with ❤️ for solar energy** ☀️
