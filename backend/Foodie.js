const mongoose = require("mongoose")

const FoodieSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    name: String,
    password: String,
    phone: String
}, {
    collection: "Foodie"//name of the table
})
mongoose.model("Foodie", FoodieSchema);