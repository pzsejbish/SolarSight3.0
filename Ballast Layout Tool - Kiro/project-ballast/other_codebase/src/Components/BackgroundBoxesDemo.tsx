"use client";
import React from "react";
import { Boxes } from "./ui/BackgroundBoxes";


export function BackgroundBoxesDemo() {
  return (
    <div className="h-full relative w-full overflow-hidden bg-blue-900 flex flex-col items-center justify-center rounded-lg">
      <div className="absolute inset-0 w-full h-full bg-slate-900 z-0 pointer-events-none items-center [mask-image:radial-gradient(transparent,white)]" />
      <div className="absolute inset-0 w-full h-full z-10 opacity-75">
        <Boxes />
      </div>
      <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-transparent to-blue-900 opacity-50 z-20 pointer-events-none"></div>
    </div>
  );
}
