//our backend api
const express = require("express");
const session = require("express-session") // npm install express-session
const axios = require("axios")
// for running the python file
const { spawn, execFile } = require("child_process");

const { Pool } = require("pg");
const { stat } = require("fs/promises");
const { data } = require("@tensorflow/tfjs");

const path = require('path');
const fs = require('fs');
//initialise express
const app = express();

//password encryption
const bcrypt = require("bcrypt")

// upload directory 
const uploadDir = path.join(__dirname, "uploads")

if(!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir)
    console.log("Uploads folder created at: ", uploadDir)
}

//enabling cross origin resource sharing for the app to run on my browser too
const cors = require("cors");
app.use(cors({
    origin: ["http://localhost:8082", "http://192.168.137.1:8082"],
    credentials: true
}))

/*
    APP USE
*/
//configure session
app.use(session({
    secret: "foodxpsession1",
    remove: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 // 1 day. the session stays alive for 1 day
    },
    rolling: true
}));

const port = process.env.PORT ?? 5001

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ------------------------------

app.listen(port, () => {
    console.log(`Listening on Port ${port}`)
})

require("dotenv").config();


const database = process.env.DATABASE_URL
const pool = new Pool({
    connectionString: database
})

/* 
    SCHEMA CREATION QUERIES
*/
//test connection
pool.query("Select version();").
    then((res) => {
        console.log("Database Connected")
        console.log("Version " + res.rows[0].version)
    }).catch((e) => console.log("Database Connection Error: " + e))

//FOODIE table creation
pool.query(`
    CREATE TABLE IF NOT EXISTS FOODIE
    ( 
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        EMAIL VARCHAR(100) UNIQUE, 
        NAME VARCHAR(50) NOT NULL, 
        PASSWORD VARCHAR(100) NOT NULL
    )    
    `).then((res) => {
    console.log("Foodie Table Ready")

}).catch((e) => {
    console.log("Error creating table" + e)
})

//PANTRY AND FRIDGE TABLE CREATION
pool.query(`
    CREATE TABLE IF NOT EXISTS PANTRY_FOOD
    (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(20) NOT NULL,
        quantity DOUBLE PRECISION DEFAULT 1,
        expiry_date DATE,
        foodie_id UUID REFERENCES FOODIE(id)
    );
`).then((res) => {
    console.log("Pantry_Food Table Ready")
}).catch(error => {
    console.error("Something went wrong when creating Pantry_Food table", error)
});
pool.query(`
    CREATE TABLE IF NOT EXISTS FRIDGE_FOOD
    (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(20) NOT NULL,
        quantity DOUBLE PRECISION DEFAULT 1,
        isFresh BOOLEAN, 
        foodie_id UUID REFERENCES FOODIE(id)
    );
`).then((res) => {
    console.log("Fridge_Food Table Ready")
}).catch(error => {
    console.error("Something went wrong when creating Pantry_Food table", error)
});

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
app.post("/logout", async (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send({ status: "error", data: "Logout failed" });
        res.clearCookie("connect.sid");
        return res.send({ status: "ok", data: "Logged out successfully" });
    })
})

//saving the food
const classifyModelFile = path.join(__dirname, "model", "pantry_frigde_model.py") 

app.post("/classifyfood", async (req, res) => {
  try {
    const { photo } = req.body;
    if (!photo) return res.status(400).json({ error: "No image provided" });
        console.log("Base64 length:", photo.length)

        //sending the photo to flask
        const response = await axios.post("http://192.168.137.1:5001/predict", {photo});

        console.log("Python result: ", response.data)
        res.json(response.data)

  } catch (error) {
        console.error("Classification error:", error.message);
        if (error.response) {
        // Flask sent an error response
        res.status(error.response.status).json(error.response.data);
        } else {
        res.status(500).json({ error: "Classification failed" });
        }
    }
});

