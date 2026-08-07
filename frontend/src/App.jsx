import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppDataProvider } from "./context/AppDataContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResumeUpload from "./pages/ResumeUpload";
import JobMatching from "./pages/JobMatching";
import LinkedInAnalysis from "./pages/LinkedInAnalysis";
import PlacementProbability from "./pages/PlacementProbability";
import InterviewPrep from "./pages/InterviewPrep";
import CareerRoadmap from "./pages/CareerRoadmap";

function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/resume" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/resume" element={<ResumeUpload />} />
        <Route path="/job-matching" element={<JobMatching />} />
        <Route path="/linkedin" element={<LinkedInAnalysis />} />
        <Route path="/placement" element={<PlacementProbability />} />
        <Route path="/interview" element={<InterviewPrep />} />
        <Route path="/roadmap" element={<CareerRoadmap />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <AppRoutes />
      </AppDataProvider>
    </AuthProvider>
  );
}