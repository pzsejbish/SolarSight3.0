/*!
 * --------------------------------------------------------------------------------
 * File: [Home.js]
 * Project: [Ballast Engineering Tool]
 * Created Date: [D12/29/2023]
 * Author: [James Bish, Arsen Tamamyan ]
 * Organization: PZSE Structural Engineers
 * --------------------------------------------------------------------------------
 * 
 * Copyright (c) [2024] PZSE Structural Engineers
 * 
 * This source code is the proprietary property of PZSE Structural Engineers and is
 * protected by international copyright and trade secret laws and treaties. No part
 * of this source code may be reproduced, copied, distributed, transmitted, broadcast,
 * displayed, sold, licensed, or otherwise exploited for any commercial purpose
 * whatsoever without the express prior written consent of PZSE Structural Engineers.
 * 
 * Use of this source code is governed by the terms of the agreement under which it
 * has been provided, which typically includes restrictions on use, disclosure,
 * modification, and conditions of license. If you have not received this source code
 * under such an agreement, then you have no rights to use it in any manner that
 * infringes the intellectual property rights of PZSE Structural Engineers.
 * 
 * --------------------------------------------------------------------------------
 */

import React, { useState, useRef, useEffect } from "react";
import { useFormData } from './FormDataContext';
//import { useJsApiLoader } from "@react-google-maps/api";
import { geocodeByAddress, getLatLng } from "react-places-autocomplete";
import MyMapComponent from "./MyMapComponent";
import AddressInput from "./AddressInput";
import CoordinatesInput from "./CoordinatesInput";
import RackingSystemCharacteristics from "./RackingSystemCharacteristics";
import BuildingCharacteristics from "./BuildingCharacteristics";
import EnvironmentalExposure from "./EnvironmentalExposure.js";
import LayoutWizard from "./LayoutWizard";
import SolarPanelDiagram from "./SolarPanelDiagram.js";
import LogoutButton from "./LogoutButton";
import SearchProjectButton from "./SearchProjectButton";
import { BackgroundBoxesDemo } from './Components/BackgroundBoxesDemo';
import { useLocation } from "react-router-dom";
import Swal from 'sweetalert2';
import { NoToneMapping } from "three";


