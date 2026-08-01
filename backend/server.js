require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
// Future module routes will be added here:
// const jobMatchRoutes = require("./routes/jobMatchRoutes");
// const linkedinRoutes = require("./routes/linkedinRoutes");
// const placementRoutes = require("./routes/placementRoutes");
// const interviewRoutes = require("./routes/interviewRoutes");

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  res.send("AI Career Pilot API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
// app.use("/api/job-match", jobMatchRoutes);
// app.use("/api/linkedin", linkedinRoutes);
// app.use("/api/placement", placementRoutes);
// app.use("/api/interview", interviewRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
