const express = require("express"); //initialise express
const app = express();
const mongoose = require("mongoose");

app.use(express.json())

const mongoUrl = "mongodb+srv://glenmpofu:tshepolovesrea0625@cluster0.biivelo.mongodb.net/FoodXP?retryWrites=true&w=majority&appName=Cluster0"

//getiing the schemas 
require("./Foodie")
const Foodie = mongoose.model("Foodie")

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

    const oldFoodie = await Foodie.findOne({ email: email })

    if (oldFoodie) {
        return res.send({ status: "error", data: "Foodie Already Has an Account" });
    }

    try {
        await Foodie.create({
            email: email,
            name: name,
            password: password,
            phone: phone
        })
        res.send({ status: "ok", data: "Foodie Created" })
    } catch (error) {
        console.log(error)
    }
})

app.post("/login", async (req, res) => {
    console.log("Request Body", req.body)
    const { email, password } = req.body

    const findFoodie = await Foodie.findOne({ email: email })

    if (findFoodie) {
        if (findFoodie.password == password) {
            res.send({ status: "ok", data: "Foodie Created" })
        }
        else {
            res.send({ status: "error", data: "Wrong Password" })
        }

    } else {
        return res.send({ status: "error", data: "Foodie Not Found" })
    }
})