//our backend api
const express = require("express");
const session = require("express-session") // npm install express-session

//initialise express
const app = express();

//password encryption
const bcrypt = require("bcrypt")

//enabling cross origin resource sharing for the app to run on my browser too
const cors = require("cors");
app.use(cors({
    origin: "*"
}))

//configure session
app.use(session({
    secret: "supersecretkey",
    remove: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 // 1 day. the session stays alive for 1 day
    }

}));

const port = process.env.PORT ?? 5001

app.use(express.json())
app.listen(port, () => {
    console.log(`Listening on Port ${port}`)
})

require("dotenv").config();

const { Pool } = require("pg");

const database = process.env.DATABASE_URL
const pool = new Pool({
    connectionString: database
})

//test connection
pool.query("Select version();").
    then((res) => {
        console.log("Database Connected")
        console.log("Version " + res.rows[0].version)
    }).catch((e) => console.log("Database Connection Error: " + e))

//table creation
pool.query(`
    CREATE TABLE IF NOT EXISTS FOODIE
    (
        EMAIL VARCHAR(100) PRIMARY KEY, 
        NAME VARCHAR(50) NOT NULL, 
        PASSWORD VARCHAR(100) NOT NULL
    )    
    `).then((res) => {
    console.log("Foodie Table Ready")

}).catch((e) => {
    console.log("Error creating table" + e)
})

//register
app.post("/register", async (req, res) => {
    const { email, name, password } = req.body
    console.log(password)

    //encrypting password
    const encryptedPassword = await bcrypt.hash(password, 10)

    //checking if the user isn't already in the db
    const oldFoodie = pool.query("SELECT EMAIL FROM FOODIE WHERE EMAIL = $1", [email])
    if ((await oldFoodie).rowCount >= 1) {
        return res.send({ status: "foodie exists", data: "Foodie Already Has an Account" });
    }

    pool.query(
        `INSERT INTO FOODIE(EMAIL, NAME, PASSWORD)
         VALUES($1, $2, $3);
        `, [email, name, encryptedPassword]
    ).then(() => {
        console.log("Foodie Account Created")
    }).catch((e) => console.log("Error creating account: " + e))

    res.send({ status: "ok", data: "Foodie Registered Successfully" })
})

//login
app.post("/login", async (req, res) => {
    console.log(req.body)
    const { email, password } = req.body;

    //check if the user exists firs
    const storedFoodie = pool.query(`
            SELECT EMAIL, PASSWORD FROM FOODIE WHERE EMAIL = $1
        `, [email]
    )

    //if the email is not in the db it means the user doesn't exist
    if ((await storedFoodie).rowCount <= 0) {
        return res.send({ status: "no account", data: "Foodie has no account yet" })
    }

    //checking the password
    const hashedPassword = (await storedFoodie).rows[0].password

    //comparing the passwords
    const comparePasswords = await bcrypt.compare(password, hashedPassword)
    console.log(comparePasswords)
    if (!comparePasswords) {
        return res.send({ status: "wrong password", data: "Wrong Password. Try another" })
    }

    //SAVING USER IN SESSION
    req.session.user = { email };
    console.log("Session Created: ", req.session)

    // else move to dashboard
    return res.send({ status: "ok", data: "Login Successful" })
})

//logout 
app.post("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send({ status: "error", data: "Logout failed" });
        res.clearCookie("connect.sid");
        return res.send({ status: "ok", data: "Logged out successfully" });
    })
})