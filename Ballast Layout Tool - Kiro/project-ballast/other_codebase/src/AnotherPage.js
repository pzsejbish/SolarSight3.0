/*!
 * --------------------------------------------------------------------------------
 * File: [AntoherPagejs]
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

import React, { useState, useCallback, useEffect, useMemo } from "react";
import RooftopVisualizer from "./RooftopVisualizer";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useFormData } from './FormDataContext';
import RotateButton from './RotateButton';
import LogoutButton from "./LogoutButton";
import Swal from "sweetalert2";
import { useNavigate } from 'react-router-dom';

// import "./App.css";

function AnotherPage({onLogout}) {
  const { formData, setFormData } = useFormData();
  const [isObstructionMode, setIsObstructionMode] = useState(false);
  const [panel_width, set_panel_width] = useState(formData["pv_module_ew_width"]); // Using value from formData
  const [panel_length, set_panel_length] = useState(formData["pv_module_ns_length"]); // Using value from formData
  const [building_rotation, set_building_rotation] = useState(Number(formData["building_rotation"])); // 0 or 90
  const navigate = useNavigate();
  const [isReadyToSubmit, setIsReadyToSubmit] = useState(false);

  useEffect(() => {
    console.log("AnotherPage mounted");
    window.scrollTo(0, 0);
    return () => {
      console.log("AnotherPage unmounted");
    };
  }, []);
  
  useEffect(() => {
    console.log("Building rotation updated:", building_rotation);
  }, [building_rotation]);

  const handleRotateBuilding = () => {
    // Toggle between 0 and 90 degrees
    const newRotation = building_rotation === 0 ? 90 : 0;
    set_building_rotation(newRotation);
    console.log("Rotating building to:", newRotation);
};



  // State to store both scale and pan positions
  const [transformState, setTransformState] = useState({
    scale: 1,
    positionX: 0,
    positionY: 0,
  });  

  const handleLayoutChange = useCallback((layout) => {
    console.log("Received new layout from RooftopVisualizer:", layout);
    setFormData(prevFormData => {
      if (JSON.stringify(prevFormData.panel_layout) !== JSON.stringify(layout)) {
        return {
          ...prevFormData,
          panel_layout: layout
        };
      }
      return prevFormData;
    });
    setIsReadyToSubmit(true);
  }, [setFormData]);  

  const handleSubmit = async () => {
    if(!isReadyToSubmit) {
      console.log("Please wait");
      return;
    }
    
    const { latLng, ...restOfData } = formData;
    const lat = latLng?.lat;
    const lng = latLng?.lng;

    // Log the values to check them
    console.log("latLng from formData:", latLng);
    console.log("Extracted lat:", lat);
    console.log("Extracted lng:", lng);

    if (lat === undefined || lng === undefined) {
      console.error("Latitude or longitude is undefined");
      // You might want to show an error message to the user here
      return;
    }

    // Combine formData with additional data
  const completeData = {
      ...restOfData,
      lat,
      lng,
      panel_width,
      panel_length,
      building_rotation,
      panel_layout: formData.panel_layout,
      // Add other relevant data
    };

    console.log("Complete data for submission:", completeData);

    const jsonData = JSON.stringify(completeData);
    console.log("JSON data ready for submission:", jsonData);

    // Call the function to make the API request
    await sendJsonDataToAPI(jsonData);
  };

const sendJsonDataToAPI = async (jsonData) => {
  const authToken = localStorage.getItem('authToken');

  try {
    const response = await fetch('https://api-training.pzse.com/api/internal/ballast/projects', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: jsonData,
    });

    if (response.ok) {
        const data = await response.json();
        console.log('Data successfully submitted:', data);
        // Handle success with SweetAlert
        Swal.fire({
          title: 'Success!',
          text: 'Data successfully submitted',
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then((result) => {
          if (result.isConfirmed) {
            navigate('/home'); // Redirect to Home.js when user clicks 'OK'
          }
        });
    } else {
        // The server responded with a status code outside the range 200-299
        console.error('Failed to submit data:', response.status, response.statusText);
        // Handle error with SweetAlert
        Swal.fire({
          title: 'Error!',
          text: 'Failed to submit data',
          icon: 'error',
          confirmButtonText: 'Ok'
        });
    }
  } catch (error) {
    console.error('Error during API call:', error);
    // Handle network error with SweetAlert
    Swal.fire({
      title: 'Error!',
      text: 'An error occurred during the API call',
      icon: 'error',
      confirmButtonText: 'Ok'
    });
  }
};

const memoizedRooftopVisualizer = useMemo(() => (
  <RooftopVisualizer
    className="w-full h-full justify-center"
    buildingWidth={parseFloat(formData["building_width"])}
    buildingLength={parseFloat(formData["building_length"])}
    panelNsLength={parseFloat(panel_length)}
    panelEwWidth={parseFloat(panel_width)}
    distanceBetweenPanelsNS={parseFloat(formData["distance_between_panels_ns"])}
    distanceBetweenPanelsEW={parseFloat(formData["distance_between_panels_ew"])}
    setbackDistance={parseFloat(formData["setback_distance"] || 0)}
    transformState={transformState}
    isObstructionMode={isObstructionMode}
    building_rotation={building_rotation}
    panel_layout={formData.panel_layout}
    onLayoutChange={handleLayoutChange}
  />
), [
  formData,
  panel_length,
  panel_width,
  transformState,
  isObstructionMode,
  building_rotation,
  handleLayoutChange
]);

useEffect(() => {
  window.scrollTo(0, 0);
}, []);

  return (
    <div className="mx-5 h-svh">
      <div className="logo flex row ">
        <img
            src="https://raw.githubusercontent.com/PZSE/HTMLImageHosting/main/final_pzse_logo_transparent.png"
            alt="PZSE Logo"
            className="w-40"
        />
        <h1 className="font-bold text-2xl mx-9 self-center place-self-center">Build your Layout</h1>
        <div className="ml-auto mx-9 self-center  w-min ">
          <LogoutButton onLogout={onLogout} />
        </div>
      </div>
      <div className="flex h-3/4 rounded bg-white shadow dark:bg-gray-900 border-2 ">
        <TransformWrapper
          className="w-full h-full"
          initialScale={0.1}
          initialPositionX={0}
          initialPositionY={0}
          minPositionX={0}
          minPositionY={0}
          minScale={0.05}
          maxScale={2}
          limitToBounds={false}
          centerOnInit={true}
          centerZoomedOut={false}
          wheel={{ step: 0.001 }}
          onZoom={(zoomEvent) => {
            const { scale, positionX, positionY } = zoomEvent.state;
            setTransformState({ scale, positionX, positionY });
          }}
          onPanning={(pan) =>
            setTransformState((prevState) => ({
              ...prevState,
              positionX: pan.state.positionX,
              positionY: pan.state.positionY,
            }))
          }
          panning={{
            disabled: false,
            limitToWrapperBounds: true,
            activationKeys: ["Control"],
          }}
        >
          {({ zoomIn, zoomOut, resetTransform, setTransform, ...rest }) => (
            <React.Fragment>
              <div className="flex flex-col h-full bg-white rounded shadow dark:bg-gray-900 border-l-1 border-r-2">
                <div className="zoom-tools grid grid-cols-3 gap-2 mb-4">
                  <button
                    className="flex w-full mt-4 justify-center rounded bg-blue-900 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-yellow-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
                    onClick={() => {
                      zoomIn(0.1);
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      dataslot="icon"
                      className="w-5 h-5"
                    >
                      <path d="M9 6a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5A.75.75 0 0 1 9 6Z" />
                      <path
                        fillRule="evenodd"
                        d="M2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Zm7-5.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    className="flex w-full mt-4 justify-center rounded bg-blue-900 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-yellow-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
                    onClick={() => {
                      zoomOut(0.1);
                      setTransform(
                        transformState.positionX,
                        transformState.positionY,
                        transformState.scale
                      );
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      dataslot="icon"
                      className="w-5 h-5"
                    >
                      <path d="M6.75 8.25a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z" />
                      <path
                        fillRule="evenodd"
                        d="M9 2a7 7 0 1 0 4.391 12.452l3.329 3.328a.75.75 0 1 0 1.06-1.06l-3.328-3.329A7 7 0 0 0 9 2ZM3.5 9a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    className="flex w-full mt-4 justify-center rounded bg-blue-900 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-yellow-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
                    onClick={() => {
                      resetTransform();
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      dataslot="icon"
                      className="w-5 h-5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
                <div className="mode-switcher mb-4">
                  <button
                    className={`w-full justify-center rounded ${
                      isObstructionMode
                        ? "bg-blue-900 hover:bg-yellow-400"
                        : "bg-red-500 hover:bg-yellow-400"
                    } px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900`}
                    onClick={() => setIsObstructionMode(!isObstructionMode)}
                  >
                    {isObstructionMode ? "Panel Mode" : "Obstruction Mode"}
                  </button>
                </div>
                <div className="panel-sizes">
                  <div className="mb-4">
                    <label className="block text-sm font-medium leading-6 text-gray-900">
                      Panel Width (Ft.)
                    </label>
                    <input
                      id="panel_width"
                      className="block w-full rounded border-0 py-1.5 pl-5 pr-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={panel_width}
                      onChange={(e) => set_panel_width(parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium leading-6 text-gray-900">
                      Panel Length (Ft.)
                    </label>
                    <input
                      id="panel_length"
                      className="block w-full rounded border-0 py-1.5 pl-5 pr-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={panel_length}
                      onChange={(e) => set_panel_length(parseFloat(e.target.value))}
                    />
                  </div>
                </div>
                        <RotateButton
                        className="mb-4"
                        building_rotation={building_rotation}
                        onClick={handleRotateBuilding}
                         />
                        <button onClick={handleSubmit} disabled={!isReadyToSubmit} className="flex w-full mt-4 justify-center rounded bg-green-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-yellow-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                        Submit Layout
                      </button> 
                    </div>                  
              <TransformComponent
                wrapperStyle={{
                  width: "100%",
                  height: "100%",
                }}
              >
                {memoizedRooftopVisualizer}
              </TransformComponent>
            </React.Fragment>
            
          )}
        </TransformWrapper>
        
      </div>
      <footer className="bg-white rounded shadow dark:bg-gray-900 mb-2 w-full">
          <div className="w-full max-w-screen-xl mx-auto px-4 ">
            <hr className=" mb-3 border-gray-200 sm:mx-auto dark:border-gray-700 border-b-2" />
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
              This application is licensed to SunBallast, Italy, for the term
              ending after [12/31/2024], with rights to unlimited submissions
              as per the terms of the agreement.
            </span>
          </div>
        </footer>
    </div>
  );
}

export default AnotherPage;
