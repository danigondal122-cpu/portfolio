import React from "react";
import { imageLoader } from "../utils/assets/imageLoader";
import "../styles/contact-me.css"

const Contact = () => {
  return (
    <div id="contact" className="relative   w-full bg-white text-white overflow-hidden">

      {/* Top wave image */}
      <img
        src={imageLoader.getSrc("/images/bg_black_1.png")}
        alt=""
        className="w-[120%] h-[500px] block"
      />

      {/* Main content */}
      <div className="sm:px-16 px-4  bg-black py-12">
        <div className="w-full mx-auto contact-me-content">

        {/* Title */}
        <h1 className="md:text-5xl pb-48 sm:text-4xl text-3xl   font-bold text-center ">Contact Me</h1>

        {/* Two-column layout */}
        <div className="flex lg:flex-row flex-col gap-y-32 lg:gap-x-32 items-start space-between  ">

          {/* LEFT — Get in touch */}
          <div className="flex flex-col lg:justify-start justify-center items-center lg:items-start gap-6 lg:w-[30%] w-full mx-auto">
            <h2 className="text-2xl text-left font-poppins text-3xl font-bold">Get in touch.</h2>

            {/* Glowing blob */}
          <div className="relative w-60 h-60 ">

  {/* Glow (background) */}
 
  {/* Rotating cube */}
  <img
    src={imageLoader.getSrc("/images/cube.png")}
    alt=""
    className="w-60 h-60  relative right-6 origin-center object-contain animate-spin-slow"
  />

</div>
           

            <p className="text-sm text-left">
              Need some help? Let me know what you need
              and I'll get straight back to you.
            </p>
          </div>

          {/* RIGHT — Form */}
         
          <div className="sm:w-full w-[80%] lg:w-[100%]">
          <div className="sm:w-full w-[80%] mx-auto lg:w-[100%] form-content lg:mx-auto flex flex-col  max-[480px]:gap-y-8 gap-y-24">
            {/* Row 1 */}
           {/* Row 1 */}
<div className="flex max-[480px]:flex-col gap-8">
  <div className="flex-1 flex gap-y-4   flex-col">
    <label className="sm:text-2xl text-xl text-left mb-1">First Name</label>
    <input
      type="text"
      className="bg-transparent border-b  pb-1 text-white text-sm outline-none focus:border-white transition-colors"
    />
  </div>

  <div className="flex-1 flex gap-y-4 flex-col">
    <label className="sm:text-2xl text-xl  text-left mb-1">Last Name</label>
    <input
      type="text"
      className="bg-transparent border-b  pb-1 text-white text-sm outline-none focus:border-white transition-colors"
    />
  </div>
</div>

{/* Row 2 */}
<div className="flex  max-[480px]:flex-col gap-8">
  <div className="flex-1 gap-y-4 flex flex-col">
    <label className="sm:text-2xl text-xl   text-left mb-1">Company</label>
    <input
      type="text"
      className="bg-transparent border-b  pb-1 text-white text-sm outline-none focus:border-white transition-colors"
    />
  </div>

  <div className="flex-1 gap-y-4 flex flex-col">
    <label className="sm:text-2xl text-xl  text-left mb-1">Email Address</label>
    <input
      type="email"
      className="bg-transparent border-b  pb-1 text-white text-sm outline-none focus:border-white transition-colors"
    />
  </div>
</div>

{/* Row 3 — Message */}
<div className="flex gap-y-12 flex-col">
     <div className="flex gap-y-4  flex-col">
  <label className="sm:text-2xl text-xl font-abel text-left mb-1">Message</label>
  <textarea
    placeholder="Start typing here....."
    rows={1}
    className="bg-transparent border-b placeholder-white  pb-1 text-white text-sm outline-none resize-none focus:border-white transition-colors placeholder-gray-600"
  />
  </div>

   
             <button className="w-full p-4 text-poppins font-semibold rounded-full cursor-pointer border border-white text-black text-2xl bg-white  transition-colors">
                Send
              </button>
            

</div>

            {/* Send button */}
          

          </div>
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="h-24" />
      </div>
      </div>

      {/* Bottom wave image — horizontally flipped */}
      <img
        src={imageLoader.getSrc("/images/bg_black_1.png")}
        alt=""
        className="w-full h-[500px] block scale-y-[-1]"
      />

    </div>
  );
};

export default Contact;