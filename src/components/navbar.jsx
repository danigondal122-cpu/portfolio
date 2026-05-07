import React, { useState } from "react";
import { imageLoader } from "../utils/assets/imageLoader";
import "../styles/navbar.css";


const CV_PATH = "/assets/Resume.pdf";

 function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}


export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);


   const handleNav = (id) => {
    scrollTo(id);
    setMenuOpen(false);
  };

  const handleDownloadCV = () => {
    const a = document.createElement("a");
    a.href     = CV_PATH;
    a.download = "Danyal_Tanveer_CV.pdf";
    a.click();
  };

 

  return (
    <>
      <nav className=" z-50 flex w-full bg-transparent py-3 items-center justify-between">

        {/* Left: logo */}
        <div className="flex items-center w-2/5 px-6">
          <img
            className="w-28 md:w-32 relative left-2 top-4 h-auto"
            src={imageLoader.get('/images/logo_2.png')?.src}
            alt="logo"
          />
        </div>

        {/* Right: NAV LINKS (desktop only) */}
        <div className="hidden md:flex items-center md:max-lg:justify-end max-lg:items-right justify-between w-3/5 px-8">
          <div className="flex gap-12 relative left-2 pl-6 font-poppins">
            <a className="cursor-pointer" onClick={() => handleNav("home")}>Home</a>
            <a className="cursor-pointer" onClick={() => handleNav("experience")}>Experience</a>
            <a className="cursor-pointer" onClick={() => handleNav("services")}>Services</a>
            <a className="cursor-pointer" onClick={() => handleNav("contact")}>Contact</a>
          </div>
          <button onClick={handleDownloadCV} className="cv-button hidden lg:flex text-sm">
            Download CV
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden cursor-pointer text-black text-2xl pr-6 z-[60]"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {/* ── Mobile sidebar overlay ───────────────────────────── */}
      {/* Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-white z-999 md:hidden flex flex-col
          transition-transform duration-300 ease-in-out
          ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo area */}
        <div className="flex justify-center items-center gap-3 px-5 py-6 border-b border-gray-100">
          <img
            src={imageLoader.get('/images/logo.png')?.src}
            alt="logo"
            className="w-14 h-14  object-contain"
          />
         
        </div>

        {/* Nav sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-2">

          {/* Section: Main */}
       
          
            <NavItem
              icon={imageLoader.getSrc("/images/home.svg")}
              label="Home"
              onClick={() => setMenuOpen(false)}
            />
            {/* <NavItem
              icon="👤"
              label="About"
              onClick={() => setMenuOpen(false)}
            /> */}
        

          {/* Section: Work */}
         
         
            <NavItem
               icon={imageLoader.getSrc("/images/service.svg")}
              label="Services"
             onClick={() => handleNav("services")}
            />

             <NavItem
             icon={imageLoader.getSrc("/images/award.svg")}
              label="Experience"
              onClick={() => handleNav("experience")}
            />
           

             <NavItem
             icon={imageLoader.getSrc("/images/contact.svg")}
              label="Contact me"
             onClick={() => handleNav("contact")}
            />
         

          {/* Section: Contact */}
         
        </div>

        {/* Bottom: CV button + profile */}
        <div className="border-t border-gray-100">

          {/* CV button row */}
          <div className="px-4 py-3">
            <button onClick={handleDownloadCV} className="w-full cursor-pointer py-2.5 rounded-xl bg-black text-white text-sm font-semibold font-poppins hover:bg-gray-800 transition-colors">
              Download CV
            </button>
          </div>

          {/* Profile row */}
          <div className="flex items-center gap-3 px-4 py-4 border-t border-gray-100">
            <img
              src={imageLoader.get('/images/person_1.png')?.src}
              alt="avatar"
              className="w-9 h-9 rounded-full object-cover object-top bg-gray-200"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 font-poppins truncate">
                Danyal Tanveer
              </p>
              <p className="text-xs text-gray-400 truncate">
                Full Stack Developer
              </p>
            </div>
            <button className="text-gray-400 text-lg">⋮</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Reusable nav item ──────────────────────────────────────────
function NavItem({ icon, label, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full cursor-pointer flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 transition-colors text-left group"
    >
      <img src={icon} alt={label} className="w-5 h-5 object-contain" />
      <span className="flex-1 text-sm font-medium text-gray-800 font-poppins">
        {label}
      </span>
      {badge && (
        <span className="text-xs font-semibold bg-blue-500 text-white px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}