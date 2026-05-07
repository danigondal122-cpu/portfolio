import React from "react";
import { imageLoader } from "../utils/assets/imageLoader";

const Intro = () => {
  return (
    <div className="flex relative -top-20 -z-1 max-h-[800px] min-h-[600px] lg:max-xl:h-[100vh] w-full">
      
      {/* Left 40% */}
      <div className="w-2/5 relative bg-black flex items-center  justify-end">
        <img
          src={imageLoader.get('/images/person_1.png')?.src}
          alt="person"
          className="w-[230px] h-[230px] absolute bottom-0 h-auto"
        />
      </div>

      {/* Right 60% */}
         <div className="w-3/5 bg-white flex items-center">
        
        {/* INNER CONTAINER (THIS IS THE FIX) */}
        <div className="flex flex-col items-start gap-y-2 relative left-4 sm:max-lg:left-12">
          
          <h1 className="lg:text-6xl md:text-6xl text-3xl sm:text-5xl font-abel">
            Danyal Tanveer
          </h1>

          <h2 className="font-lexend text-sm lg:text-xl  sm:text-lg md:text-xl">
            Full Stack Developer
          </h2>

        </div>

      </div>
    </div>
  );
};

export default Intro;