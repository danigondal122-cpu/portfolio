import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import './index.css';
import { initFonts } from "./config/initFonts";
import { imageLoader } from "./utils/assets/imageLoader";
import { loadStyle } from "./utils/assets/loadExternal";

async function startApp() {
  await initFonts();


  

 await imageLoader.init([
   
    "/images/logo.png",
    "/images/logo_2.png",
    "/images/person_1.png",
    "/images/bg_1.png",
    "/images/chevron_right.png",
    "/images/horizontal_line.png",
    "/images/dashed_line.png",
     { src:"/images/dashed_line.svg", mode: "inline" },
     { src:"/images/pause_button.svg", mode: "inline" },
     { src:"/images/chevron_up.svg", mode: "inline" },
     { src:"/images/play_button.svg", mode: "inline" },
     { src:"/images/copyright.svg", mode: "inline" },
     { src:"/images/ai.svg", mode: "inline" },
     { src:"/images/ui.svg", mode: "inline" },
     { src:"/images/saas.svg", mode: "inline" },
     { src:"/images/chat-bot.svg", mode: "inline" },
     { src:"/images/code.svg", mode: "inline" },
     { src:"/images/api.svg", mode: "inline" },
     { src:"/images/android.svg", mode: "inline" },
     { src:"/images/deployment.svg", mode: "inline" },
     { src:"/images/cicd_pipeline.svg", mode: "inline" },
     { src:"/images/database.svg", mode: "inline" },
     { src:"/images/php.svg", mode: "inline" },
     { src:"/images/react.svg", mode: "inline" },
     { src:"/images/flutter.svg", mode: "inline" },
     { src:"/images/node.svg", mode: "inline" },
     { src:"/images/figma.svg", mode: "inline" },
     { src:"/images/python.svg", mode: "inline" },
     { src:"/images/github.svg", mode: "inline" },
     { src:"/images/home.svg", mode: "inline" },
     { src:"/images/service.svg", mode: "inline" },
     { src:"/images/contact.svg", mode: "inline" },
     { src:"/images/award.svg", mode: "inline" },
     { src:"/images/project.svg", mode: "inline" },
     "/images/orbit.png",
     "/images/bg_black_1.png",
     "/images/cube.png",
     "/images/glow.png",
   
    
   
  ]);


  

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

startApp();