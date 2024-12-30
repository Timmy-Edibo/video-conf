import React from "react";

const SuccessIcon: React.FC = () => {
  return (
    <div
      className="success-svg"
      style={{ display: "flex", alignItems: "center", marginLeft: "5px" }}
    >
      <svg
        className="ft-green-tick"
        xmlns="http://www.w3.org/2000/svg"
        height="15"
        width="15"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        <circle
          className="circle"
          fill="#5bb543"
          cx="24"
          cy="24"
          r="22"
        ></circle>
        <path
          className="tick"
          fill="none"
          stroke="#FFF"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          d="M14 27l5.917 4.917L34 17"
        ></path>
      </svg>
    </div>
  );
};

export default SuccessIcon;
