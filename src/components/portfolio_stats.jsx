import React from "react";

const Stats = () => {
  return (
    <div className="w-full sm:h-[40vh] sm:min-h-auto min-h-[500px]  flex justify-center">
      <div className="flex xl:w-[70%] lg:w-[80%] w-[90%]  items-center justify-center bg-white">
      {/* 80% container */}
      <div className="xl:w-4/5 w-full flex sm:flex-row flex-col gap-y-8 items-center justify-between">

        {/* Stat 1 */}
        <div className="flex flex-col  gap-y-2 items-center xs:items-start">
          <h1 className="text-5xl font-lexend font-bold">50+</h1>
          <p className=" font-lexend mt-2">Completed Projects</p>
        </div>

        {/* Divider */}
        <div className="sm:w-[2px] sm:h-12 w-[30%] h-[2px] bg-black"></div>

        {/* Stat 2 */}
        <div className="flex flex-col gap-y-2 items-center xs:items-start">
          <h1 className="text-5xl  font-lexend font-bold">25+</h1>
          <p className=" font-lexend mt-2">Satisfied Clients</p>
        </div>

        {/* Divider */}
        <div className="sm:w-[2px] sm:h-12 w-[30%] h-[2px] bg-black"></div>

        {/* Stat 3 */}
        <div className="flex flex-col gap-y-2 justify-center items-center xs:items-start">
          <h1 className="text-5xl  font-lexend font-bold">75+</h1>
          <p className=" font-lexend mt-2">Feedback Reviews</p>
        </div>

      </div>
    </div>
    </div>
  );
};

export default Stats;