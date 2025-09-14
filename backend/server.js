const express = require("express"); //initialise express
const app = express();
const mongoose = require("mongoose");

//password encryption
const bcrypt = require("bcryptjs")

//enabling cross origin resource sharing for the app to run on my browser too
const cors = require("cors");
app.use(cors({
    origin: "*"
}))

app.use(express.json())

const mongoUrl = "mongodb+srv://glenmpofu:tshepolovesrea0625@cluster0.biivelo.mongodb.net/FoodXP?retryWrites=true&w=majority&appName=Cluster0"

//geting the schemas 
require("./schemas/Foodie")

//modeling the schemas into the database
const Foodie = mongoose.model("Foodie")

//connecting the database
mongoose.connect(mongoUrl).then(() => {
    console.log("Database Connected")
}).catch((e) => {
    console.log(e)
})

//creating a get API
app.get("/", (req, res) => {
    res.send({ status: "Started" })
})

//assigning a pool
app.listen(5000, () => {
    console.log("Server Has Started at Port " + 5000)
})

//register API. async is passed to wait for data
//req- comes from the app and response comes from the server
app.post("/register", async (req, res) => {
    console.log("Request Body:", req.body);
    const { email, name, password, phone } = req.body;

    const cleanEmail = email.trim().toLowerCase();

    const oldFoodie = await Foodie.findOne({ email: cleanEmail })

    if (oldFoodie) {
        return res.send({ status: "error", data: "Foodie Already Has an Account" });
    }

    //creates a hash password encryption of 10 characters
    const encryptPassword = await bcrypt.hash(password, 10)

    try {
        await Foodie.create({
            email: cleanEmail,
            name: name,
            password: encryptPassword,
            phone: phone
        })
        res.send({ status: "ok", data: "Foodie Created" })
    } catch (error) {
        console.log(error)
    }
})

//login post API
app.post("/login", async (req, res) => {
    console.log("Request Body", req.body)
    const { email, password } = req.body

    const findFoodie = await Foodie.findOne({ email: email })

    if (!findFoodie) {
        return res.send({ status: "error", data: "Foodie Not Found" })
    }

    const passMatch = await bcrypt.compare(password, findFoodie.password);

    if (passMatch) {
        res.send({ status: "ok", data: "Login Sucessful" })
    }
    else {
        res.send({ status: "error", data: "Wrong Password" })
    }

})