// session getter
app.get("/session", async (req, res) => {
    console.log(req.session.user);
    if(req.session.user){
        //searching the database for the logged in user
        const email = req.session.user.email
        
        pool.query(`
            SELECT * FROM FOODIE WHERE EMAIL = $1
            `, [email]).then((result) => {
                const foodie = {
                   email: result.rows[0].email,
                   name: result.rows[0].name,
                   password: result.rows[0].password,
                }
                console.log(foodie)
                res.send({status: "ok", data: foodie})
                console.log("Foodie",result.rows[0])
            })            
        
    }else{
        res.send({status: "error", data: req.session.user})
    }
})

//name changing
app.post("/namechange", async (req, res) => {
    console.log(req.body)
    //change name logic
    const email = req.body.email
    const name = req.body.name

    pool.query(`
        UPDATE FOODIE SET NAME = $1 WHERE EMAIL = $2 
        `, [name, email]
    ).then((result)=> {
        if(result.rowCount >= 1){
            res.send({status: "ok", data: "Name changed successfully"})
        }else{
            res.send({status: "error", data: "Name changes rejected"})
        }
        console.log(result)
    }).catch(err => {
        console.log(err)
    })

})

//password updating
app.post("/passwordchange", async (req, res) => {
    console.log(req.body)
    const email = req.body.email
    const password = req.body.password

    const encryptedPassword = await bcrypt.hash(password, 10)

    await pool.query(`
        UPDATE FOODIE SET PASSWORD = $1 WHERE EMAIL = $2
        `, [encryptedPassword, email]
    ).then((result) => {
        if(result.rowCount >= 1){
            res.send({status: "ok", data: "Password Changed Successfully"})
        }else{
            res.send({status: "error", data: "Password Changed Rejected"})
        }
    }).catch(err => {
        console.log(err)
    })
})

//account deletion
app.post("/deleteaccount", async (req, res) => {
    console.log(req.body)
    const email = req.body.email

    await pool.query(`
        DELETE FROM FOODIE WHERE EMAIL = $1
        `, [email]
    ).then((result) => {
        if(result.rowCount >= 1){
            res.send({status: "ok", data: "Account Deleted Successfully"})
        }else{
            res.send({status: "error", data: "Account Delete Rejected"})
        }
    }).catch(err => {
        console.log(err)
    })
})

// ✅ Endpoint to search for area by name
app.get("/loadshedding/area", async (req, res) => {
  try {
    const response = await axios.get(
      `https://developer.sepush.co.za/business/2.0/areas_search?text=polokwane&test=current`,
      {
        headers: { token: process.env.ESKOM_API_KEY },
      }
    );

    const areas = response.data.areas; // ⚠️ important: the array is under .areas
    if (!areas || areas.length === 0) {
      return res.status(404).json({ error: "Area not found" });
    }

    const area = areas[0]; // take the first match
    res.json({ areaId: area.id, name: area.name });
    console.log("Area search result:", area);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Failed to search area" });
  }
});

// ✅ Endpoint to get load shedding stages by areaId
app.get("/loadshedding/:areaId", async (req, res) => {
  try {
    const { areaId } = req.params;
    const response = await axios.get(
      `https://developer.sepush.co.za/business/2.0/area?id=${areaId}&test=current`,
      {
        headers: { token: process.env.ESKOM_API_KEY },
      }
    );
    console.log(response.data.schedule.days[2].stages[3])
    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch load shedding info" });
  }
});

app.post("/savepantryfood", async (req, res) => {
    try {
        console.log(req.body)
        const pantryFood = {
            name: req.body.name,
            quantity: req.body.quantity,
            date: req.body.date,
            photo: req.body.photo,
        }

        if(!pantryFood.photo) res.send({status: "error", data: "no photo provided"});

        //file name
        const filename = `food_${Date.now()}.jpg`;
        const filePath = path.join(uploadDir, filename)

        const base64Data = pantryFood.photo.replace(/^data:image\/\w+;base64,/, "");
        console.log("Base64 length:", base64Data.length);
        
        fs.writeFileSync(filePath, base64Data, "base64")
        console.log("Image saved to: ", filePath)

        //here save pantry food infor to the db

        res.send({status: "ok", data: "Food save successfully"})
    } catch (error) {
        console.error("Something went wrong", error)
    }    

})

app.post("/savefridgefood", async (req, res) => {
    try{
        console.log(req.body)


    }catch(error){
        console.log(error)
    }
})