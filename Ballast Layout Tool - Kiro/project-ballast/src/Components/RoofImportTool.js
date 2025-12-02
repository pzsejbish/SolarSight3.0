/**
 * RoofImportTool.js
 * Component for importing roof data from Google Solar API
 * Allows address lookup and automatic roof segment detection
 */

import React, { useState, useRef, useEffect } from "react";
import Swal from "sweetalert2";
import {
  findClosestBuilding,
  geocodeAddress,
  convertRoofSegmentsToPolygons,
  createBuildingOutline,
  createAccurateBuildingOutline,
  createEdgeDetectedOutline,
  extractRoofSegmentsFromGeoTIFF,
  formatSegmentInfo,
} from "../utils/GoogleSolarAPI";

const RoofImportTool = ({ mapRef, onRoofImported, googleMapsApiKey }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [address, setAddress] = useState(
    "1478 Stone Point Drive, Roseville, CA 95661"
  );
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    // Check if Google Maps API is fully loaded with Places library
    if (
      !window.google ||
      !window.google.maps ||
      !window.google.maps.places ||
      !inputRef.current
    ) {
      console.log("⏳ Waiting for Google Maps Places API to load...");
      return;
    }

    console.log("🔍 Initializing Google Places Autocomplete");

    const autocomplete = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ["address"],
        componentRestrictions: { country: "us" }, // Restrict to US addresses
      }
    );

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      console.log("📍 Place selected:", place);

      if (place.formatted_address) {
        setAddress(place.formatted_address);
      }

      // Pan map to selected location
      if (place.geometry && place.geometry.location && mapRef?.current) {
        mapRef.current.setCenter(place.geometry.location);
        mapRef.current.setZoom(20);
        console.log("✅ Map centered on:", place.formatted_address);
      }
    });

    autocompleteRef.current = autocomplete;

    return () => {
      if (autocompleteRef.current) {
        console.log("🧹 Cleaning up autocomplete");
        window.google.maps.event.clearInstanceListeners(
          autocompleteRef.current
        );
      }
    };
  }, [mapRef]); // Re-run when mapRef changes (indicates Google Maps is loaded)

  /**
   * Handle the roof import process for COMMERCIAL buildings
   * Uses aggressive simplification and single polygon
   */
  const handleImportRoofCommercial = async () => {
    if (!address.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Address Required",
        text: "Please enter an address to import roof data",
      });
      return;
    }

    if (!googleMapsApiKey) {
      Swal.fire({
        icon: "error",
        title: "API Key Missing",
        text: "Google Maps API key is not configured. Please check your .env file.",
      });
      return;
    }

    if (!window.google || !window.google.maps) {
      Swal.fire({
        icon: "error",
        title: "Google Maps Not Loaded",
        text: "Please wait for Google Maps to finish loading and try again.",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Geocode the address
      console.log("🔍 Geocoding address:", address);
      console.log("🌍 window.google.maps available:", !!window.google.maps);
      const location = await geocodeAddress(address, window.google);
      console.log("📍 Location found:", location.lat(), location.lng());

      // Center map on location
      if (mapRef.current) {
        mapRef.current.setCenter(location);
        mapRef.current.setZoom(20);
      }

      // Step 2: Fetch building insights from Solar API
      console.log("🌞 Fetching Solar API data...");
      const buildingInsights = await findClosestBuilding(
        location,
        googleMapsApiKey
      );

      // Step 3: Convert to roof segments with proper transformation
      const roofSegments = convertRoofSegmentsToPolygons(
        buildingInsights,
        window.google
      );

      // Step 4: Create accurate building outline using RGB edge detection
      console.log("🎯 Creating building outline using edge detection...");
      const buildingOutline = await createEdgeDetectedOutline(
        buildingInsights,
        googleMapsApiKey
      );

      console.log("✅ Roof data processed:", {
        segments: roofSegments.length,
        buildingOutline,
      });

      // Step 4: Let user choose import mode
      const { value: importMode } = await Swal.fire({
        title: "Import Roof Data",
        html: `
          <div style="text-align: left; margin: 20px 0;">
            <p><strong>Building Found:</strong></p>
            <p>📍 ${buildingInsights.postalCode || "Unknown location"}</p>
            <p>📏 Area: ${
              buildingOutline.metadata.buildingArea
                ? (buildingOutline.metadata.buildingArea * 10.7639).toFixed(0) +
                  " ft²"
                : "Unknown"
            }</p>
            <p>🏠 Roof Segments: ${roofSegments.length}</p>
            <p>📅 Imagery: ${buildingInsights.imageryDate?.month}/${
          buildingInsights.imageryDate?.year
        }</p>
            <p>📊 Quality: ${buildingInsights.imageryQuality}</p>
            <br>
            <p><strong>Choose import mode:</strong></p>
          </div>
        `,
        input: "radio",
        inputOptions: {
          single: `<strong>Single Building</strong><br><small>Import as one polygon (recommended for simple roofs)</small>`,
          segments: `<strong>Multiple Segments</strong><br><small>Import ${roofSegments.length} separate roof zones (for complex roofs)</small>`,
        },
        inputValidator: (value) => {
          if (!value) {
            return "Please select an import mode";
          }
        },
        showCancelButton: true,
        confirmButtonText: "Import",
        cancelButtonText: "Cancel",
        width: "600px",
      });

      if (!importMode) {
        setIsLoading(false);
        return;
      }

      // Step 5: Import based on selected mode
      if (importMode === "single") {
        // Import as single building outline
        onRoofImported({
          mode: "single",
          polygon: buildingOutline,
          buildingInsights,
        });

        Swal.fire({
          icon: "success",
          title: "Roof Imported!",
          text: "Building outline has been imported. You can now adjust it if needed.",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        // Import as multiple segments
        onRoofImported({
          mode: "segments",
          segments: roofSegments,
          buildingInsights,
        });

        // Show segment details
        const segmentList = roofSegments
          .map(
            (seg) =>
              `<li style="text-align: left; margin: 5px 0;">${formatSegmentInfo(
                seg
              )}</li>`
          )
          .join("");

        Swal.fire({
          icon: "success",
          title: "Roof Segments Imported!",
          html: `
            <div style="text-align: left;">
              <p>Imported ${roofSegments.length} roof segments:</p>
              <ul style="max-height: 200px; overflow-y: auto;">
                ${segmentList}
              </ul>
              <p style="margin-top: 15px;"><small>Each segment is color-coded by elevation. You can edit them individually.</small></p>
            </div>
          `,
          width: "700px",
        });
      }
    } catch (error) {
      console.error("❌ Roof import failed:", error);

      Swal.fire({
        icon: "error",
        title: "Import Failed",
        html: `
          <p>${error.message}</p>
          <br>
          <p style="font-size: 0.9em; color: #666;">
            <strong>Common issues:</strong><br>
            • Address not found or ambiguous<br>
            • No Solar API data available for this location<br>
            • API key not configured or invalid<br>
            • Location outside Solar API coverage area
          </p>
        `,
        width: "500px",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle the roof import process for RESIDENTIAL buildings
   * Uses GeoTIFF data to trace actual roof geometry
   */
  const handleImportRoofResidential = async () => {
    if (!address.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Address Required",
        text: "Please enter an address to import roof data",
      });
      return;
    }

    if (!googleMapsApiKey) {
      Swal.fire({
        icon: "error",
        title: "API Key Missing",
        text: "Google Maps API key is not configured. Please check your .env file.",
      });
      return;
    }

    if (!window.google || !window.google.maps) {
      Swal.fire({
        icon: "error",
        title: "Google Maps Not Loaded",
        text: "Please wait for Google Maps to finish loading and try again.",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Geocode the address
      console.log("🏠 [RESIDENTIAL] Geocoding address:", address);
      const location = await geocodeAddress(address, window.google);
      console.log("📍 Location found:", location.lat(), location.lng());

      // Center map on location with max zoom for residential detail
      if (mapRef.current) {
        mapRef.current.setCenter(location);
        mapRef.current.setZoom(22); // Max zoom for residential detail
      }

      // Step 2: Fetch building insights from Solar API
      console.log("🌞 Fetching Solar API data...");
      const buildingInsights = await findClosestBuilding(
        location,
        googleMapsApiKey
      );

      // Log what building was found
      console.log("🏢 Building found:", {
        center: buildingInsights.center,
        postalCode: buildingInsights.postalCode,
        distanceFromSearch:
          Math.sqrt(
            Math.pow(
              (buildingInsights.center.latitude - location.lat()) * 111000,
              2
            ) +
              Math.pow(
                (buildingInsights.center.longitude - location.lng()) *
                  111000 *
                  Math.cos((location.lat() * Math.PI) / 180),
                2
              )
          ).toFixed(1) + "m",
      });

      // Center map on the ACTUAL building center from API, not the geocoded address
      if (mapRef.current) {
        mapRef.current.setCenter({
          lat: buildingInsights.center.latitude,
          lng: buildingInsights.center.longitude,
        });
        mapRef.current.setZoom(22);
      }

      // Step 3: Extract roof segments from GeoTIFF data (actual geometry)
      console.log("🏠 Extracting roof segments from GeoTIFF...");
      const result = await extractRoofSegmentsFromGeoTIFF(
        buildingInsights,
        googleMapsApiKey
      );
      const roofSegments = result.segments;

      console.log("✅ Residential roof data processed:", {
        segments: roofSegments.length,
        hasOverlay: !!result.overlay,
      });

      if (roofSegments.length === 0) {
        throw new Error(
          "No roof segments could be extracted from the GeoTIFF data"
        );
      }

      // For residential, always import as segments to preserve roof complexity
      onRoofImported({
        mode: "segments",
        segments: roofSegments,
        overlay: result.overlay, // Include overlay for GeoTIFF image
        buildingInsights,
      });

      // Show segment details
      const segmentList = roofSegments
        .map(
          (seg) =>
            `<li style="text-align: left; margin: 5px 0;">${formatSegmentInfo(
              seg
            )}</li>`
        )
        .join("");

      Swal.fire({
        icon: "success",
        title: "Residential Roof Imported!",
        html: `
          <div style="text-align: left;">
            <p><strong>Building Found:</strong></p>
            <p>📍 ${buildingInsights.postalCode || "Unknown location"}</p>
            <p>🏠 Roof Segments: ${roofSegments.length}</p>
            <p>📅 Imagery: ${buildingInsights.imageryDate?.month}/${
          buildingInsights.imageryDate?.year
        }</p>
            <br>
            <p>Imported ${
              roofSegments.length
            } roof segments traced from GeoTIFF:</p>
            <ul style="max-height: 200px; overflow-y: auto;">
              ${segmentList}
            </ul>
            <p style="margin-top: 15px;"><small>Segments traced from actual roof geometry using height data. You can edit them individually.</small></p>
          </div>
        `,
        width: "700px",
      });
    } catch (error) {
      console.error("❌ Residential roof import failed:", error);

      Swal.fire({
        icon: "error",
        title: "Import Failed",
        html: `
          <p>${error.message}</p>
          <br>
          <p style="font-size: 0.9em; color: #666;">
            <strong>Common issues:</strong><br>
            • Address not found or ambiguous<br>
            • No Solar API data available for this location<br>
            • API key not configured or invalid<br>
            • Location outside Solar API coverage area
          </p>
        `,
        width: "500px",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "15px",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px",
        marginBottom: "15px",
        border: "2px solid #4CAF50",
      }}
    >
      <h3 style={{ margin: "0 0 10px 0", color: "#2c3e50" }}>
        🌞 Import Roof from Google Solar API
      </h3>

      <div style={{ marginBottom: "10px" }}>
        <input
          ref={inputRef}
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleImportRoofCommercial()}
          placeholder="Enter address (e.g., 1600 Amphitheatre Parkway, Mountain View, CA)"
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "10px",
            fontSize: "14px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            boxSizing: "border-box",
          }}
        />
      </div>

      <button
        onClick={handleImportRoofCommercial}
        disabled={isLoading}
        style={{
          width: "100%",
          padding: "12px",
          backgroundColor: isLoading ? "#95a5a6" : "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: isLoading ? "not-allowed" : "pointer",
          transition: "background-color 0.3s",
          marginBottom: "8px",
        }}
        onMouseOver={(e) =>
          !isLoading && (e.target.style.backgroundColor = "#45a049")
        }
        onMouseOut={(e) =>
          !isLoading && (e.target.style.backgroundColor = "#4CAF50")
        }
      >
        {isLoading
          ? "⏳ Loading roof data..."
          : "🏢 Auto-Detect Roof (Commercial)"}
      </button>

      <button
        onClick={handleImportRoofResidential}
        disabled={isLoading}
        style={{
          width: "100%",
          padding: "12px",
          backgroundColor: isLoading ? "#95a5a6" : "#2196F3",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: isLoading ? "not-allowed" : "pointer",
          transition: "background-color 0.3s",
        }}
        onMouseOver={(e) =>
          !isLoading && (e.target.style.backgroundColor = "#1976D2")
        }
        onMouseOut={(e) =>
          !isLoading && (e.target.style.backgroundColor = "#2196F3")
        }
      >
        {isLoading
          ? "⏳ Loading roof data..."
          : "🏠 Auto-Detect Roof (Residential)"}
      </button>

      <p
        style={{
          margin: "10px 0 0 0",
          fontSize: "12px",
          color: "#7f8c8d",
          lineHeight: "1.4",
        }}
      >
        <strong>Commercial:</strong> Single polygon, aggressive simplification,
        perfect for large flat roofs.
        <br />
        <strong>Residential:</strong> Traces actual roof geometry from GeoTIFF
        height data, preserves complex shapes.
      </p>
    </div>
  );
};

export default RoofImportTool;
