import React, { useRef, useEffect } from "react";
import { imageLoader } from "../utils/assets/imageLoader";
import { OrbitalSystem } from "../utils/pixel_detection/Orbitalsystem";
import { useOrbitConfig } from "../hooks/useBreakpoint";
const TechStack = () => {
  const orbitImgRef = useRef(null);
   const orbitalRef = useRef(null);

   const orbitalConfig=useOrbitConfig();

  useEffect(() => {
   
    if (!orbitImgRef.current) return;

   

   const orbital = new OrbitalSystem(orbitImgRef.current, {
      speed:         0.004,   // radians/frame base — inner ring is fastest
      buttonSize:    orbitalConfig.buttonSize,      // px — rounded square button
      iconSize:      orbitalConfig.iconSize,      // px — white icon inside button
      darkThreshold: 80,      // lightness 0–255: pixels darker than this = ring
      step:          2,       // pixel sampling step during detection
      tooltipWidth:  160,     // px tooltip card width

      // Each ring gets a different speed multiplier
      // [inner, middle, outer]
      speedMultipliers: [0.8, 0.9, 1.0],

      // 6 buttons total — assigned inner→outer:
      //   ring 0 (inner)  → buttons[0]         (1 button)
      //   ring 1 (middle) → buttons[1..2]       (2 buttons)
      //   ring 2 (outer)  → buttons[3..5]       (3 buttons)
      buttons: [
        // ── Inner ring (1) ──────────────────────────────────
        {
          icon:        imageLoader.getSrc("/images/react.svg"),
          label:       "React",
          description: "JS UI component framework",
        },
        // ── Middle ring (2) ─────────────────────────────────
        {
          icon:        imageLoader.getSrc("/images/node.svg"),
          label:       "Node.js",
          description: "Server-side JS runtime",
        },
        {
          icon:        imageLoader.getSrc("/images/php.svg"),
          label:       "PHP",
          description: "Server-side scripting language",
        },
        // ── Outer ring (3) ──────────────────────────────────
        {
          icon:        imageLoader.getSrc("/images/figma.svg"),
          label:       "Figma",
          description: "UI/UX design tool",
        },
        {
          icon:        imageLoader.getSrc("/images/github.svg"),
          label:       "Git",
          description: "Version control",
        },
        {
          icon:        imageLoader.getSrc("/images/python.svg"),
          label:       "Python",
          description: "AI/LLM development & automation",
        },
      ],
    });


    orbitalRef.current = orbital;

   return () => {
    orbital.destroy();
    orbitalRef.current = null;
  };
  }, [orbitalConfig]);

  return (
    <div id="techstack" className="w-full min-h-[1000px] h-[150vh] bg-white gap-y-16 flex flex-col items-center justify-start py-18">

      {/* Title */}
      <h1 className="md:text-5xl pt-38 sm:text-4xl text-3xl font-bold font-poppins text-center">
        Tech Stack
      </h1>

      {/* Orbit image — OrbitalSystem overlays buttons on top of this */}
      <div className="flex-1 flex items-center justify-center w-full">
        <img
          ref={orbitImgRef}
          src={imageLoader.get("/images/orbit.png")?.src}
          alt="orbit"
          className="w-[700px] max-w-full h-auto"
          // crossOrigin="anonymous"  ← uncomment if orbit.png is on a CDN
        />
      </div>

    </div>
  );
};

export default TechStack;