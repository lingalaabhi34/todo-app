const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const accesSchema = new Schema({
  sessionId: {
    type: String,
    require: true,
  },
  reqtime: {
    type: String,
    require: true,
  },
});
module.exports = mongoose.model("access", accesSchema);
