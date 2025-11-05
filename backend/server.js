//our backend api
const express = require("express");
const session = require("express-session") // npm install express-session
const axios = require("axios")
const jwt = require("jsonwebtoken") // creating a token for the pages of the app. prevents access to pages without login
const cloudinary = require('cloudinary').v2;

//database table
const { initialiseTables } = require("./schemas/tableSetup")

// for running the python file
const { spawn, execFile, exec } = require("child_process");
const util = require("util")

const { Pool } = require("pg");
const { stat } = require("fs/promises");
const { data } = require("@tensorflow/tfjs");
const cron = require("node-cron")
const { Expo } = require("expo-server-sdk")
const path = require('path');
const fs = require('fs');
//initialise express
const app = express();

let expo = new Expo();

//password encryption
const bcrypt = require("bcrypt")

// upload directory 
const uploadDir = path.join(__dirname, "uploads")

const execAsync = util.promisify(exec)

//serve images from /uploads as public static files
app.use("/uploads", express.static(uploadDir))

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir)
    console.log("Uploads folder created at: ", uploadDir)
}

// JWT SECRET
const JWT_SECRET = process.env.JWT_SECRET

//enabling cross origin resource sharing for the app to run on my browser too
const cors = require("cors");
const { type } = require("os");
const { title } = require("process");
app.use(cors({
    origin: ["http://localhost:8081", "http://10.0.0.104:8081"],
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

app.listen(port, "0.0.0.0", () => {
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

// creating the DATABASE TABLES
initialiseTables(pool)

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
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

    return { status: "ok", data: result.rows }
}

async function getFridgeFood(foodie_id) {
    const result = await pool.query(
        `
                SELECT * FROM FRIDGE_FOOD WHERE FOODIE_ID = $1
            `,
        [foodie_id]
    )
    return { status: "ok", data: result.rows }
}

function getFoodieEmailFromToken(token) {
    const decoded = jwt.verify(token, "SECRET_KEY")
    const email = decoded.email

    return email
}

async function sendNotification(message) {

    try {
        const response = await axios.post(
            "https://app.nativenotify.com/api/notification",
            {  // The Native Notify user ID
                appId: process.env.NATIVE_NOTIFY_APP_ID, // numeric App ID from Native Notify
                appToken: process.env.NATIVE_NOTIFY_APP_TOKEN, // your app token
                title: "Food Expiry Alert 🍎",
                dateSent: message,
            },
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("Notification sent:", response.data);
    } catch (err) {
        console.error("Failed to send notification:", err.response?.data || err.message);
    }
}

async function getIdFromHeader(req) {
    const authHeader = await req.headers.authorization; // client sends 'Bearer <token>'
    if (!authHeader) throw new Error("No token sent");

    const token = authHeader.split(" ")[1];
    let email;

    try {
        const decoded = jwt.verify(token, "SECRET_KEY");
        email = decoded.email;
    } catch (err) {
        throw new Error("Invalid token");
    }

    const foodie = await getFoodie(email);
    if (!foodie?.data?.id) throw new Error("Foodie not found");

    return foodie.data.id;
}

//register
app.post("/register", async (req, res) => {
    const { email, name, password } = req.body

    //encrypting password
    const encryptedPassword = await bcrypt.hash(password, 10)

    //checking if the user isn't already in the db
    const oldFoodie = pool.query("SELECT EMAIL FROM FOODIE WHERE EMAIL = $1", [email])
    if ((await oldFoodie).rowCount >= 1) {
        return res.send({ status: "foodie exists", data: "Foodie Already Has an Account" });
    }

    await pool.query(
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
    const storedFoodie = await pool.query(`
            SELECT EMAIL, PASSWORD FROM FOODIE WHERE EMAIL = $1
        `, [email]
    )

    //if the email is not in the db it means the user doesn't exist
    if (storedFoodie.rowCount <= 0) {
        return res.send({ status: "no account", data: "Foodie has no account yet" })
    }

    //checking the password
    const hashedPassword = storedFoodie.rows[0].password

    //comparing the passwords
    const comparePasswords = await bcrypt.compare(password, hashedPassword)
    console.log(comparePasswords)
    if (!comparePasswords) {
        return res.send({ status: "wrong password", data: "Wrong Password. Try another" })
    }

    // CREATING A TOKEN FOR THE USER
    const token = jwt.sign({ email: email }, "SECRET_KEY", { expiresIn: "7d" })

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
        console.log("Photo URL:", photo)

        //sending the photo to flask
        const response = await axios.post("http://10.0.0.104:5002/predict", { photo });

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
    try {
        const authHeader = req.headers.authorization; // client sends 'Bearer <token>'
        if (!authHeader) return res.status(401).send({ status: "error", data: "No token sent" });

        const token = authHeader.split(" ")[1];
        let email;
        try {
            const decoded = jwt.verify(token, "SECRET_KEY");
            email = decoded.email;
        } catch (err) {
            return res.status(401).send({ status: "error", data: "Invalid token" });
        }
        pool.query(`
        SELECT * FROM FOODIE WHERE EMAIL = $1
        `, [email]).then((result) => {
            const foodie = {
                email: result.rows[0].email,
                name: result.rows[0].name,
                password: result.rows[0].password,
            }
            console.log(foodie)
            res.send({ status: "ok", data: foodie })
            console.log("Foodie", result.rows[0])
        })

    } catch (error) {
        console.error("Something went wrong", error)
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
    ).then((result) => {
        if (result.rowCount >= 1) {
            res.send({ status: "ok", data: "Name changed successfully" })
        } else {
            res.send({ status: "error", data: "Name changes rejected" })
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
        if (result.rowCount >= 1) {
            res.send({ status: "ok", data: "Password Changed Successfully" })
        } else {
            res.send({ status: "error", data: "Password Changed Rejected" })
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
        if (result.rowCount >= 1) {
            res.send({ status: "ok", data: "Account Deleted Successfully" })
        } else {
            res.send({ status: "error", data: "Account Delete Rejected" })
        }
    }).catch(err => {
        console.log(err)
    })
})

// Endpoint to search for area by name
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

//  Endpoint to get load shedding stages by areaId
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

//saving
app.post("/savepantryfood", async (req, res) => {
    try {
        const { foodData } = req.body;
        //console.log(foodData)
        const pantryFood = {
            name: foodData.name,
            amount: foodData.amount,
            date: foodData.date,
            photo: foodData.photo,
            unitOfMeasure: foodData.unitOfMeasure,
            public_id: foodData.public_id
        };

        if (!pantryFood.photo) {
            return res.send({ status: "error", data: "No photo provided" });
        }

        // --- Verify token & get foodie ---
        const token = foodData.token;
        const decoded = jwt.verify(token, "SECRET_KEY");
        const email = decoded.email;

        const foodie = await getFoodie(email);

        // --- Save pantry food to DB ---
        const result = await pool.query(
            `
        INSERT INTO PANTRY_FOOD (NAME, AMOUNT, EXPIRY_DATE, FOODIE_ID, PHOTO, PUBLIC_ID, unitOfMeasure)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `,
            [pantryFood.name, pantryFood.amount, pantryFood.date, foodie.data.id, pantryFood.photo, pantryFood.public_id, pantryFood.unitOfMeasure]
        );

        if (result.rowCount <= 0) {
            return res.send({ status: "error", data: "Failed to add food" });
        }

        res.send({ status: "ok", data: "Pantry food added" });

    } catch (error) {
        console.error("❌ Something went wrong:", error);
        res.status(500).send({ status: "error", data: "Server error" });
    }
});

// retrieving all 
app.get("/getpantryfood", async (req, res) => {
    const authHeader = req.headers.authorization; // client sends 'Bearer <token>'
    if (!authHeader) return res.status(401).send({ status: "error", data: "No token sent" });

    const token = authHeader.split(" ")[1];
    let email;
    try {
        const decoded = jwt.verify(token, "SECRET_KEY");
        email = decoded.email;
    } catch (err) {
        return res.status(401).send({ status: "error", data: "Invalid token" });
    }
    const foodie = await getFoodie(email)
    const pantryFood = await getPantryFood(foodie.data.id)

    console.log(pantryFood.data)

    res.send({ status: "ok", data: pantryFood.data })
})

//deleting 
app.post("/deletepantryfood", async (req, res) => {
    console.log(req.body)
    const id = req.body.id
    const public_id = req.body.public_id
    const photoPath = req.body.photo
    const amount = req.body.amount
    const deleteAmount = req.body.deleteAmount
    const dbAmount = amount - deleteAmount
    if (dbAmount === 0) {
        try {
            //deleting from the fridge_food table
            const result = await pool.query(
                `
                DELETE FROM PANTRY_FOOD WHERE ID = $1
            `,
                [id]
            )

            if (result.rowCount <= 0) {
                return res.send({ status: "error", data: "Something went wrong while deleting. Wrong food id maybe!" })
            }

            await cloudinary.uploader.destroy(public_id, { resource_type: "image" });
            console.log(`Deleted Cloudinary image: ${public_id}`);

            res.send({ status: "ok", data: "Pantry food deleted successfully" })
        } catch (error) {
            console.error(error)
            res.send({ status: "error", data: "Something went wrong while deleting. Wrong food id maybe!" })
        }
    }
    //update if the user wants to reduce the amount
    else {
        await pool.query(`
            UPDATE PANTRY_FOOD
            SET AMOUNT = $1
            WHERE ID = $2;
        `, [dbAmount, id]).then((result) => {
            if (result.rowCount > 0) {
                res.send({ status: "ok", data: "Pantry food amount updated successfully" })
            } else {
                res.send({ status: "error", data: "Something went wrong while updating Pantry food amount." })
            }
        }).catch(err => {
            console.error(error)
            res.send({ status: "error", data: "Something went wrong while updating Pantry food amount." })
        })
    }
})

//updating
app.post("/editPantryFood", async (req, res) => {
    console.log(req.body)
    const newFood = req.body.newFood
    await pool.query(
        `
            UPDATE PANTRY_FOOD 
            SET name = $1, amount = $2, expiry_date = $3
            WHERE id = $4;
        `, [newFood.name, newFood.amount, newFood.expiry_date, newFood.id]
    ).then((result) => {
        if (result.rowCount <= 0) {
            res.send({ status: "error", data: "Failed to update food item" })
        } else {
            res.send({ status: "ok", data: "Successfully updated food item" })
        }
    }).catch(err => {
        console.error("Something wrong happened while updating Pantry Food Item: ", err)
    })
})

const checkExpiryFoods = async () => {
    const now = new Date();

    const allFoodies = await pool.query(`SELECT id, email FROM foodie`);
    const foodies = allFoodies.rows;

    for (const foodie of foodies) {
        const pantryFood = await getPantryFood(foodie.id);
        const fridgeFood = await getFridgeFood(foodie.id);

        const checkFoodList = async (foodList, category) => {
            for (const item of foodList.data) {
                const expiryDate = new Date(item.expiry_date);
                const daysLeft = (expiryDate - now) / (1000 * 60 * 60 * 24);

                console.log(daysLeft)

                if (daysLeft <= 2) {
                    const message = `${item.name} in your ${category} will expire in ${Math.ceil(daysLeft)} day(s)!`;
                    console.log(`Sending notification to ${foodie.email}:`, message);

                    // Send to all tokens of the foodie
                    await sendNotification(message);
                }
            }
        };

        // Check both pantry & fridge foods for this foodie
        await checkFoodList(pantryFood, "Pantry");
        await checkFoodList(fridgeFood, "Fridge");
    }
};

cron.schedule("*/2 * * * *", async () => {
    console.log("🔔 Checking expiring foods...")
    await checkExpiryFoods();
})

//fridge
//saving
app.post("/savefridgefood", async (req, res) => {
    try {
        console.log(req.body)
        const { foodData } = req.body

        const fridgeFood = {
            name: foodData.name,
            amount: foodData.amount,
            photo: foodData.photo,
            unitOfMeasure: foodData.unitOfMeasure,
            public_id: foodData.public_id
        }
        if (!fridgeFood.photo) {
            return res.send({ status: "error", data: "No photo sent" })
        }

        const email = getFoodieEmailFromToken(foodData.token)

        const foodie = await getFoodie(email)

        await pool.query(
            `
                INSERT INTO FRIDGE_FOOD (NAME, AMOUNT, ISFRESH, FOODIE_ID, PHOTO, PUBLIC_ID, unitOfMeasure)
                VALUES($1, $2, $3, $4, $5, $6, $7)
            `,
            [fridgeFood.name, fridgeFood.amount, true, foodie.data.id, fridgeFood.photo, fridgeFood.public_id, fridgeFood.unitOfMeasure]
        ).then((result) => {
            if (result.rowCount != 1) {
                return res.send({ status: "error", data: "Failed to add the food" })
            }
            res.send({ status: "ok", data: "Fridge food added" })
        }).catch(err => {
            console.error("Something went wrong", err)
            return res.send({ status: "error", data: "Something went wrong" })
        })

    } catch (error) {
        console.log(error)
    }
})

//retrieving all
app.get("/getfridgefood", async (req, res) => {
    try {
        const authHeader = req.headers.authorization; // client sends 'Bearer <token>'
        if (!authHeader) return res.status(401).send({ status: "error", data: "No token sent" });

        const token = authHeader.split(" ")[1];
        let email;
        try {
            const decoded = jwt.verify(token, "SECRET_KEY");
            email = decoded.email;
        } catch (err) {
            return res.status(401).send({ status: "error", data: "Invalid token" });
        }
        const foodie = await getFoodie(email)
        console.log(foodie)
        const fridgeFood = await getFridgeFood(foodie.data.id)

        console.log(fridgeFood.data)
        res.send({ status: "ok", data: fridgeFood.data })
    } catch (error) {
        console.error("Something went wrong", error)
        return res.send({ status: "error", data: "Something went wrong when retrieving items" })
    }
})

//deleting 
app.post("/deletefridgefood", async (req, res) => {
    console.log(req.body)
    const id = req.body.id
    const public_id = req.body.public_id

    const photoPath = req.body.photo
    const amount = req.body.amount
    const deleteAmount = req.body.deleteAmount

    const dbAmount = amount - deleteAmount
    if (dbAmount === 0) {
        try {
            //deleting from the fridge_food table
            const result = await pool.query(
                `
                        DELETE FROM FRIDGE_FOOD WHERE ID = $1
                    `,
                [id]
            )

            if (result.rowCount <= 0) {
                return res.send({ status: "error", data: "Something went wrong while deleting. Wrong food id maybe!" })
            }

            await cloudinary.uploader.destroy(public_id, { resource_type: "image" });
            console.log(`Deleted Cloudinary image: ${public_id}`);

            res.send({ status: "ok", data: "Fridge food deleted successfully" })
        } catch (error) {
            console.error(error)
            res.send({ status: "error", data: "Something went wrong while deleting. Wrong food id maybe!" })
        }
    }
    //update if the user wants to reduce the amount
    else {
        await pool.query(`
            UPDATE FRIDGE_FOOD
            SET AMOUNT = $1
            WHERE ID = $2;
        `, [dbAmount, id]).then((result) => {
            if (result.rowCount > 0) {
                res.send({ status: "ok", data: "Fridge food amount updated successfully" })
            } else {
                res.send({ status: "error", data: "Something went wrong while updating Fridge food amount." })
            }
        }).catch(err => {
            console.error(error)
            res.send({ status: "error", data: "Something went wrong while updating Fridge food amount." })
        })
    }
})

//updating
app.post("/editFridgeFood", async (req, res) => {
    console.log(req.body)
    const newFood = req.body.newFood
    await pool.query(
        `
            UPDATE FRIDGE_FOOD 
            SET name = $1, amount = $2
            WHERE id = $3;
        `, [newFood.name, newFood.amount, newFood.id]
    ).then((result) => {
        if (result.rowCount <= 0) {
            res.send({ status: "error", data: "Failed to update food item" })
        } else {
            res.send({ status: "ok", data: "Successfully updated food item" })
        }
    }).catch(err => {
        console.error("Something wrong happened while updating Pantry Food Item: ", err)
    })
})

/////////////////////////

app.post("/get-ngos", async (req, res) => {
    try {
        const { lat, long, radius = 50000 } = req.body;

        const apiKey = process.env.GOOGLE_PLACES_API_KEY; // store key in .env
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${long}&radius=${radius}&keyword=charity&type=establishment&key=${apiKey}`;

        const response = await axios.get(url);

        const ngos = response.data.results.map(place => ({
            name: place.name,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            address: place.vicinity,
            place_id: place.place_id
        }));

        console.log("NGOs near you:", ngos);
        res.json({ status: "ok", data: ngos });

    } catch (error) {
        console.error("Something went wrong!", error);
        res.send({ status: "error", data: "Something went wrong when fetching NGO data" });
    }
});

// For testing only:
app.get("/test-notification", async (req, res) => {
    const testToken = "ExponentPushToken[cqNbu3EE_e7YAHO7H8g8w8]"; // Replace with your real token
    try {
        await sendNotification(testToken, "🔔 This is a test notification!");
        res.send("Test notification sent!");
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to send notification");
    }
});

app.get("/get-recipes", async (req, res) => {
    try {
        const id = await getIdFromHeader(req);
        const pantryFood = await getPantryFood(id);
        const fridgeFood = await getFridgeFood(id);

        const namesF = fridgeFood.data.map(item => item.name);
        const namesP = pantryFood.data.map(item => item.name);
        const allIngredients = [...namesF, ...namesP]

        ingredientQuery = encodeURIComponent(allIngredients.join(" "))
        console.log(ingredientQuery)
        //console.log(allIngredients.length)
        if (allIngredients.length > 0) {
            // getting the meals
            let meals = []
            for (let index = 0; index < allIngredients.length; index++) {
                const mealsReponse = await axios.get(`
                https://www.themealdb.com/api/json/v1/1/filter.php?i=${allIngredients.at(index)}
            `)
                if (mealsReponse.data.meals != null) {
                    meals.push(...mealsReponse.data.meals)
                }

            }
            console.log("Individual ingredients Meals fetched:", meals)

            //Multi ingredient code 
            // Multi ingredient code
            if (allIngredients.length > 1) {
                const multiIngredientMeals = [];

                // Decide how many ingredients per query (random between 2 and 4, for example)
                const maxGroupSize = Math.min(4, allIngredients.length);

                // Shuffle ingredients array to randomize grouping
                const shuffledIngredients = allIngredients.sort(() => 0.5 - Math.random());

                for (let groupSize = 2; groupSize <= maxGroupSize; groupSize++) {
                    for (let i = 0; i <= shuffledIngredients.length - groupSize; i++) {
                        const ingredientGroup = shuffledIngredients.slice(i, i + groupSize);
                        const groupQuery = encodeURIComponent(ingredientGroup.join(","));
                        try {
                            const response = await axios.get(
                                `https://www.themealdb.com/api/json/v2/65232507/filter.php?i=${groupQuery}`
                            );
                            if (response.data.meals != null) {
                                multiIngredientMeals.push(...response.data.meals);
                            }
                        } catch (err) {
                            console.error("Error fetching multi-ingredient meals:", err.message);
                        }
                    }
                }

                // Merge the multi-ingredient meals with the single-ingredient meals
                meals.push(...multiIngredientMeals);
            }
            const mealInstruct = []
            // getting the ingredients and instructions for every meal
            for (let index = 0; index < meals.length; index++) {
                const mealName = meals.at(index).strMeal
                const mealsDetail = await axios.get(`
                https://www.themealdb.com/api/json/v1/1/search.php?s=${mealName}
            `)
                //console.log(mealsDetail.data.meals)
                mealInstruct.push(...mealsDetail.data.meals)
            }

            console.log("Meal Instructions fetched:", mealInstruct)

            console.log("Recipes fetched:", mealInstruct);

            res.json({
                status: "ok",
                data: mealInstruct,
            });
        } else {
            res.json({
                status: "ok",
                data: [],
            });
        }


    } catch (error) {
        console.error("Error fetching recipes:", error);

        if (!res.headersSent) {
            res.status(500).json({
                status: "error",
                message: "Failed to fetch recipes",
                error: error.message,
            });
        }
    }
});

app.get("/", async (req, res) => {
    res.send({ status: "ok", data: "Server is up" })
})

app.post("/donate", async (req, res) => {
    const donations = req.body.items
    const { street, province, postalCode, city} = req.body
    console.log(city)

    for (let index = 0; index < donations.length; index++) {
        const donation = donations[index];

        const result = await pool.query(
            `
                INSERT INTO DONATION (photo, amount, foodie_id, name)
                values($1, $2, $3, $4)
                RETURNING donation_id
            `,
            [donation.photo, donation.amount, donation.foodie_id, donation.name]
        )

        const donationId = result.rows[0].donation_id;
        console.log("Inserted Donation ID:", donationId);

        // INSERTING INTO THE DONATION_PICKUP
        const pickupTableResult = await pool.query(`
            INSERT INTO DONATION_PICKUP(donation_id, street, city, province, postal_code)    
            VALUES($1, $2, $3, $4, $5)
        `, [donationId, street, city, province, postalCode])

        const actQuantity = donation.actualQuantity
        const donateAmount = donation.amount

        const amtLeft = actQuantity - donateAmount
        if (donation.from === "fridge") {
            if (amtLeft === 0) {
                await pool.query(
                    `
                        DELETE FROM FRIDGE_FOOD WHERE ID = $1
                    `, [donation.id]
                )
            } else {
                await pool.query(
                    `
                        UPDATE FRIDGE_FOOD SET AMOUNT = $1 WHERE ID = $2
                    `, [amtLeft, donation.id]
                )
            }
        } else {
            if (amtLeft === 0) {
                await pool.query(
                    `
                        DELETE FROM PANTRY_FOOD WHERE ID = $1
                    `, [donation.id]
                )
            } else {
                await pool.query(
                    `
                        UPDATE PANTRY_FOOD SET AMOUNT = $1 WHERE ID = $2
                    `, [amtLeft, donation.id]
                )
            }
        }

    }

    res.send({ status: "ok", data: "Item(s) are up for Donation" })
})

//donations

//Getting
    app.get("/getDonations", async (req, res) => {
        const id = await getIdFromHeader(req)
        console.log(id)
        const result = await pool.query(
            `
                SELECT d.name, d.donation_id, photo, amount, f.id, email, f.name AS fname, email, street, city, province, postal_code
                FROM DONATION d, FOODIE f, DONATION_PICKUP p
                where d.foodie_id = f.id
                and d.donation_id = p.donation_id 
                and f.id != $1
            `, [id]
        )

        const donation = result.rows
        console.log(donation)
        res.send({ status: "ok", data: donation })
    })

// CLAIMING THE DONATION

app.post("/claimDonation", async (req, res) => {
    const donation = req.body.donation
    const token = req.baseUrl.token


})