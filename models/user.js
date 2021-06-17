let mongoose = require("mongoose");
let Schema = mongoose.Schema;

const userSchema = new Schema({
    username:{type:String,required:true},
    email:{type:String,required:true},
    password:{type:String,required:true},
    longitude:{type:Number},
    latitude:{type:Number},
    session:{type:String}
});

let user = mongoose.model("user",userSchema);
module.exports = user;