// CoordinatesInput.js
/*!
 * --------------------------------------------------------------------------------
 * File: [PCoordinatesInput.js]
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
import React, { useEffect } from 'react';

const CoordinatesInput = ({ coordinates, handleCoordinatesChange, reverseGeocode, formData, setCoordinates }) => {
  // Sync the coordinates with formData.latLng when formData changes
  useEffect(() => {
    if (formData.latLng) {
      setCoordinates({
        lat: formData.latLng.lat || '',
        lng: formData.latLng.lng || ''
      });
    }
  }, [formData.latLng, setCoordinates]);

  return (
    <div className="grid grid-rows-2">
      <div className="grid grid-cols-1 gap-0 sm:gap-4 sm:grid-cols-2">
        <div className="mb-4">
          <label className="block text-sm font-medium leading-6 text-gray-900" htmlFor="latitude-input">Lat</label>
          <input
            id="latitude-input"
            className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
            name="lat"
            type="text"
            placeholder="Latitude"
            value={coordinates.lat}
            onChange={handleCoordinatesChange}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium leading-6 text-gray-900" htmlFor="longitude-input">Lng</label>
          <input
            id="longitude-input"
            className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
            name="lng"
            type="text"
            placeholder="Longitude"
            value={coordinates.lng}
            onChange={handleCoordinatesChange}
          />
        </div>
      </div>
      <div className="mb-4 content-end">
        <button
          className="flex w-full justify-center rounded bg-blue-900 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-yellow-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900"
          onClick={reverseGeocode}
        >
          Get Address by coordinates
        </button>
      </div>
    </div>
  );
};

export default CoordinatesInput;

