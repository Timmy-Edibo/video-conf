import React, { useState } from "react";
import SuccessIcon from "./SuccessIcon";

const StepSubscribe: React.FC = () => {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddSuccessIcon = () => {
    setShowSuccess(true); // Trigger the success icon display
  };

  return (
    <div id="step-subscribe">
      <button onClick={handleAddSuccessIcon}>Subscribe</button>
      {showSuccess && <SuccessIcon />}
    </div>
  );
};

export default StepSubscribe;
