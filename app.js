require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const passport = require("passport");
const app = express();
const mongoose = require("mongoose");
const session = require("express-session");
const methodOverride = require("method-override");
mongoose.set("strictQuery", true);

let mongoUri = process.env.MONGO_URL;

mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    retryWrites: true,
    w: "majority",
  })
  .then(() => {
    console.log("Connected MongoDB Atlas");
  })
  .catch((err) => {
    console.log(err);
  });

const allowedOrigins = [
  "https://www.alghawalimanpower.com",
  "https://access.alghawalimanpower.com",
  "https://office.alghawalimanpower.com",
  "https://training.alghawalimanpower.com",
  "https://alghawali-accounts.vercel.app",
  "https://admin.panel.alghawalimanpower.com",
  "https://agent.alghawalimanpower.com",
  "https://www.agent.alghawalimanpower.com",
  "https://finance.alghawalimanpower.com",
  "https://www.finance.alghawalimanpower.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8090",
];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(methodOverride("_method"));
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));
app.use("/public", express.static(path.join(__dirname, "/public")));
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Routes
const maidRoutes = require("./Routes/maidRoutes");
const userRoute = require("./Routes/userRoute");
const staffRoute = require("./Routes/staff.route");
const interviewRoute = require("./Routes/interview.route");
const cvRoute = require("./Routes/CV/cv.routes");
const visaRoute = require("./Routes/visa.route");
const customRequirementRoute = require("./Routes/customRequirement.route");
const costumerAccountsRoute = require("./Routes/cos.accounts.route");
const costumersRoute = require("./Routes/customers.route.v2");
const staffAccountsRoute = require("./Routes/staff.accounts.route");
const agentsRoute = require("./Routes/agent.route");
const agentMaidsRoute = require("./Routes/agent.maid.route");
const agentRegistration = require("./Routes/agentRegister.route");
const hiringRoute = require("./Routes/hiring.route");
const transactionRoute = require("./Routes/transaction.route");
const invoiceRoute = require("./controllers/invoiceController");
const notificationRoute = require("./Routes/notification.route");
const medicalRoute = require("./Routes/medical.route");

// API'S
app.use("/api/v1/maids", maidRoutes);
app.use("/api/v1/users", userRoute);
app.use("/api/v1/interviews", interviewRoute);
app.use("/api/v1/staff", staffRoute);
app.use("/api/v1/visa", visaRoute);
app.use("/api/v1/customRequirements", customRequirementRoute);
app.use("/api/v1/customerAccounts", costumerAccountsRoute);
app.use("/api/v2/customers", costumersRoute);
app.use("/api/v1/staffAccounts", staffAccountsRoute);
app.use("/api/v1/agents", agentsRoute);
app.use("/api/v1/agentMaids", agentMaidsRoute);
app.use("/api/v1/agentRegister", agentRegistration);
app.use("/api/v2/hiring", hiringRoute);
app.use("/api/v1/transaction", transactionRoute);
app.use("/api/v1/notifications", notificationRoute);
app.use("/api/v1/medical", medicalRoute);
// Pages
app.use("/cv", cvRoute);
app.use("/invoice", invoiceRoute);

const MAIN_PORT = 5177;
const TRAINING_PORT = 5199;

const PORT = process.env.NODE_ENV === "training" ? TRAINING_PORT : MAIN_PORT;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
