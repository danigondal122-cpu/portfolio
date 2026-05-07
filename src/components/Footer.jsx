import React from "react";
import '../styles/footer.css'
import { imageLoader } from "../utils/assets/imageLoader";
const FooterHeader = () => {

   const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth", // smooth scrolling
    });
  };



  return (
    <div className="w-full footer  px-12 py-16 relative">

      {/* Top Row */}
      <div className="flex justify-between items-center  text-black mb-10">
        <div className="flex flex-row gap-x-2 items-center justify-center font-medium font-poppins font-bold">
            <img className="w-5 "  src={imageLoader.get('/images/copyright.svg')?.src} />
            2026
            </div>

        <div className="flex items-center gap-3 cursor-pointer">
          <span  className="text-sm font-poppins font-semibold">Back to top</span>
          
          {/* Circle Button */}
          <div onClick={scrollToTop} className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
            
            <svg
              width="18"
              height="18"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M8 4L14 10H2L8 4Z"
                fill="white"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Small Text */}
    <div className=" w-full flex justify-start">
  <div className="w-[60%] lets-talk">

    {/* Top small text (right aligned) */}
    <p className="text-md font-abel text-left mb-4">
      HAVE A PROJECT IN MIND
    </p>

    {/* Big heading (centered) */}
    <h1 className="text-[110px] max-[320px]:text-8xl font-semibold text-gray-400 leading-none text-center mb-10">
      LET’S TALK
    </h1>

  </div>
</div>

      {/* Buttons */}
      <div className="flex sm:flex-row flex-col gap-6 button-area mb-10">
        
        {/* Github */}
        <a
  href="https://github.com/danigondal122-cpu/"
  target="_blank"
  rel="noopener noreferrer"
>
        <button  className="flex cursor-pointer footer-button items-center  gap-3 px-6 py-3 border border-black rounded-full hover:bg-black hover:text-white transition">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.93c.58.1.79-.25.79-.56v-2.02c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.7.08-.69.08-.69 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.33.95.1-.74.4-1.24.72-1.53-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.3 1.18-3.11-.12-.3-.51-1.52.11-3.16 0 0 .97-.31 3.18 1.18a11.06 11.06 0 0 1 5.8 0c2.21-1.5 3.18-1.18 3.18-1.18.62 1.64.23 2.86.11 3.16.73.81 1.18 1.85 1.18 3.11 0 4.43-2.68 5.4-5.24 5.69.41.35.77 1.04.77 2.1v3.12c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/>
          </svg>
          Github
        </button>
        </a>



        {/* LinkedIn */}

         <a
  href="https://www.linkedin.com/in/danyal-g-8664ba383"
  target="_blank"
  rel="noopener noreferrer"
>
        <button className="flex cursor-pointer footer-button items-center gap-3 px-6 py-3 border border-black rounded-full hover:bg-black hover:text-white transition">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.98 3.5C4.98 4.88 3.87 6 2.49 6 1.11 6 0 4.88 0 3.5 0 2.12 1.11 1 2.49 1c1.38 0 2.49 1.12 2.49 2.5zM.5 8h4v12h-4V8zm7.5 0h3.6v1.7h.05c.5-.95 1.72-1.95 3.55-1.95C19.1 7.75 21 10 21 13.7V20h-4v-5.6c0-1.35-.02-3.08-1.88-3.08-1.88 0-2.17 1.47-2.17 2.98V20h-4V8z"/>
          </svg>
          LinkedIn
        </button>
        </a>

      </div>

      {/* Bottom Right Credits */}
      <div className=" right-12 font-abel  text-md text-gray-600 text-right">
        <p >
          Development by <span className="text-black font-poppins font-medium">Danyal Tanveer</span>
        </p>
        <p>
          Design by <span className="text-black font-poppins font-medium">Danyal Tanveer</span>
        </p>
      </div>

    </div>
  );
};

export default FooterHeader;