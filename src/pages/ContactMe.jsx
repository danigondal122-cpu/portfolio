import React, { useState, useRef } from "react";
import emailjs from "@emailjs/browser";
import { imageLoader } from "../utils/assets/imageLoader";
import "../styles/contact-me.css";

// ── Replace these with your real EmailJS credentials ──────────
const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;


const Contact = () => {
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name:  "",
    company:    "",
    email:      "",
    message:    "",
  });

  const [status, setStatus] = useState("idle"); // "idle" | "sending" | "success" | "error"

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.first_name || !formData.email || !formData.message) {
      setStatus("error");
      return;
    }

    setStatus("sending");

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          first_name: formData.first_name,
          last_name:  formData.last_name,
          company:    formData.company,
          email:      formData.email,
          message:    formData.message,
        },
        EMAILJS_PUBLIC_KEY
      );

      setStatus("success");
      setFormData({ first_name: "", last_name: "", company: "", email: "", message: "" });

    } catch (err) {
      console.error("EmailJS error:", err);
      setStatus("error");
    }
  };

  return (
    <div id="contact" className="relative w-full bg-white text-white overflow-hidden">

      {/* Top wave */}
      <img
        src={imageLoader.getSrc("/images/bg_black_1.png")}
        alt=""
        className="w-[120%] h-[500px] block"
      />

      {/* Main content */}
      <div className="sm:px-16 px-4 bg-black py-12">
        <div className="w-full mx-auto contact-me-content">

          <h1 className="md:text-5xl pb-48 sm:text-4xl text-3xl font-bold text-center">
            Contact Me
          </h1>

          <div className="flex lg:flex-row flex-col gap-y-32 lg:gap-x-32 items-start">

            {/* LEFT */}
            <div className="flex flex-col lg:justify-start justify-center items-center lg:items-start gap-6 lg:w-[30%] w-full mx-auto">
              <h2 className="text-2xl text-left font-poppins text-3xl font-bold">Get in touch.</h2>

              <div className="relative w-60 h-60">
                <img
                  src={imageLoader.getSrc("/images/cube.png")}
                  alt=""
                  className="w-60 h-60 relative right-6 origin-center object-contain animate-spin-slow"
                />
              </div>

              <p className="text-sm text-left">
                Need some help? Let me know what you need
                and I'll get straight back to you.
              </p>
            </div>

            {/* RIGHT — Form */}
            <div className="sm:w-full w-[80%] lg:w-[100%]">
              <div className="sm:w-full w-[80%] mx-auto lg:w-[100%] form-content lg:mx-auto flex flex-col max-[480px]:gap-y-8 gap-y-24">

                {/* Row 1 */}
                <div className="flex max-[480px]:flex-col gap-8">
                  <div className="flex-1 flex gap-y-4 flex-col">
                    <label className="sm:text-2xl text-xl text-left mb-1">First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className="bg-transparent border-b pb-1 text-white text-sm outline-none focus:border-white transition-colors"
                    />
                  </div>
                  <div className="flex-1 flex gap-y-4 flex-col">
                    <label className="sm:text-2xl text-xl text-left mb-1">Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className="bg-transparent border-b pb-1 text-white text-sm outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>

                {/* Row 2 */}
                <div className="flex max-[480px]:flex-col gap-8">
                  <div className="flex-1 gap-y-4 flex flex-col">
                    <label className="sm:text-2xl text-xl text-left mb-1">Company</label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="bg-transparent border-b pb-1 text-white text-sm outline-none focus:border-white transition-colors"
                    />
                  </div>
                  <div className="flex-1 gap-y-4 flex flex-col">
                    <label className="sm:text-2xl text-xl text-left mb-1">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="bg-transparent border-b pb-1 text-white text-sm outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>

                {/* Row 3 — Message + Send */}
                <div className="flex gap-y-12 flex-col">
                  <div className="flex gap-y-4 flex-col">
                    <label className="sm:text-2xl text-xl font-abel text-left mb-1">Message</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Start typing here....."
                      rows={1}
                      className="bg-transparent border-b placeholder-white pb-1 text-white text-sm outline-none resize-none focus:border-white transition-colors placeholder-gray-600"
                    />
                  </div>

                  {/* Status messages */}
                  {status === "success" && (
                    <p className="text-green-400 text-sm text-center">
                      ✓ Message sent! I'll get back to you soon.
                    </p>
                  )}
                  {status === "error" && (
                    <p className="text-red-400 text-sm text-center">
                      ✗ Please fill in your name, email and message.
                    </p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={status === "sending"}
                    className="w-full p-4 font-poppins font-semibold rounded-full cursor-pointer border border-white text-black text-2xl bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === "sending" ? "Sending..." : "Send"}
                  </button>
                </div>

              </div>
            </div>
          </div>

          <div className="h-24" />
        </div>
      </div>

      {/* Bottom wave */}
      <img
        src={imageLoader.getSrc("/images/bg_black_1.png")}
        alt=""
        className="w-full h-[500px] block scale-y-[-1]"
      />

    </div>
  );
};

export default Contact;