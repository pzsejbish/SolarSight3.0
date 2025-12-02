# Updated Workflow with Auto-Detection

## Step 1: Building Outline (NEW - Two Options)

```
┌─────────────────────────────────────────────────────────────┐
│                    STEP 1: BUILDING OUTLINE                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────┐    │
│  │  🌞 Import Roof from Google Solar API             │    │
│  │  ─────────────────────────────────────────────    │    │
│  │  Address: [_____________________________]         │    │
│  │                                                    │    │
│  │  [🏢 Auto-Detect Roof (Commercial)]               │    │
│  │  [🏠 Auto-Detect Roof (Residential)]              │    │
│  └───────────────────────────────────────────────────┘    │
│                                                             │
│                        OR                                   │
│                                                             │
│  ┌───────────────────────────────────────────────────┐    │
│  │  ✏️ Manual Drawing                                 │    │
│  │  ─────────────────────────────────────────────    │    │
│  │  Click points on the map to trace your building   │    │
│  └───────────────────────────────────────────────────┘    │
│                                                             │
│  💡 Tip: Use auto-detect above or click on map to draw     │
│                                                             │
│                      [Next →]                               │
└─────────────────────────────────────────────────────────────┘
```

## Complete Workflow

```
┌──────────────────────┐
│  Step 1: Building    │  ← NEW: Auto-detect OR manual draw
│  Outline             │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Step 2: Edit        │  ← Adjust polygon points
│  Building Outline    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Step 3: Draw        │  ← Mark obstructions
│  Obstructions        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Step 4: Edit        │  ← Adjust obstruction shapes
│  Obstructions        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Step 5: Create      │  ← Place solar panel arrays
│  Panel Arrays        │
└──────────────────────┘
```

## Auto-Detection Options

### 🏢 Commercial Mode

- **Best for**: Large flat roofs, warehouses, commercial buildings
- **Method**: Single polygon with aggressive simplification
- **Output**: One clean polygon covering the entire building
- **Speed**: Fast

### 🏠 Residential Mode

- **Best for**: Complex residential roofs with multiple planes
- **Method**: Traces actual roof geometry from GeoTIFF height data
- **Output**: Multiple segments representing different roof planes
- **Speed**: Slower but more accurate

## User Experience Flow

```
User enters address
        │
        ▼
Clicks auto-detect button
        │
        ▼
System fetches building data
        │
        ▼
User chooses import mode
   (single or segments)
        │
        ▼
Polygon appears on map
        │
        ▼
User can adjust points
        │
        ▼
Clicks "Next" to continue
```

## Fallback Behavior

If auto-detection fails (no data, API error, etc.):

1. User sees error message with helpful tips
2. User can try a different address
3. User can fall back to manual drawing
4. Drawing manager remains active for manual input
