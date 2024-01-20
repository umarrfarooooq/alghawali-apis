const express = require("express")
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const app = express();
const Staff = require('../Models/Staff');
const jwt = require('jsonwebtoken');
const cors = require("cors");

app.use(cors());

passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: 'http://localhost:5177/api/v1/staff/auth/google/access',
        userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {  
          const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || '';
          const photo = (profile.photos && profile.photos[0] && profile.photos[0].value) || '';
      
          if (!email) {
            return done(new Error('Email not provided by Google'), null);
          }
      
          const existingStaff = await Staff.findOne({ email });
      
          if (existingStaff) {
            existingStaff.fullName = profile.displayName;
            existingStaff.image = photo;
            await existingStaff.save();

            
            if (!existingStaff.adminKnows) {
              return done(new Error('You are not approved from admin'), null);
            }

            const tokenPayload = {
              staffId: existingStaff._id,
              staffRoles: existingStaff.roles,
              staffName: existingStaff.fullName
            };
            const token = jwt.sign(tokenPayload, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });
            return done(null, existingStaff, token);
          } else {
            const newStaff = new Staff({
              fullName: profile.displayName,
              email,
              image: photo,
              adminKnows:false
            });
      
            await newStaff.validate();
            await newStaff.save();
            const tokenPayload = {
              staffId: newStaff._id,
              staffRoles: newStaff.roles,
              staffName: newStaff.fullName
            };
            const token = jwt.sign(tokenPayload, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });
            return done(null, newStaff, token);
          }
        } catch (error) {
          console.error(error);
          return done(error, null);
        }
      }
      
    )
  );
  

passport.serializeUser((staff, done) => {
  done(null, staff.id);
});


passport.deserializeUser((id, done) => {
    Staff.findById(id)
      .exec()
      .then((staff) => {
        done(null, staff);
      })
      .catch((err) => {
        done(err, null);
      });
  });
module.exports = passport;
