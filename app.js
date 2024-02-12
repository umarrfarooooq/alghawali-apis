require("dotenv").config();
const express = require("express");
const cookieParser = require('cookie-parser');
const path = require("path");
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require("passport")
const app = express();
const mongoose = require('mongoose');
const session = require('express-session');
const methodOverride = require('method-override');
mongoose.set('strictQuery', true);

let mongoUri = process.env.MONGO_URL;
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
.then(()=>{
    console.log("Connected MongoDB Atlas");
}).catch((err)=>{
    console.log(err);
});

const allowedOrigins = [
  'https://www.alghawalimanpower.com',
  'https://access.alghawalimanpower.com',
  'https://admin.panel.alghawalimanpower.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.json());
app.set("views" , path.join(__dirname , "views"))
app.set('view engine', 'ejs');
app.use(methodOverride('_method'));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use('/public', express.static(path.join(__dirname, '/public')));
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));
app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false }
    })
  );

app.use(passport.initialize());
app.use(passport.session());


// Routes
const maidRoutes = require("./Routes/maidRoutes");
const userRoute= require("./Routes/userRoute")
const staffRoute = require("./Routes/staff.route")
const interviewRoute = require("./Routes/interview.route")
const cvRoute = require("./Routes/CV/cv.routes")
const visaRoute = require("./Routes/visa.route")
// API'S
app.use('/api/v1/maids', maidRoutes);
app.use('/api/v1/users', userRoute);
app.use('/api/v1/interviews', interviewRoute);
app.use('/api/v1/staff', staffRoute);
app.use('/api/v1/visa', visaRoute);

// Pages 
app.use('/cv', cvRoute)


// const loginRoute = require("./Routes/auth.route")

const PORT = 5177

app.listen(PORT, () =>{
    console.log("Server is runiing on port " + PORT );
})
