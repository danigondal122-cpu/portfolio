import React, { useRef, useEffect ,useState } from "react";
import "../styles/services.css";
import { imageLoader } from "../utils/assets/imageLoader";
import { FloatingImage }    from "../utils/canvas/FloatingImage";
import { PolygonCarousel }  from "../utils/carousals/PolygonCarousel";
import { useCarouselConfig, useLineFloatingConfig, usePlayButtonFloatingConfig } from "../hooks/useBreakpoint";
const Services = () => {
  const anchorRef   = useRef(null);
  const floatRef    = useRef(null);
  const pauseRef    = useRef(null);
  const carouselRef = useRef(null);   // ← the 70% right column
  const carouselInstance = useRef(null);
  const [isPaused, setIsPaused] = React.useState(false);

  const config = useCarouselConfig();
  const floatLineConfig = useLineFloatingConfig();
  const floatPlayConfig = usePlayButtonFloatingConfig();


  const handleToggle = () => {
  if (!carouselInstance.current) return;

  if (isPaused) {
    carouselInstance.current.resume();
  } else {
    carouselInstance.current.pause();
  }

  setIsPaused(!isPaused);
};

  useEffect(() => {
    // ── Floating dashed line ──────────────────────────────────
    let lineFloat, pauseFloat, carousel;

    if (anchorRef.current && floatRef.current) {
      lineFloat = new FloatingImage(anchorRef.current, floatRef.current, {
        float:        false,
        offsetX:      floatLineConfig.lineOffsetX,
        offsetY:      floatLineConfig.lineOffsetY,
        anchorOrigin: "left",
        floatOrigin:  "right",
        rotate: floatLineConfig.rotate,
      });
    }

    if (anchorRef.current && pauseRef.current) {
      pauseFloat = new FloatingImage(anchorRef.current, pauseRef.current, {
        float:        false,
        offsetX:      floatPlayConfig.lineOffsetX,
        offsetY:      floatPlayConfig.lineOffsetY,
        
        anchorOrigin: "left",
        floatOrigin:  "center",
        floatAxis:    "y",
        interactive:true,
      });
    }

    // ── Polygon carousel ─────────────────────────────────────
    if (carouselRef.current) {
      carouselInstance.current  = new PolygonCarousel(carouselRef.current, {
        speed:      0.5,          // px per frame
        direction:  "left",       // right → left scroll
        fadeEdge:   60,           // px fade at left/right edges
                 // hexagon flat-to-flat width
                // 2 columns → honeycomb comb pattern
             // px between hexagons
     
        hexColor:   "#111111",
        labelColor: "#ffffff",
        hexSize:    config.hexSize,
      columns:    config.columns,
      gap:        config.gap,
      iconSize:   config.iconSize,
      labelSize:  config.labelSize,

       

        // 10 polygon cards — swap icon srcs for your actual assets
        items: [
          { icon: imageLoader.getSrc("/images/ui.svg"), label: "UI/UX Design"      },
          { icon: imageLoader.getSrc("/images/android.svg"), label: "Android Dev"},
          { icon: imageLoader.getSrc("/images/saas.svg"), label: "SaaS Products"},
          { icon: imageLoader.getSrc("/images/chat-bot.svg"), label: "Chatbot Dev"      },
          { icon: imageLoader.getSrc("/images/ai.svg"), label: "AI/LLM Dev"       },
          { icon: imageLoader.getSrc("/images/code.svg"), label: "PHP/Laravel Dev"        },
          { icon: imageLoader.getSrc("/images/api.svg"), label: "API Integrations"        },
          { icon: imageLoader.getSrc("/images/deployment.svg"), label: "Deployment"        },
          { icon: imageLoader.getSrc("/images/cicd_pipeline.svg"), label: "CICD Pipeline"       },
          { icon: imageLoader.getSrc("/images/database.svg"), label: "Database Management"},
        ],
      });
    }

    return () => {
      lineFloat?.destroy();
      pauseFloat?.destroy();
      carouselInstance.current?.destroy();
    };
  }, [config, floatLineConfig]);

  return (
    <div id="services" className="w-[90%] services gap-y-8 flex md:flex-row flex-col min-h-[500px] h-screen bg-white">

      {/* ── LEFT 30% ───────────────────────────────────────── */}
      <div className="md:w-[30%] w-[30%] flex flex-col  gap-y-2  items-start lg:gap-y-4">

        {/* Label row */}
        <div className="flex items-center gap-x-2">
          <img
            src={imageLoader.get("/images/horizontal_line.png")?.src}
            alt="line"
            className="w-6 relative top-1"
          />
          <p className="text-sm font-medium whitespace-nowrap">My Services</p>
          <img
            src={imageLoader.get("/images/chevron_right.png")?.src}
            alt="arrow"
            className="w-16  relative right-6"
          />
        </div>

        {/* Heading — anchor for floating elements */}
        <h2
          ref={anchorRef}
          className="mt-4 md:text-4xl text-3xl lg:text-6xl font-bold font-poppins leading-tight text-left"
        >
          WHAT I'M OFFERING
        </h2>

        {/* Floating dashed line */}
     <img
  ref={floatRef}
  src={imageLoader.get("/images/dashed_line.svg")?.src}
  alt=""
  className="sm:w-10 z-8  w-5 max-[320px]:w-3"
/>
        {/* Floating pause button */}
      <img
  ref={pauseRef}
  onClick={handleToggle}
  src={
    isPaused
      ? imageLoader.get("/images/play_button.svg")?.src
      : imageLoader.get("/images/pause_button.svg")?.src
  }
  style={{ width: `${floatLineConfig.buttonSize}px` }}
  className="w-26 cursor-pointer"
  alt=""
/>

      </div>

      {/* ── RIGHT 70% — polygon carousel lives here ────────── */}
      {/*
        ref={carouselRef} is the clip container.
        PolygonCarousel appends its canvas + track inside this div.
        overflow:hidden is set by the carousel itself, but we set it
        here too so nothing bleeds during the first paint.
      */}
      <div
        ref={carouselRef}
        className="md:w-[70%] h-[400px] w-full shrink-0  overflow-hidden flex items-center"
      />

    </div>
  );
};

export default Services;