function Home({ onLogout, isGoogleMapsLoaded }) {
  const defaultLat = 38.7545435; // Example latitude for Roseville, CA
  const defaultLng = -121.2499974; // Example longitude for Roseville, CA
  const defaultZoom = 19; // Example zoom level
  const { formData, setFormData, resetFormData } = useFormData();
  const [isPopulating, setIsPopulating] = useState(false);
  const autoSelectLayoutRef = useRef(null);
  const [address, setAddress] = useState("");
  const [coordinates, setCoordinates] = useState({ lat: "", lng: "" });
  const [mapCenter, setMapCenter] = useState({
    lat: defaultLat,
    lng: defaultLng,
  }); // Replace with default coordinates
  const [mapZoom, setMapZoom] = useState(defaultZoom); // Replace with a default zoom level, e.g., 8
  const [isReturningToHome, setIsReturningToHome] = useState(false);
  const [resetLayoutWizard, setResetLayoutWizard] = useState(false);
  const location = useLocation();
  const prevLocationRef = useRef(location);



  const gridCriticalParams = [
    'pv_module_ns_length',
    'pv_module_ew_width',
    'distance_between_panels_ns',
    'distance_between_panels_ew',
    'setback_distance'
  ];

    // Add this new handler function for form field changes
    const handleFormFieldChange = (fieldName, newValue, fullFormData) => {
      // Only handle special cases for map-based layouts and grid-critical params
      if (formData._isMapBased && formData._originalGridParams && gridCriticalParams.includes(fieldName)) {
        const originalValue = formData._originalGridParams[fieldName];
        
        if (originalValue !== undefined && parseFloat(newValue) !== parseFloat(originalValue)) {
          Swal.fire({
            title: 'Warning: Grid Parameter Change',
            text: 'Changing this parameter will require regenerating the panel layout. Your existing panel positions will be cleared, but the roof outline will be preserved.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Continue',
            cancelButtonText: 'Cancel'
          }).then((result) => {
            if (result.isConfirmed) {
              setFormData(prev => ({
                ...fullFormData,  // Use the full form data update
                panel_layout: prev.panel_layout?.map(layout => ({
                  ...layout,
                  layout: layout.layout.map(row => 
                    row.map(cell => 
                      cell === 'intersects' ? cell : 'non-value'
                    )
                  )
                })) || []
              }));
            } else {
              // Revert only the changed field
              setFormData(prev => ({
                ...prev,
                [fieldName]: originalValue
              }));
            }
          });
        } else {
          // If no warning needed, update normally with full form data
          setFormData(fullFormData);
        }
      } else {
        // For non-grid-critical parameters or non-map-based layouts, update normally
        setFormData(fullFormData);
      }
    };


  useEffect(() => {
    const handlePopState = () => {
      if (location.pathname === '/' || location.pathname === '/home') {
        console.log("Detected return to home page via back button");
        resetFormData();
        console.log("Form data reset, including panel layout");
      }
    };
  
    window.addEventListener('popstate', handlePopState);
  
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location, resetFormData]);

  const handleCoordinatesChange = (e) => {
    setCoordinates({ ...coordinates, [e.target.name]: e.target.value });
  };

  // Function to handle reverse geocoding
  const reverseGeocode = async () => {
    if (!isGoogleMapsLoaded) {
      console.error('Google Maps API is not loaded yet.');
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode(
      {
        location: {
          lat: parseFloat(coordinates.lat),
          lng: parseFloat(coordinates.lng),
        },
      },
      (results, status) => {
        if (status === "OK" && results[0]) {
          const full_address = results[0].formatted_address;
          setAddress(full_address);

          let street_address = "";
          let city = "";
          let state = "";
          let zip = "";

          results[0].address_components.forEach((component) => {
            const types = component.types;
            const value = component.long_name;

            if (types.includes("street_number")) {
              street_address += value + " ";
            }
            if (types.includes("route")) {
              street_address += value;
            }
            if (types.includes("locality")) {
              city = value;
            }
            if (types.includes("administrative_area_level_1")) {
              state = value;
            }
            if (types.includes("postal_code")) {
              zip = value;
            }
          });

          setFormData({
            ...formData,
            full_address,
            street_address,
            city,
            state,
            zip,
            latLng: {
              lat: parseFloat(coordinates.lat),
              lng: parseFloat(coordinates.lng),
            },
          });

          setMapCenter({
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          });
          setMapZoom(19); // Example zoom level for a close-up view
        } else {
          console.log("Address not found for the provided coordinates.");
          setAddress("");
          setFormData({
            ...formData,
            full_address: "",
            street_address: "",
            city: "",
            state: "",
            zip: "",
            latLng: {},
          });
        }
      }
    );
  };

  const handleSelect = async (value) => {
    if (!isGoogleMapsLoaded) {
      console.error('Google Maps API is not loaded yet.');
      return;
    }
    try {
      const results = await geocodeByAddress(value);
      const latLng = await getLatLng(results[0]);
      setAddress(value); // This sets the full address in the input as provided by the user
      setCoordinates(latLng); // This updates the coordinates state
      setMapCenter(latLng); // This updates the map's center
      setMapZoom(18); // This updates the map's zoom level to a closer view

      let street_address = ""; // This will hold the street number and route
      let city = "";
      let state = "";
      let zip = "";

      // Extract street address, city, state, and ZIP code from the address components
      results[0].address_components.forEach((component) => {
        const types = component.types;
        const value = component.long_name;

        if (types.includes("street_number")) {
          street_address += value + " ";
        }
        if (types.includes("route")) {
          street_address += value;
        }
        if (types.includes("locality")) {
          city = value;
        }
        if (types.includes("administrative_area_level_1")) {
          state = value;
        }
        if (types.includes("postal_code")) {
          zip = value;
        }
      });

      // Update formData with the detailed address components
      setFormData({
        ...formData,
        full_address: value, // Full address
        street_address, // Street address
        city, // City
        state, // State
        zip, // ZIP code
        latLng, // Latitude and Longitude
      });
    } catch (error) {
      console.error("Error", error);
    }
  };


  const isFormComplete = () => {
    // List of all required field keys in formData
    const requiredFields = [
      "full_address",
      "street_address",
      "city",
      "state",
      "zip",
      "latLng",
      "tilt_angle",
      "pv_module_weight",
      "pv_module_ns_length",
      "pv_module_ew_width",
      "ballast_stone",
      "avg_roof_pitch",
      "roof_height",
      "parapet_height",
      "exposure_category",
      "distance_between_panels_ns",
      "distance_between_panels_ew",
      "ground_snow_load",
      "wind_speed",
      "exposure_category",
      "risk_category",
      "sun_ballast_system"

      // ... include all other required field keys from formData
    ];

    const allFieldsFilled = requiredFields.every((field) => {
      const value = formData[field];
      if (typeof value === "string") return value.trim() !== "";
      return value != null;
    });

    // Add pitch validation
    const pitchValid = formData.avg_roof_pitch !== "" && 
      parseFloat(formData.avg_roof_pitch) >= 0 && 
      parseFloat(formData.avg_roof_pitch) <= 7;

    return allFieldsFilled && pitchValid;
  };

  if (!isGoogleMapsLoaded) {
    return <div>Loading Google Maps...</div>;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-900 overflow-hidden">
      <div className="absolute inset-0 z-0 h-full w-full">
        <BackgroundBoxesDemo />
      </div>
      <div className="relative z-10 w-full max-w-7xl bg-white shadow-lg rounded-lg px-8 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-14 flex flex-col items-center justify-center">
        <div className="w-full">
          <div className="flex justify-between h-12 mt-5 mb-20">
            <div className="logo">
              <img
                src="https://raw.githubusercontent.com/PZSE/HTMLImageHosting/main/final_pzse_logo_transparent.png"
                alt="PZSE Logo"
                className="w-40"
              />
            </div>
            <div>
              <LogoutButton onLogout={onLogout} />
            </div>
          </div>
          <div className="mt-36">
            <h1 className="font-semibold text-2xl text-left">Search for an existing project</h1>
            <SearchProjectButton 
              formData={formData} 
              setFormData={setFormData}
              selectLayoutMethod={() => autoSelectLayoutRef.current("rectangular")}
              setIsPopulating={setIsPopulating}
              />
            <h1 className="font-semibold text-2xl text-left">or start a new project</h1>
          </div>
          <h1 className="font-bold text-2xl text-center">Ballast Engineering Tool</h1>
          <h2 className="font-semibold text-xl text-center">Project Location</h2>
          <div className="grid md:gap-6 md:grid-cols-2">
            <div className="left-column">
              <AddressInput
                address={address}
                setAddress={setAddress}
                handleSelect={handleSelect}
                formData={formData}
              />
              <div className="my-4 text-center">
                <span>OR</span>
              </div>
              <CoordinatesInput
                coordinates={coordinates}
                handleCoordinatesChange={handleCoordinatesChange}
                reverseGeocode={reverseGeocode}
                formData={formData}
                setCoordinates={setCoordinates}
              />
            </div>
            <div tabIndex="-1" className="right-column" point-events="none">
              <MyMapComponent
                center={mapCenter}
                zoom={mapZoom}
              />
            </div>
          </div>
          <hr className="my-10 border-gray-200 sm:mx-auto dark:border-gray-700"></hr>
          <h2 className="font-semibold text-xl text-left">Racking System Characteristics</h2>
          <SolarPanelDiagram formData={formData} setFormData={setFormData} />
          <div className="grid md:grid-cols-3 md:gap-6 my-8">
          <div className="flex items-start my-7">
            <RackingSystemCharacteristics
              formData={formData}
              setFormData={setFormData}
              systemType={formData.sun_ballast_system || "south-face-system"}
            />
          </div>
            <div>
              <h2 className="font-semibold text-xl text-center">Building Characteristics</h2>
              <BuildingCharacteristics
                formData={formData}
                setFormData={setFormData}
              />
            </div>
            <div>
              <h2 className="font-semibold text-xl text-center">Environmental Exposure</h2>
              <EnvironmentalExposure
                formData={formData}
                setFormData={setFormData}
              />
            </div>
          </div>
          <div className="mb-4 notes-section">
            <label className="block text-sm font-medium leading-6 text-gray-900" htmlFor="notes">Notes:</label>
            <textarea
              id="notes"
              name="notes"
              value={formData?.notes || ''}  // Ensure the component is controlled
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}  // proper way
              placeholder="Enter any notes here..."
              className="w-full h-32 p-2 mt-2 border rounded notes-input"
            ></textarea>
          </div>
          <div className="container">
            <LayoutWizard
              formData={formData}
              setFormData={setFormData}
              isFormComplete={isFormComplete}
              onAutoSelectLayout={autoSelectLayoutRef}
              isPopulating={isPopulating}
              mapCenter={mapCenter} // Pass the mapCenter to LayoutWizard
              isReturningToHome={isReturningToHome}
              resetLayoutWizard={resetLayoutWizard}
            />
          </div>
        </div>
        <footer className="bg-white rounded shadow dark:bg-gray-900 mt-3 mb-2 w-full">
          <div className="w-full max-w-screen-xl mx-auto px-4 py-2">
            <div className="sm:flex sm:items-center sm:justify-between">
              <a
                href="https://portal.pzse.com/"
                rel="noreferrer"
                target="_blank"
                className="flex items-center mb-4 sm:mb-0 space-x-3 rtl:space-x-reverse"
              >
                <img
                  src="https://raw.githubusercontent.com/PZSE/HTMLImageHosting/main/final_pzse_logo_transparent.png"
                  className="h-20"
                  alt="Flowbite Logo"
                />
              </a>
              <div></div>
            </div>
            <hr className="mt-3 mb-3 border-gray-200 sm:mx-auto dark:border-gray-700" />
            <span className="block text-sm text-gray-600 sm:text-center">
              © 2024{" "}
              <a
                href="https://portal.pzse.com/"
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                PZSE Structural Engineers
              </a>
              . All Rights Reserved.
            </span>
            <span className="block text-xs text-gray-400 sm:text-center mb-1">
              This application is licensed by PZSE Structural Engineers and available under the terms and conditions of the agreement provided to selected clients for the specified software
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
  

}

export default Home;