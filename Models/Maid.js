const mongoose = require("mongoose");

const maidSchema = new mongoose.Schema({
    code:String,
    name: String,
    nationality: String,
    position:String,
    salery:Number,
    price:Number,
    religion:String,
    maritalStatus:String,
    childrens:Number,
    age:Number,
    education:String,
    languages:Array,
    contractPeriod:String,
    remarks:String,
    addedBy:String,
    maidImg:String,
    maidImg2:String,
    maidImg3:String,
    maidImg4:String,
    videoLink:String,
    appliedFor:String,
    experience:String,
    isHired: {
      type: Boolean,
      default: false
    },
    timestamp: { type: Date, default: Date.now }
  });
  
  module.exports = mongoose.model('Maid', maidSchema);