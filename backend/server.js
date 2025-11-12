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
const pLimit = require("p-limit");
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
// Retry helper for async functions
async function retryOn401(fn, retries = 3, delay = 5000) {
    try {
        return await fn();
    } catch (err) {
        if (err.response && err.response.status === 401 && retries > 0) {
            console.warn(`401 Unauthorized. Retrying in ${delay / 1000}s... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryOn401(fn, retries - 1, delay);
        }
        throw err;
    }
}

//register
app.post("/register", async (req, res) => {
    const { email, name, password, phone } = req.body

    //encrypting password
    const encryptedPassword = await bcrypt.hash(password, 10)

    //checking if the user isn't already in the db
    const oldFoodie = pool.query("SELECT EMAIL FROM FOODIE WHERE EMAIL = $1", [email])
    if ((await oldFoodie).rowCount >= 1) {
        return res.send({ status: "foodie exists", data: "Foodie Already Has an Account" });
    }

    await pool.query(
        `INSERT INTO FOODIE(EMAIL, NAME, PASSWORD, PHONE)
         VALUES($1, $2, $3, $4);
        `, [email, name, encryptedPassword, phone]
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

// Classifying food
app.post("/classifyfood", async (req, res) => {
    try {
        const { photo } = req.body;
        if (!photo) return res.status(400).json({ error: "No image provided" });
        console.log("Photo URL:", photo)

        //sending the photo to flask
        const response = await axios.post("http://192.168.101.103:5002/predict", { photo });

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
        if (!authHeader) return res.send({ status: "error", data: "No token sent" });

        const token = authHeader.split(" ")[1];
        let email;
        try {
            const decoded = jwt.verify(token, "SECRET_KEY");
            email = decoded.email;
        } catch (err) {
            return res.send({ status: "error", data: "Invalid token" });
        }
        await pool.query(`
        SELECT * FROM FOODIE WHERE EMAIL = $1
        `, [email]).then((result) => {
            const foodie = {
                email: result.rows[0].email,
                name: result.rows[0].name,
                password: result.rows[0].password,
                phone: result.rows[0].phone
            }
            console.log(foodie)
            res.send({ status: "ok", data: foodie })
            console.log("Foodie", foodie)
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

app.post("/changePhone", async (req, res) => {
    const { email, phone } = req.body
    const result = await pool.query(`
        UPDATE FOODIE 
        SET PHONE = $1
        WHERE EMAIL = $2   
    `, [phone, email])

    if (result.rowCount >= 1) {
        res.send({ status: "ok", data: "Phone Updated Successfully" })
    } else {
        res.send({ status: "error", data: "Failed to Update Phone" })
    }
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
    try {
        const authHeader = req.headers.authorization; // client sends 'Bearer <token>'
        if (!authHeader) return res.send({ status: "error", data: "No token sent" });

        const token = authHeader.split(" ")[1];
        let email;
        try {
            const decoded = jwt.verify(token, "SECRET_KEY");
            email = decoded.email;
        } catch (err) {
            return res.send({ status: "error", data: "Invalid token" });
        }

        const foodie = await getFoodie(email);

        // Retry getPantryFood on 401 errors
        const pantryFood = await retryOn401(() => getPantryFood(foodie.data.id), 3, 5000);

        console.log(pantryFood.data);
        res.send({ status: "ok", data: pantryFood.data });

    } catch (error) {
        console.error("Something went wrong", error);
        res.send({ status: "error", data: "Something went wrong when retrieving items" });
    }
});

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

// Route
app.get("/getfridgefood", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.send({ status: "error", data: "No token sent" });
        const token = authHeader.split(" ")[1];

        let email;
        try {
            const decoded = jwt.verify(token, "SECRET_KEY");
            email = decoded.email;
        } catch (err) {
            return res.send({ status: "error", data: "Invalid token" });
        }

        const foodie = await getFoodie(email);

        // Retry getFridgeFood on 401 errors
        const fridgeFood = await retryOn401(() => getFridgeFood(foodie.data.id), 3, 5000);

        res.send({ status: "ok", data: fridgeFood.data });

    } catch (error) {
        console.error("Something went wrong", error);
        res.send({ status: "error", data: "Something went wrong when retrieving items" });
    }
});

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

///getting recipes
app.post("/getAiRecipe", async (req, res) => {
    console.log(req.body)
    try {
        const ingredients = req.body;

        const formattedIngredients = ingredients
            .map(item => `${item.name} (${item.amount} ${item.unitofmeasure || ""})`)
            .join(", ");

        const prompt = `
                Return ONLY valid JSON. No explanations. No formatting. No markdown.
                
                You are a creative and budget-friendly chef AI. Create exactly 4 recipes using ONLY these ingredients:
                ${formattedIngredients}
                
                Each recipe MUST follow this exact structure:
                
                [
                {
                    "name": "string",
                    "description": "string",
                    "ingredients": [
                    { "ingredient": "string", "measure": "string" }
                    // number of ingredients can be ANY length
                    ],
                    "instructions": [
                    "string"
                    // number of steps can be ANY length (3–10 typical)
                    ],
                    "time": "string",
                    "difficulty": "Easy | Medium | Hard"
                }
                ]
                
                Rules:
                - The number of ingredients is flexible.
                - The number of instruction steps is flexible.
                - Return only the JSON array with exactly 4 recipe objects.
                `;

        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: prompt }],
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const aiRaw = response.data.choices[0].message.content;

        let aiRecipes;
        try {
            aiRecipes = JSON.parse(aiRaw);
        } catch (e) {
            return res.status(500).json({ error: "Invalid AI JSON output", raw: aiRaw });
        }
        console.log(aiRecipes)
        res.json({ recipes: aiRecipes });

    } catch (error) {
        console.error("AI Recipe Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to generate recipes" });
    }
});

async function axiosWithRetry(url, options = {}, delay = 5000) {
    while (true) {
        try {
            const response = await axios(url, options);
            return response;
        } catch (err) {
            console.warn(`Request failed (${err.response?.status}). Retrying in ${delay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

//recipes from themealdb
app.get("/get-recipes", async (req, res) => {
    try {
        const id = await getIdFromHeader(req);
        const pantryFood = await getPantryFood(id);
        const fridgeFood = await getFridgeFood(id);

        // --- Collect all ingredients ---
        const allIngredients = [
            ...fridgeFood.data.map(item => item.name),
            ...pantryFood.data.map(item => item.name),
        ];

        if (!allIngredients.length) return res.json({ status: "ok", data: [] });

        const mealsSet = new Map(); // Deduplicate meals

        // --- Helper to fetch meals by ingredient list ---
        const fetchMealsByIngredients = async (ingredients) => {
            if (!ingredients.length) return;
            try {
                const query = encodeURIComponent(ingredients.join(","));
                const response = await axiosWithRetry(
                    `https://www.themealdb.com/api/json/v2/65232507/filter.php?i=${query}`
                );
                if (response?.data?.meals) {
                    response.data.meals.forEach(meal => mealsSet.set(meal.idMeal, meal));
                }
            } catch (err) {
                console.warn(`Failed to fetch meals for [${ingredients.join(",")}]:`, err.message);
            }
        };

        // --- 1. Fetch single ingredients in parallel ---
        await Promise.all(allIngredients.map(ingredient => fetchMealsByIngredients([ingredient])));

        // --- 2. Multi-ingredient combinations (2–4) with limit ---
        const maxGroupSize = Math.min(4, allIngredients.length);
        const maxCombosPerSize = 10; // Limit to avoid combinatorial explosion

        const getCombinations = (arr, k) => {
            const combos = [];
            const helper = (start, path) => {
                if (path.length === k) {
                    combos.push([...path]);
                    return;
                }
                for (let i = start; i < arr.length; i++) {
                    path.push(arr[i]);
                    helper(i + 1, path);
                    path.pop();
                }
            };
            helper(0, []);
            return combos.sort(() => 0.5 - Math.random()).slice(0, maxCombosPerSize);
        };

        for (let size = 2; size <= maxGroupSize; size++) {
            const combos = getCombinations(allIngredients, size);
            await Promise.all(combos.map(combo => fetchMealsByIngredients(combo)));
        }

        // --- 3. Fetch detailed meal info with concurrency limit ---
        const limit = pLimit(5); // max 5 concurrent requests
        const mealDetails = await Promise.all(
            Array.from(mealsSet.values()).map(meal =>
                limit(async () => {
                    try {
                        const res = await axiosWithRetry(
                            `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(meal.strMeal)}`
                        );
                        return res?.data?.meals?.[0] || null;
                    } catch (err) {
                        console.warn(`Failed to fetch details for ${meal.strMeal}:`, err.message);
                        return null;
                    }
                })
            )
        );

        // --- 4. Return filtered results ---
        res.json({ status: "ok", data: mealDetails.filter(Boolean) });

    } catch (error) {
        console.error("Unexpected error:", error);
        res.json({ status: "ok", data: [] });
    }
});
/////////////////////////////////////

app.get("/", async (req, res) => {
    res.send({ status: "ok", data: "Server is up" })
})

// Make sure to store your PositionStack API key in an env variable for safety
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

async function forwardGeocode({ street, city, province, country }) {
    try {
        const formattedAddress = `${street}, ${city}, ${province}, ${country}`;

        const response = await axios.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            {
                params: {
                    address: formattedAddress,
                    key: GOOGLE_MAPS_API_KEY,
                },
            }
        );

        const results = response.data.results;
        if (!results || results.length === 0) return null;

        const loc = results[0].geometry.location;

        return {
            latitude: loc.lat,
            longitude: loc.lng
        };
    } catch (err) {
        console.error("Google forward geocoding failed:", err);
        return null;
    }
}

//donations
app.post("/donate", async (req, res) => {
    try {
        const foodie_id = await getIdFromHeader(req);
        const donations = req.body.items;
        const { street, city, province, postalCode, country, pickupTime } = req.body;
        const prevLoc = req.body.location_id;

        let location_id;
        const dateObj = new Date(pickupTime);
        let hours = dateObj.getHours();
        let minutes = String(dateObj.getMinutes()).padStart(2, "0");

        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;  // convert 0 -> 12

        const finalTime = `${hours}:${minutes} ${ampm}`;
        console.log(finalTime);
        // Handle location
        if (prevLoc === null) {
            const coords = await forwardGeocode({
                street,
                city,
                province,
                country
            });

            if (!coords) {
                return res.send({ status: "error", data: "Failed to retrieve coordinates" });
            }

            const r = await pool.query(
                `
                    INSERT INTO LOCATION(latitude, longitude, city, province, zipcode, country, street, foodie_id, pickupTime)
                    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING id
                `,
                [
                    coords.latitude,
                    coords.longitude,
                    city,
                    province,
                    postalCode,
                    country,
                    street,
                    foodie_id,
                    finalTime
                ]
            );

            console.log("LOCATION ADDED");
            location_id = r.rows[0].id;
        } else {
            location_id = prevLoc;
        }

        // Insert each donation record
        for (const donation of donations) {
            const isPantry = donation.from === "pantry";

            await pool.query(
                `
                INSERT INTO DONATION(
                    foodie_id,
                    ${isPantry ? "pantry_food_id" : "fridge_food_id"},
                    location_id,
                    amount,
                    sourceTable
                )
                VALUES($1, $2, $3, $4, $5)
                `,
                [
                    donation.foodie_id,
                    donation.id,
                    location_id,
                    donation.amount,
                    donation.from
                ]
            );

            console.log("DONATION ITEM ADDED");
        }

        // Final response
        return res.send({ status: "ok", data: "Item(s) are up for Donation" });

    } catch (err) {
        console.error(err);
        return res.send({ status: "error", data: "Something went wrong" });
    }
});

//Getting
app.get("/getDonations", async (req, res) => {
    const id = await getIdFromHeader(req)
    const pResult = await pool.query(
        `
            SELECT d.donation_id, p.name, d.amount, p.unitOfMeasure, p.photo, city, street, province, country, zipcode, fo.name AS fname, fo.email
            from DONATION d, PANTRY_FOOD p, LOCATION l, FOODIE fo
            WHERE d.foodie_id = fo.id
            AND d.location_id = l.id
            AND d.pantry_food_id = p.id
            AND fo.id != $1
        `, [id]
    )

    const fResult = await pool.query(
        `
            SELECT d.donation_id, f.name, d.amount, f.unitOfMeasure, f.photo, city, street, province, country, zipcode, fo.name AS fname, fo.email
            from DONATION d, FRIDGE_FOOD f, LOCATION l, FOODIE fo
            WHERE d.foodie_id = fo.id
            AND d.fridge_food_id = f.id
            AND d.location_id = l.id
            AND fo.id != $1
        `, [id]
    )

    const donation = [...pResult.rows, ...fResult.rows]
    res.send({ status: "ok", data: donation })
})

// GET donation requests for the logged-in user
app.get("/getMyDonationRequests", async (req, res) => {
    try {
        const requester_id = await getIdFromHeader(req);
        if (!requester_id) return res.json({ status: "error", data: "Unauthorized" });

        const result = await pool.query(`
            SELECT 
                dr.donation_id,
                dr.status,
                COALESCE(fr.name, pa.name) AS food_name,
                COALESCE(fr.photo, pa.photo) AS food_photo,
                d.amount,
                l.city,
                l.street,
                l.province,
                l.country,
                l.zipcode,
                l.pickupTime,
                donor.name AS donor_name,
                donor.email AS donor_email,
                donor.phone AS donor_phone
            FROM DONATION_REQUEST dr
            JOIN DONATION d ON dr.donation_id = d.donation_id
            LEFT JOIN FRIDGE_FOOD fr ON d.fridge_food_id = fr.id
            LEFT JOIN PANTRY_FOOD pa ON d.pantry_food_id = pa.id
            LEFT JOIN LOCATION l ON d.location_id = l.id
            LEFT JOIN FOODIE donor ON dr.donor_id = donor.id
            WHERE dr.requester_id = $1
        `, [requester_id]);

        result.rows.map(r => console.log(r))
        //const requests = result.rows.map(r => r.donation_id);
        res.json({ status: "ok", data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: "error", data: "Something went wrong" });
    }
});

// requesting THE DONATION
app.post("/requestDonation", async (req, res) => {
    try {
        const donation = req.body.donation;
        if (!donation || !donation.donation_id) {
            return res.status(400).json({ status: "error", data: "Donation not provided" });
        }

        // Get requester ID from JWT or session
        const requester_id = await getIdFromHeader(req); // Authenticated user's ID
        if (!requester_id) {
            return res.json({ status: "error", data: "Unauthorized" });
        }

        // Check if the donation exists
        const donationCheck = await pool.query(
            `SELECT * FROM DONATION WHERE donation_id = $1`,
            [donation.donation_id]
        );

        if (donationCheck.rowCount === 0) {
            return res.status(404).json({ status: "error", data: "Donation not found" });
        }

        const donationRow = donationCheck.rows[0];
        const donor_id = donationRow.foodie_id; // <-- assuming DONATION table has donor_id column

        // Check if the user already requested this donation
        const existingRequest = await pool.query(
            `SELECT * FROM DONATION_REQUEST WHERE donation_id = $1 AND requester_id = $2`,
            [donation.donation_id, requester_id]
        );

        if (existingRequest.rowCount > 0) {
            return res.status(400).json({ status: "error", data: "You have already requested this donation" });
        }

        // Insert request with donor_id
        await pool.query(
            `INSERT INTO DONATION_REQUEST(donation_id, requester_id, donor_id) VALUES($1, $2, $3)`,
            [donation.donation_id, requester_id, donor_id]
        );

        res.json({ status: "ok", data: `You successfully requested ${donation.name}` });
    } catch (error) {
        console.error("Error requesting donation:", error);
        res.status(500).json({ status: "error", data: "Something went wrong" });
    }
});

app.get("/getRequestsForMe", async (req, res) => {
    try {
        const donor_id = await getIdFromHeader(req);
        if (!donor_id) return res.json({ status: "error", data: "Unauthorized" });

        const result = await pool.query(`
        SELECT dr.request_id, dr.donation_id, dr.requester_id, dr.donor_id,
               f.name as requester_name, f.email as requester_email,
               d.amount, d.sourceTable,
               COALESCE(fr.name, pa.name) as food_name, COALESCE(fr.photo, pa.photo) as food_photo,
               dr.STATUS
        FROM DONATION_REQUEST dr
        JOIN FOODIE f ON dr.requester_id = f.id
        JOIN DONATION d ON dr.donation_id = d.donation_id
        LEFT JOIN FRIDGE_FOOD fr ON d.fridge_food_id = fr.id
        LEFT JOIN PANTRY_FOOD pa ON d.pantry_food_id = pa.id
        WHERE dr.donor_id = $1
      `, [donor_id]);

        res.json({ status: "ok", data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: "error", data: "Something went wrong" });
    }
});

app.post("/acceptRequest", async (req, res) => {
    try {
        const { request_id } = req.body;
        if (!request_id) return res.status(400).json({ status: "error", data: "Request ID missing" });

        const donor_id = await getIdFromHeader(req);
        if (!donor_id) return res.json({ status: "error", data: "Unauthorized" });

        // Get the request to verify it belongs to this donor
        const requestResult = await pool.query(
            `SELECT * FROM DONATION_REQUEST WHERE request_id = $1 AND donor_id = $2`,
            [request_id, donor_id]
        );

        if (requestResult.rowCount === 0) {
            return res.status(404).json({ status: "error", data: "Request not found or not yours" });
        }

        // Update the status in DONATION_REQUEST directly
        await pool.query(
            `UPDATE DONATION_REQUEST SET STATUS = 'Accepted' WHERE request_id = $1`,
            [request_id]
        );

        // Remove other requests for the same donation
        await pool.query(
            `DELETE FROM DONATION_REQUEST WHERE donation_id = $1 AND request_id != $2`,
            [requestResult.rows[0].donation_id, request_id]
        );

        res.json({ status: "ok", data: "Request accepted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: "error", data: "Something went wrong" });
    }
});

app.get("/getLatestLocation", async (req, res) => {
    const foodie_id = await getIdFromHeader(req)
    try {
        const result = await pool.query(
            `
          SELECT *
          FROM LOCATION l, FOODIE f
          WHERE l.foodie_id = f.id
          AND l.foodie_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `, [foodie_id]
        );
        if (result.rows.length <= 0) {
            return res.send({ status: "empty", data: null });
        }

        res.send({ status: "ok", data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send({ status: "error", data: "Server error" });
    }
});

app.post("/incrementDonatedItem", async (req, res) => {
    const { donor_id, requester_id } = req.body; // requester_id is the user who received the donation
    try {
        // --- Donor: increment donationsMade ---
        const donorResult = await pool.query(
            "SELECT * FROM DONATED_ITEMS WHERE donor_id = $1",
            [donor_id]
        );

        if (donorResult.rows.length === 0) {
            await pool.query(
                "INSERT INTO DONATED_ITEMS(donor_id, donationsMade, donationsReceived) VALUES($1, 1, 0)",
                [donor_id]
            );
        } else {
            await pool.query(
                "UPDATE DONATED_ITEMS SET donationsMade = donationsMade + 1 WHERE donor_id = $1",
                [donor_id]
            );
        }

        // --- Requester: increment donationsReceived ---
        const requesterResult = await pool.query(
            "SELECT * FROM DONATED_ITEMS WHERE donor_id = $1",
            [requester_id]
        );

        if (requesterResult.rows.length === 0) {
            await pool.query(
                "INSERT INTO DONATED_ITEMS(donor_id, donationsMade, donationsReceived) VALUES($1, 0, 1)",
                [requester_id]
            );
        } else {
            await pool.query(
                "UPDATE DONATED_ITEMS SET donationsReceived = donationsReceived + 1 WHERE donor_id = $1",
                [requester_id]
            );
        }

        res.json({ status: "ok" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: "error", message: err.message });
    }
});
