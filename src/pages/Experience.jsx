import React,{useState,useRef} from "react";
import { imageLoader } from "../utils/assets/imageLoader";
import "../styles/experience.css"


const experiences = [
  
   {
    title: "Tech Solutions",
    date: "Jan, 2025",
    description:
     "Worked as a Junior Web Developer, assisting in developing and maintaining web projects.\nGained hands-on experience in debugging, testing, and deploying applications.",
  },

   {
    title: "Smart Tailor",
    date: "Nov, 2024",
    description:
      "Built a Flutter mobile app for managing tailor orders, measurements, and clients.\nImplemented real-time sync and authentication using Firebase.\nTech: Flutter, Dart, Firebase, Cloud Functions, APIs.",
  },
 
  {
    title: "Noubook",
    date: "October, 2025",
    description:
      "Contributed as a Full Stack Developer, creating a multiple event booking application with seats.io integration.",
  },
 
   {
    title: "Skill leo",
    date: "Nov, 2025",
    description:
       "Worked as a Senior Full Stack MERN Developer, building scalable web applications.\nHandled both frontend and backend development using MongoDB, Express, React, and Node.js.",
  },

  {
    title: "Warehouse Management System",
    date: "Feb, 2026",
    description:
      "Developed a full-stack inventory management system handling sales, purchases, loans, and deliveries.\nBuilt with React frontend and Laravel API backend.\nTech: Laravel, React, MySQL, REST APIs, Hooks, State Management.",
  },
  
   {
    title: "Rock–Paper–Scissors (AI Game)",
    date: "Nov, 2024",
    description:
      "Built an AI-powered game where the system learns player patterns using an LSTM neural network.\nImplemented GPU-based computation for performance optimization.\nTech: JavaScript (ES6+), GPU.js, LSTM, Neural Networks.",
  },
 

  {
    title: "Mobile Car Wash App",
    date: "Jan, 2026",
    description:
      "Developed a WordPress-based platform for on-demand car wash services with custom plugins and payment integration.\nTech: WordPress, Elementor, WooCommerce, Stripe, PHP.",
  },

  {
    title: "PVZ Clone (Final Year Project)",
    date: "Aug,2025",
    description:
      "Created a JavaScript-based clone of Plants vs Zombies using Canvas and DOM systems.\nDesigned custom game engine with event queue and object-oriented architecture.\nTech: JavaScript, DOM API, Data Structures, OOP.",
  },

 
];

const Experience = () => {

  const scrollRef = useRef(null);

const [isDragging, setIsDragging] = useState(false);
const [startY, setStartY] = useState(0);
const [scrollTop, setScrollTop] = useState(0);

const handleMouseDown = (e) => {
  setIsDragging(true);
  setStartY(e.pageY - scrollRef.current.offsetTop);
  setScrollTop(scrollRef.current.scrollTop);
};

const handleMouseMove = (e) => {
  if (!isDragging) return;
  e.preventDefault();

  const y = e.pageY - scrollRef.current.offsetTop;
  const walk = (y - startY) * 1.5; // scroll speed
  scrollRef.current.scrollTop = scrollTop - walk;
};

const handleMouseUp = () => setIsDragging(false);
const handleMouseLeave = () => setIsDragging(false);



  return (
    <div id="experience" className="w-[90%] experience-page min-h-[900px] project min-h-screen bg-white flex flex-col items-center gap-y-22 py-18 px-4">

      <h1 className="md:text-5xl pt-38 sm:text-4xl text-3xl font-bold mb-20 text-center">
        Work Experience
      </h1>

      {/* Scrollable container */}
    <div 
  ref={scrollRef}
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
  onMouseLeave={handleMouseLeave}
      className={`w-full h-[600px] overflow-y-auto scroll-smooth 
         select-none
    cursor-${isDragging ? "grabbing" : "grab"} 
    [&::-webkit-scrollbar]:hidden 
    [-ms-overflow-style:none] 
    [scrollbar-width:none]`}
>

        {/* Timeline */}
        <div className="relative w-full">

          {/* Vertical center line */}
          <div className="absolute left-10 lg:left-1/2 lg:-translate-x-1/2 top-0 bottom-0 w-[3px] bg-black" />

          <div className="flex flex-col gap-12">
            {experiences.map((exp, index) => {
              const cardOnLeft = index % 2 === 0;

              return (
                <div
                  key={index}
                  className="relative flex lg:flex-row flex-col items-start lg:items-center w-full gap-x-34 min-h-[250px]"
                >
                  {/* LEFT half */}
                  <div className="w-full lg:w-1/2 flex flex-col lg:block pl-12 lg:pr-12 py-6">

                    {/* MOBILE VIEW */}
                    <div className="lg:hidden">
                      <h2 className="font-poppins max-[320px]:text-lg text-2xl sm:text-3xl">{exp.title}</h2>
                      <p className="text-gray-500 font-abel text-center text-sm mt-1">{exp.date}</p>
                      <div className="bg-black text-white text-sm leading-relaxed lg:p-5 rounded-sm mt-3">
                        {exp.description}
                      </div>
                    </div>

                    {/* DESKTOP VIEW */}
                    <div className="hidden flex justify-center lg:block">
                      {cardOnLeft ? (
                        <div className="bg-black text-white p-5 rounded-sm w-full">
                          {exp.description}
                        </div>
                      ) : (
                        <div className="text-right">
                          <h2 className="text-2xl lg:text-4xl font-poppins">{exp.title}</h2>
                          <p className="text-gray-500 font-abel text-sm mt-1">{exp.date}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Center chevron icon */}
                  <div className="absolute lg:left-1/2 -translate-x-1/30 lg:-translate-x-1/2 z-10 p-1">
                    <img
                    draggable={false}
                      src={imageLoader.getSrc("/images/chevron_up.svg")}
                      alt="chevron"
                      className="w-18  select-none h-18"
                    />
                  </div>

                  {/* RIGHT half */}
                  <div className="hidden lg:flex w-1/2 justify-start pl-12 py-8">
                    {cardOnLeft ? (
                      <div className="text-left">
                        <h2 className="text-2xl lg:text-4xl font-poppins text-right">{exp.title}</h2>
                        <p className="text-gray-500 font-abel text-center text-sm mt-1">{exp.date}</p>
                      </div>
                    ) : (
                      <div className="bg-black text-white text-sm p-5 rounded-sm w-full">
                        {exp.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Experience;