import React, { createContext, useContext, useState } from "react";

const AppDataContext = createContext();

export const AppDataProvider = ({ children }) => {
  const [resumeResult, setResumeResult] = useState(null);
  const [jobRecommendations, setJobRecommendations] = useState(null);
  const [jobCompareResult, setJobCompareResult] = useState(null);

  const resetAppData = () => {
    setResumeResult(null);
    setJobRecommendations(null);
    setJobCompareResult(null);
  };

  return (
    <AppDataContext.Provider
      value={{
        resumeResult,
        setResumeResult,
        jobRecommendations,
        setJobRecommendations,
        jobCompareResult,
        setJobCompareResult,
        resetAppData,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => useContext(AppDataContext);