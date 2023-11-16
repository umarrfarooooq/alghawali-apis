require("dotenv").config();
const express = require("express");
const cookieParser = require('cookie-parser');
const path = require("path");
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const cors = require('cors');
mongoose.set('strictQuery', true);

let mongoUri = process.env.MONGO_URL;
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
.then(()=>{
    console.log("Connected MongoDB Atlas");
}).catch((err)=>{
    console.log(err);
});


app.use(cookieParser());
app.use(cors());
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));


// Routes
const maidRoutes = require("./Routes/maidRoutes");
const userRoute= require("./Routes/userRoute")
const staffRoute = require("./Routes/staff.route")
const interviewRoute = require("./Routes/interview.route")

// API'S
app.use('/api/v1/maids', maidRoutes);
app.use('/api/v1/users', userRoute);
app.use('/api/v1/interviews', interviewRoute);
app.use('/api/v1/staff', staffRoute);

// Pages 
// app.use('/', adminHome)
// app.use('/cv', cvRoute)
// app.use("/login", loginRoute)


// const adminHome = require("./Routes/adminHome")
// const cvRoute = require("./Routes/CV/cv.routes")
// const loginRoute = require("./Routes/auth.route")

const PORT = 5000

app.listen(PORT, () =>{
    console.log("Server is runiing on port " + PORT );
})