//our backend api
const express = require("express");
const session = require("express-session") // npm install express-session
const axios = require("axios")
const jwt = require("jsonwebtoken") // creating a token for the pages of the app. prevents access to pages without login

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

//serve images from /uploads as public static files
app.use("/uploads", express.static(uploadDir))

if(!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir)
    console.log("Uploads folder created at: ", uploadDir)
}

// JWT SECRET
const JWT_SECRET = process.env.JWT_SECRET

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
        foodie_id UUID REFERENCES FOODIE(id),
        photo VARCHAR(150)
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
        foodie_id UUID REFERENCES FOODIE(id),
        photo VARCHAR(150)
    );
`).then((res) => {
    console.log("Fridge_Food Table Ready")
}).catch(error => {
    console.error("Something went wrong when creating Pantry_Food table", error)
});

//reusable FUNCTIONS
async function getFoodie(email) {
  const query = `
    SELECT * FROM Foodie WHERE email = $1
  `;

  try {
    const result = await pool.query(query, [email]);

    if (result.rowCount !== 1) {
      return { status: "error", data: "No such foodie" };
    }

    return { status: "ok", data: result.rows[0] };

  } catch (err) {
    console.error("Database error:", err.message);
    return { status: "error", data: err.message };
  }
}

async function getPantryFood(foodie_id) {
    const result = await pool.query(`
        SELECT * FROM PANTRY_FOOD WHERE FOODIE_ID = $1   
    `, [foodie_id]
    );

    if(result.rowCount <= 0){
        return { status: "error", data: "No pantry food items found for the current foodie"}
    }

    return { status: "ok", data: result.rows }
}

async function getFridgeFood(foodie_id) {
    const result = await pool.query(
        `
            SELECT * FROM FRIDGE_FOOD WHERE FOODIE_ID = $1
        `,
        [foodie_id]
    )

    if(result.rowCount <= 0){
        return {status: "error", data: "No Foodie Found with that id"}
    }
    const foodie = result.rows
    return {status: "ok", data: foodie}
}

function getFoodieEmailFromToken(token){
    const decoded = jwt.verify(token, "SECRET_KEY")
    const email = decoded.email

    return email
}

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

    // CREATING A TOKEN FOR THE USER
    const token = jwt.sign({email: email}, "SECRET_KEY", {expiresIn: "7d"})

    //SAVING USER IN SESSION
    req.session.user = { email };
    console.log("Session Created: ", req.session)

    // else move to dashboard
    return res.send({ status: "ok", data: "Login Successful", token: token })
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

// pantry
    // saving
    app.post("/savepantryfood", async (req, res) => {
        try {
            const {foodData} = req.body
            console.log(foodData)
            
            const pantryFood = {
                name: foodData.name,
                quantity: foodData.quantity,
                date: foodData.date,
                photo: foodData.photo,
            }

            if(!pantryFood.photo) res.send({status: "error", data: "no photo provided"});

            //file name
            const filename = `food_${Date.now()}.jpg`;
            const filePath = path.join(uploadDir, filename)

            const base64Data = pantryFood.photo.replace(/^data:image\/\w+;base64,/, "");
            console.log("Base64 length:", base64Data.length);
            
            fs.writeFileSync(filePath, base64Data, "base64")
            console.log("Image saved to: ", filePath)

            //getting email from token
            const token = foodData.token
            const decoded = jwt.verify(token, "SECRET_KEY")
            const email = decoded.email

            const foodie = await getFoodie(email)
            //console.log(foodie)
            //here save pantry food infor to the db
            await pool.query(
                `
                    INSERT INTO PANTRY_FOOD (NAME, QUANTITY, EXPIRY_DATE, FOODIE_ID, PHOTO)
                    Values($1, $2, $3, $4, $5);
                `, [pantryFood.name, pantryFood.quantity, pantryFood.date, foodie.data.id, filePath]
            ).then((result) => {
                if(result.rowCount <= 0){
                    return res.send({status: "error", data: "Failed to add food"})
                }

                res.send({status: "ok", data: "Pantry food added"})
            })
        } catch (error) {
            console.error("Something went wrong", error)
        }    

    })
    
    
    // retrieving all 
    app.get("/getpantryfood", async (req, res) => {
        const email = req.session.user.email
        const foodie = await getFoodie(email)
        const pantryFood = await getPantryFood(foodie.data.id)

        console.log(pantryFood.data)
        
        res.send({status: "ok", data: pantryFood.data})
    })

//fridge
    //saving
    app.post("/savefridgefood", async (req, res) => {
        try{
            console.log(req.body)
            const {foodData} = req.body

            const fridgeFood = {
                name: foodData.name,
                quantity: foodData.quantity,
                photo: foodData.photo,
            }
            if(!fridgeFood.photo){
                return res.send({status: "error", data: "No photo sent"})
            }

            //file name
            const fileName = `food_${Date.now()}.jpg`
            const filePath = path.join(uploadDir, fileName)

            const base64Data = fridgeFood.photo.replace(/^data:image\/\w+;base64,/, "")
            fs.writeFileSync(filePath, base64Data, "base64")

            const email = getFoodieEmailFromToken(foodData.token)

            const foodie = await getFoodie(email)

            await pool.query(
                `
                    INSERT INTO FRIDGE_FOOD (NAME, QUANTITY, ISFRESH, FOODIE_ID, PHOTO)
                    VALUES($1, $2, $3, $4, $5)
                `,
                [fridgeFood.name, fridgeFood.quantity, true, foodie.data.id, filePath]
            ).then((result) => {
                if(result.rowCount != 1){
                    return res.send({status: "error", data: "Failed to add the food"})
                }
                res.send({status: "ok", data: "Fridge food added"})
            }).catch(err => {
                console.error("Something went wrong", err)
                return res.send({status: "error", data: "Something went wrong"})
            })

        }catch(error){
            console.log(error)
        }
    })

    //retrieving all
    app.get("/getfridgefood", async (req, res) => {
        try {
            const email = req.session.user.email
            const foodie = await getFoodie(email)
            console.log(foodie)
            const fridgeFood = await getFridgeFood(foodie.data.id)

            console.log(fridgeFood.data)
            res.send({status: "ok", data: fridgeFood.data})
        } catch (error) {
            console.error("Something went wrong", err)
            return res.send({status: "error", data: "Something went wrong when retrieving items"})
        }
    })