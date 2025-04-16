require("dotenv").config();
const express = require("express");
const {connectDB} = require("./db");
const jobRoutes = require("./routes/jobRoutes");


require("./jobs/processor");

const app = express();
app.use(express.json());

app.use("/api/jobs", jobRoutes);

const start = async () => {
  await connectDB();
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
};

start();
