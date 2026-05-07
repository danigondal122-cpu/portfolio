import React from "react";
import { imageLoader } from "../utils/assets/imageLoader";
export default function About() {
  return (
    <div
    id="home"
      className="w-full max-h-[200vh] min-h-[150vh] bg-cover bg-center flex items-center justify-center"
      style={{
        backgroundImage: `url(${imageLoader.get('/images/bg_1.png')?.src})`,
      }}
    >
      {/* Overlay (optional for readability) */}
      <div className="w-full h-full  absolute"></div>

      {/* Content Container */}
     
    </div>
  );
}