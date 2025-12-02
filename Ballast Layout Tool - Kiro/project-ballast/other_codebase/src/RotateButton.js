/*!
 * --------------------------------------------------------------------------------
 * File: [RotateButton.js]
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

import React from 'react';

const RotateButton = React.memo(({ building_rotation, onClick }) => {
  // Log the value of buildingRotation

  return (
    <button
      className="flex w-full justify-center rounded bg-blue-900 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-yellow-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      onClick={onClick}
    >
      {building_rotation === 0 ? "Rotate to Landscape" : "Rotate to Portrait"}
    </button>
  );
});

export default RotateButton;
