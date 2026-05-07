// utils/useBreakpoint.js  (tiny reusable hook)
import { useState, useEffect } from "react";

export function useCarouselConfig() {
  const getConfig = (w) => {
    if (w < 640)  return { hexSize: 200, columns: 6, gap: 6,  iconSize: 32, labelSize: "11px" }; // mobile
    if (w < 768)  return { hexSize: 200, columns: 6, gap: 8,  iconSize: 36, labelSize: "12px" }; // sm
    if (w < 1024) return { hexSize: 170, columns: 6, gap: 10,  iconSize: 40, labelSize: "13px" }; // md
    if (w < 1280) return { hexSize: 150, columns: 6, gap: 10, iconSize: 44, labelSize: "15px" }; // lg
    if (w < 1536) return { hexSize: 200, columns: 6, gap: 10, iconSize: 48, labelSize: "16px" }; // xl
    return               { hexSize: 280, columns: 6, gap: 10, iconSize: 48, labelSize: "18px" }; // 2xl
  };

  const [config, setConfig] = useState(() => getConfig(window.innerWidth));

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setConfig(getConfig(entry.contentRect.width));
    });
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);

  return config;
}



export function useOrbitConfig() {
  const getConfig = (w) => {
     if (w<320)  return { buttonSize:24 ,iconSize:14};
    if (w < 640)  return { buttonSize:32 ,iconSize:24};
    if (w < 768)  return { buttonSize:40 ,iconSize:32};
    return {buttonSize:52 ,iconSize:40} // mobile
   
  
  };

  const [config, setConfig] = useState(() => getConfig(window.innerWidth));

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setConfig(getConfig(entry.contentRect.width));
    });
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);

  return config;
}



export function useLineFloatingConfig() {
  const getConfig = (w) => {
     if (w < 320)  return { lineOffsetY: 30, lineOffsetX:240, buttonSize: 60, rotate:90 };
    if (w < 640)  return { lineOffsetY: 50, lineOffsetX:290, buttonSize: 80, rotate:90 };  // mobile
    if (w < 768)  return { lineOffsetY: 70, lineOffsetX:440, buttonSize: 100, rotate:90 };  // sm
    if (w < 1024) return { lineOffsetY: 150, lineOffsetX:100,  buttonSize: 120,rotate:0 };  // md
    if (w < 1280) return { lineOffsetY: 170,  lineOffsetX:100, buttonSize: 120, rotate:0};  // lg
    if (w < 1536) return { lineOffsetY: 170,  lineOffsetX:100, buttonSize: 140, rotate:0};  // xl
    return               { lineOffsetY: 170,  lineOffsetX:100, buttonSize: 140, rotate:0 };  // 2xl
  };

  const [config, setConfig] = useState(() => getConfig(window.innerWidth));

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setConfig(getConfig(entry.contentRect.width));
    });
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);

  return config;
}






export function usePlayButtonFloatingConfig() {
  const getConfig = (w) => {
    if (w < 640)  return { lineOffsetY: -5, lineOffsetX:230,  };  // mobile
    if (w < 768)  return { lineOffsetY: -35, lineOffsetX:400,  };  // sm
    if (w < 1024) return { lineOffsetY: 260, lineOffsetX:80,   };  // md
    if (w < 1280) return { lineOffsetY: 260,  lineOffsetX:80, };  // lg
    if (w < 1536) return { lineOffsetY: 260,  lineOffsetX:80, };  // xl
    return               { lineOffsetY: 260,  lineOffsetX:80, };  // 2xl
  };

  const [config, setConfig] = useState(() => getConfig(window.innerWidth));

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setConfig(getConfig(entry.contentRect.width));
    });
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);

  return config;
}