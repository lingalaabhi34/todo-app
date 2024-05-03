const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const todoschema = new Schema({
    todo: {
        type: String,
        required: true,
      },
    username:{
        type:String,
        require :true
    }
},{timestamps:true});
module.exports = mongoose.model("todo",todoschema);