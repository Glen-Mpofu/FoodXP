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
    origin: true,
    credentials: true
}));


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
const { default: reverseGeocode } = require("./reverseGeocode");
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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

// METHOD FOR SENDING
async function sendNotification(token, message) {
    try {
        await axios.post("https://exp.host/--/api/v2/push/send", {
            to: token,
            sound: "default",
            title: "Food Expiry Alert",
            body: message,
        });
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

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // distance in meters
}

//register
app.post("/register", async (req, res) => {
    try {
        const { email, name, password, phone } = req.body.foodieData;
        let expoPushToken = req.body.expoPushToken;

        if (!expoPushToken || expoPushToken === "" || expoPushToken === "null") {
            expoPushToken = "None-" + email;
        }
        //console.log("Register body:", req.body);

        // Encrypt password
        const encryptedPassword = await bcrypt.hash(password, 10);

        // Check if user exists
        const existing = await pool.query(
            "SELECT EMAIL FROM FOODIE WHERE EMAIL = $1",
            [email]
        );

        if (existing.rowCount > 0) {
            return res.send({
                status: "foodie exists",
                data: "Foodie Already Has an Account",
            });
        }

        // Insert new foodie and get ID
        const newFoodie = await pool.query(
            `
            INSERT INTO FOODIE(EMAIL, NAME, PASSWORD, PHONE)
            VALUES($1, $2, $3, $4)
            RETURNING id
            `,
            [email, name, encryptedPassword, phone]
        );

        const foodieId = newFoodie.rows[0].id;
        //console.log("Foodie account created with ID:", foodieId);

        // Insert the Expo push token
        await pool.query(
            `
            INSERT INTO PUSH_TOKENS(foodie_id, token)
            VALUES($1, $2)
            ON CONFLICT (foodie_id, token) DO NOTHING
            `,
            [foodieId, expoPushToken]
        );

        return res.send({
            status: "ok",
            data: "Foodie Registered Successfully",
        });
    } catch (err) {
        console.error("Error in /register:", err);
        res.send({
            status: "error",
            data: "Something went wrong",
        });
    }
});

// LOGIN
app.post("/login", async (req, res) => {
    const { email, password, expoPushToken } = req.body;

    // Get user + push token
    const storedFoodie = await pool.query(`
        SELECT f.email, f.password, p.token AS push_token, f.id
        FROM FOODIE f
        LEFT JOIN push_tokens p 
            ON f.id = p.foodie_id
        WHERE f.email = $1
    `, [email]);

    // No account?
    if (storedFoodie.rowCount === 0) {
        return res.send({ status: "no account", data: "Foodie has no account yet" });
    }

    const foodie = storedFoodie.rows[0];

    // Check password
    const match = await bcrypt.compare(password, foodie.password);
    if (!match) {
        return res.send({ status: "wrong password", data: "Wrong Password. Try another" });
    }

    // Reset push token if changed
    if (expoPushToken && expoPushToken !== foodie.push_token) {
        await pool.query(`
            UPDATE push_tokens
            SET token = $1
            WHERE foodie_id = $2
        `, [expoPushToken, foodie.id]);
    }

    // Generate JWT
    const token = jwt.sign(
        { email: foodie.email },
        "SECRET_KEY",  // replace later with process.env.JWT_SECRET
        { expiresIn: "7d" }
    );

    // Create session
    req.session.user = { email: foodie.email };

    return res.send({
        status: "ok",
        data: "Login Successful",
        token
    });
});

//logout 
app.post("/logout", async (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send({ status: "error", data: "Logout failed" });
        res.clearCookie("connect.sid");
        return res.send({ status: "ok", data: "Logged out successfully" });
    })
})
/*
// Classifying food
app.post("/classifyfood", async (req, res) => {
    try {
        const { photo } = req.body;
        if (!photo) return res.json({ error: "No image provided" });
        //console.log("Photo URL:", photo)
        //sending the photo to flask
        const response = await axios.post("https://foodxp-production.up.railway.app/predict", { photo });

        console.log("Python result: ", response.data)
        res.json(response.data)

    } catch (error) {
        console.error("Classification error:", error.message);
        if (error.response) {
            // Flask sent an error response
            res.status(error.response.status).json(error.response.data);
        } else {
            res.json({ error: "Classification failed" });
        }
    }
});*/

app.post("/api/classify", async (req, res) => {
    const { image } = req.body;
    const prompt = `
      You are a food recognition AI. Analyze the image and respond ONLY with valid JSON.
        Do NOT include commentary, explanations, or brand names.

        Allowed units of measure are limited to this exact list
        ["quantity", "piece", "serving", "portion", "slice", "pack", "can", "bottle", "bag", "jar", 
        "g", "kg", "mg", "oz", "lb", "ml", "L", "tsp", "tbsp", "cup", "pint", "quart", "gallon", 
        "pinch", "dash"]

        You MUST choose exactly one unit from this list.

        Identify the food as a generic item only:
        "apple", "rice", "bread", "tomato"
        No brand names (e.g., “KFC chicken”, “Coca-Cola”, “Kellogg’s cereal”)

        You must also return an estimated shelf life for the fresh produce foods and if it's not a fresh
        produce return a null in the estimated shelf life e.g. ...{"name": "apple","amount": 1,"unitOfMeasure": "quantity","storageLocation": "fridge",
        "estimatedShelfLife": "3"} or {"name": "coffee","amount": 100,"unitOfMeasure": "g","storageLocation": "pantry",
        "estimatedShelfLife": null}

        The estimatedShelfLife should only be in days and if it happens that the item has a shelf life of weeks or months, that value should be converted to 
        days.

        Return JSON using this exact structure:

        {
            "name": "string",
            "amount": number,
            "unitOfMeasure": "string",
            "storageLocation": "fridge | pantry",
            "estimatedShelfLife": number
        }

        Rules:
        - Always return a single JSON object.
        - Never mention any brand name or restaurant.
        - If multiple items appear, identify the main food item.
        - If the exact quantity is unknown:
            - Estimate using the best fitting allowed unit.
            - Examples: { "amount": 2, "unitOfMeasure": "L" } or { "amount": 500, "unitOfMeasure": "g" }
        - If no reasonable unit can be determined, fall back to:
            { "amount": 1, "unitOfMeasure": "quantity" }
        - "name" must remain simple and generic.
        
      `
        ;

    const groqResponse = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: { url: image }
                        }
                    ]
                }
            ]
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            }
        }
    );

    const rawWithQuotes = groqResponse.data.choices[0].message.content

    const cleanedUp = rawWithQuotes
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim()
    let finalJson
    try {
        finalJson = JSON.parse(cleanedUp)
    } catch (error) {
        console.error("Failed to parse the message returned by the AI model: " + error)
    }
    console.log(finalJson)
    res.json(finalJson);
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
            //console.log(foodie)
            res.send({ status: "ok", data: foodie })
            //console.log("Foodie", foodie)
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
    //console.log(req.body)
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
            photo: foodData.photo,
            unitOfMeasure: foodData.unitOfMeasure,
            public_id: foodData.public_id,
            estimatedShelfLife: foodData.estimatedShelfLife,
            expiryDate: foodData.expiryDate
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
        INSERT INTO PANTRY_FOOD (NAME, AMOUNT, expiryDate, FOODIE_ID, PHOTO, PUBLIC_ID, unitOfMeasure, estimatedShelfLife)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `,
            [pantryFood.name, pantryFood.amount, pantryFood.expiryDate, foodie.data.id, pantryFood.photo, pantryFood.public_id, pantryFood.unitOfMeasure, pantryFood.estimatedShelfLife]
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
            SET name = $1, amount = $2, expiryDate = $3
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

        const aboutToExpireItems = [];

        const checkFoodList = (foodList, category) => {
            for (const item of foodList.data) {
                const expiryDate = new Date(item.expirydate);
                const daysLeft = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

                if (daysLeft <= 2) {
                    let messageItem;

                    if (daysLeft === 0) {
                        messageItem = `${item.name} in your ${category} will expire today`;
                        console.log(messageItem)
                    } else if (daysLeft < 0) {
                        messageItem = `${item.name} in your ${category} expired ${Math.abs(daysLeft)} day(s) ago`;
                        console.log(messageItem)
                    } else {
                        messageItem = `${item.name} in your ${category} will expire in ${daysLeft} day(s)`;
                        console.log(messageItem)
                    }

                    aboutToExpireItems.push(messageItem);
                }
            }
        };

        // Check both pantry & fridge foods for this foodie
        checkFoodList(pantryFood, "Pantry");
        checkFoodList(fridgeFood, "Fridge");

        if (aboutToExpireItems.length > 0) {
            let finalMessage;
            if (aboutToExpireItems.length > 2) {
                finalMessage = `You have ${aboutToExpireItems.length} items about to expire soon. Check your pantry and fridge!`;
            } else {
                // Join individual item messages
                finalMessage = aboutToExpireItems.join(". ") + ".";
            }

            console.log(`Sending notification to ${foodie.email}:`, finalMessage);

            const foodieTokens = await pool.query(
                `SELECT token FROM PUSH_TOKENS WHERE foodie_id = $1`,
                [foodie.id]
            );

            await Promise.all(
                foodieTokens.rows.map(row => sendNotification(row.token, finalMessage))
            );
        }
    }
};

/*
* * * * *

0 10,13,18 * * *
*/
cron.schedule("0 11,14,19 * * *", async () => {
    console.log("🔔 Checking expiring foods...");
    await checkExpiryFoods();
});

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
            public_id: foodData.public_id,
            estimatedShelfLife: foodData.estimatedShelfLife,
            expiryDate: foodData.expiryDate
        }
        if (!fridgeFood.photo) {
            return res.send({ status: "error", data: "No photo sent" })
        }

        const email = getFoodieEmailFromToken(foodData.token)

        const foodie = await getFoodie(email)

        await pool.query(
            `
                INSERT INTO FRIDGE_FOOD (NAME, AMOUNT, estimatedShelfLife, FOODIE_ID, PHOTO, PUBLIC_ID, unitOfMeasure, expiryDate)
                VALUES($1, $2, $3, $4, $5, $6, $7, $8)
            `,
            [fridgeFood.name, fridgeFood.amount, fridgeFood.estimatedShelfLife, foodie.data.id, fridgeFood.photo, fridgeFood.public_id, fridgeFood.unitOfMeasure, fridgeFood.expiryDate]
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

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

app.post("/ocrExpiry", async (req, res) => {
    try {
        const image = req.body.image;

        if (!image) {
            return res.json({ error: "No image provided" });
        }
        const prompt = `
            You are an expiry-date extractor. Extract ONLY the expiry / best-before / "use by" date from the supplied text and OUTPUT exactly one value and nothing else.

            OUTPUT RULES:
            - Return exactly ONE token: either a date in ISO format YYYY-MM-DD or the literal null.
            - No extra words, explanation, punctuation, or whitespace.

            LABEL PRIORITY:
            - Only treat dates as expiry if they appear with explicit labels, including:
            EXP, EXP:, Expires, Expires:, Expiry, Best Before, Best-Before, BestBefore, BB, Use By, Use-By, UseBy.
            - If ANY labeled expiry/best-before/use-by date exists, ignore all other dates.

            DATE FORMATS YOU MUST SUPPORT:
            - Full-year formats: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD, YYYYMMDD.
            - Short-year formats: DD-MM-YY, MM-DD-YY, DD/MM/YY, MM/DD/YY, DD.MM.YY, DDMMYY, MMDDYY.
            - Textual months: 04 SEP 2017, 4 Sep 17, Sep 04 2017.
            - Allow separators -, /, ., spaces, or none.

            DISAMBIGUATION RULES (CRITICAL):
            1. Labeled dates ALWAYS override unlabeled ones.
            2. For 6-digit numbers (NNNNNN):
            - DEFAULT: interpret as DDMMYY.
            - Only if DDMMYY is invalid (day > 31 OR month > 12), then try MMDDYY.
            3. For 8-digit numbers (YYYYMMDD): parse as YYYY-MM-DD.
            4. Two-digit years:
            - If YY <= 25 → 20YY
            - If YY > 25 → 19YY
            5. If multiple labeled dates exist, output the LATEST valid one.
            6. If no labeled dates exist, choose the latest valid date among all candidates.
            7. If no valid expiry-style date exists, output null.

            NORMALIZATION:
            - Output ONLY the final date in strict ISO format: YYYY-MM-DD.

            Remember: Your final response MUST be exactly one token: either YYYY-MM-DD or null.

        `

        const payload = {
            model: MODEL,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        },
                        {
                            type: "image_url",
                            image_url: { url: `data:image/jpeg;base64,${image}` }
                        }
                    ]
                }
            ],
            temperature: 0,
            max_tokens: 20
        };

        const response = await axios.post(GROQ_URL, payload, {
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        const result = response.data.choices[0].message.content.trim();
        console.log(result)
        let finalDate = null;

        if (result && result !== "null") {
            const parsed = new Date(result);

            // Ensure it's a valid date
            if (!isNaN(parsed.getTime())) {
                finalDate = parsed;
            }
        }

        return res.json({ expiryDate: finalDate });
    } catch (err) {
        console.error("OCR Expiry Error:", err.response?.data || err.message);
        return res.json({ error: "Failed to process image" });
    }
});

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
            SET name = $1, amount = $2, expiryDate = $3
            WHERE id = $4;
        `, [newFood.name, newFood.amount, newFood.expiryDate, newFood.id]
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

///getting recipes
app.post("/getAiRecipe", async (req, res) => {
    //console.log(req.body)
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
            return res.json({ error: "Invalid AI JSON output", raw: aiRaw });
        }
        //console.log(aiRecipes)
        res.json({ recipes: aiRecipes });

    } catch (error) {
        console.error("AI Recipe Error:", error.response?.data || error.message);
        res.json({ error: "Failed to generate recipes" });
    }
});

app.get("/getSuggestedRecipes", async (req, res) => {
    try {
        const id = await getIdFromHeader(req);
        if (!id) return res.status(401).json({ error: "Unauthorized" });

        // Fetch fridge & pantry items from database
        const fridgeItems = (await getFridgeFood(id)).data
        const pantryItems = (await getPantryFood(id)).data

        const allItems = [...fridgeItems, ...pantryItems];

        if (allItems.length === 0) {
            return res.json({ error: "No ingredients found in fridge or pantry." });
        }

        // Format ingredients for AI
        const formattedIngredients = allItems
            .map(item => `${item.name} (${item.amount} ${item.unitofmeasure || ""})`)
            .join(", ");

        const prompt = `
            Return ONLY valid JSON. No explanations. No formatting. No markdown.
                
                You are a creative and budget-friendly chef AI. Create exactly 3 recipes using ONLY these ingredients:
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
                - Return only the JSON array with exactly 3 recipe objects.
                
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

        let aiRecipes = [];
        try {
            aiRecipes = JSON.parse(aiRaw);
        } catch (e) {
            return res.json({ error: "Invalid AI JSON output", raw: aiRaw });
        }

        return res.json({ recipes: aiRecipes });

    } catch (error) {
        console.error("Suggested Recipes Error:", error.response?.data || error.message);
        res.json({ error: "Failed to generate suggested recipes" });
    }
});

cron.schedule("* * * * *", async () => {
    await sendTryRecipes();
});

async function sendTryRecipes() {
    try {
        // 1. Get users who have fridge or pantry items
        const usersWithItems = await pool.query(`
            SELECT DISTINCT f.id, pt.token
            FROM foodie f
            JOIN push_tokens pt ON pt.foodie_id = f.id
            LEFT JOIN pantry_food pf ON pf.foodie_id = f.id
            LEFT JOIN fridge_food ff ON ff.foodie_id = f.id
            WHERE (pf.id IS NOT NULL OR ff.id IS NOT NULL)
              AND pt.is_valid = TRUE
        `);

        if (!usersWithItems.rows.length) return;

        for (let user of usersWithItems.rows) {
            // 2. Optionally generate suggested recipes for the user
            // Here you can call your AI endpoint:
            // const suggested = await axios.get(`${API_BASE_URL}/getSuggestedRecipes`, { headers: { Authorization: `Bearer ${userToken}` } });

            // 3. Send push notification
            await sendNotification(user.token, "We found some suggested recipes based on your pantry & fridge items!");
        }

        console.log("Try recipes notifications sent successfully!");
    } catch (error) {
        console.error("Error sending try recipes notifications:", error);
    }
}


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

cron.schedule("* * * * *", async () => {
    try {
        await sendUpcomingDonationNotifications();
        console.log("Sending donation notification")
    } catch (err) {
        console.error("Error sending scheduled notifications:", err);
    }
});

async function sendUpcomingDonationNotifications() {
    const now = new Date();

    // Get all upcoming pickups within the next 24 hours
    const result = await pool.query(`
        SELECT dp.*, d.foodie_id AS donor_id, dr.requester_id
FROM DONATION_PICKUP dp
JOIN DONATION d ON d.pickup_id = dp.id
JOIN DONATION_REQUEST dr 
    ON dr.donation_id = d.donation_id 
    AND dr.status = 'Accepted'
WHERE 
(
    dp.pickUpDate::DATE 
    + (
        -- Convert invalid AM/PM times into valid 24h time
        CASE 
            WHEN RIGHT(TRIM(dp.pickUpTime), 2) = 'PM' 
                THEN (LEFT(dp.pickUpTime, 5))::time + INTERVAL '12 hours'
            WHEN RIGHT(TRIM(dp.pickUpTime), 2) = 'AM' 
                THEN (LEFT(dp.pickUpTime, 5))::time
        END
    )
) >= NOW()
AND 
(
    dp.pickUpDate::DATE 
    + (
        CASE 
            WHEN RIGHT(TRIM(dp.pickUpTime), 2) = 'PM' 
                THEN (LEFT(dp.pickUpTime, 5))::time + INTERVAL '12 hours'
            WHEN RIGHT(TRIM(dp.pickUpTime), 2) = 'AM' 
                THEN (LEFT(dp.pickUpTime, 5))::time
        END
    )
) <= NOW() + INTERVAL '24 hours';
    `);

    const pickups = result.rows;

    for (const pickup of pickups) {
        const pickupDateTime = new Date(`${pickup.pickUpDate}T${pickup.pickUpTime}`);

        const offsets = [
            { label: "24 hours before", minutes: 24 * 60 },
            { label: "1 hour before", minutes: 60 },
            { label: "now", minutes: 0 }
        ];

        for (const offset of offsets) {
            const notifTime = new Date(pickupDateTime.getTime() - offset.minutes * 60 * 1000);
            const diff = pickupDateTime - now;

            // Only send notifications within 1 minute window
            if (Math.abs(notifTime - now) <= 60000) {
                const message = `Donation pickup for ${pickup.street}, ${pickup.city} is ${offset.label}!`;

                const donorTokens = await pool.query(
                    "SELECT token FROM PUSH_TOKENS WHERE foodie_id = $1 AND is_valid = TRUE",
                    [pickup.donor_id]
                );
                for (const row of donorTokens.rows) {
                    await sendNotification(row.token, `Donor Alert: ${message}`);
                }

                const requesterTokens = await pool.query(
                    "SELECT token FROM PUSH_TOKENS WHERE foodie_id = $1 AND is_valid = TRUE",
                    [pickup.requester_id]
                );
                for (const row of requesterTokens.rows) {
                    await sendNotification(row.token, `Requester Alert: ${message}`);
                }
            }
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
        //console.log(mealDetails)
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
        const pickUpDate = req.body.date
        const prevLoc = req.body.pickup_id;
        //console.log(req.body)

        let pickup_id;
        const dateObj = new Date(pickupTime);
        let hours = dateObj.getHours();
        let minutes = String(dateObj.getMinutes()).padStart(2, "0");

        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;  // convert 0 -> 12

        const finalTime = `${hours}:${minutes} ${ampm}`;
        //console.log(finalTime)

        const finalDate = pickUpDate.substring(0, 10)
        //console.log(finalDate)

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
                    INSERT INTO DONATION_PICKUP(latitude, longitude, city, province, zipcode, country, street, foodie_id, pickupTime, pickUpDate)
                    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
                    finalTime,
                    finalDate
                ]
            );

            console.log("DONATION_PICKUP ADDED");
            pickup_id = r.rows[0].id;
        } else {
            pickup_id = prevLoc;
        }

        // Insert each donation record
        for (const donation of donations) {
            const isPantry = donation.from === "pantry";

            await pool.query(
                `
                INSERT INTO DONATION(
                    foodie_id,
                    ${isPantry ? "pantry_food_id" : "fridge_food_id"},
                    pickup_id,
                    amount,
                    sourceTable
                )
                VALUES($1, $2, $3, $4, $5)
                `,
                [
                    donation.foodie_id,
                    donation.id,
                    pickup_id,
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

app.get("/getStats", async (req, res) => {
    const id = await getIdFromHeader(req)
    const stats = await pool.query(`
        SELECT donationsMade, donationsReceived
        from DONATED_ITEMS i, FOODIE f 
        where i.donor_id = f.id
        AND i.donor_id = $1
        GROUP BY donationsMade, donationsReceived
    `, [id])
    console.log(stats.rows[0])
    res.send({ status: "ok", data: stats.rows[0] })
})

//Getting
app.get("/getDonations", async (req, res) => {
    try {
        const id = await getIdFromHeader(req);

        // Get user's location
        const lResult = await pool.query(`
            SELECT latitude::float AS latitude, longitude::float AS longitude
            FROM LOCATION
            WHERE foodie_id = $1
        `, [id]);

        if (!lResult.rows[0]) {
            return res.status(400).send({ status: "error", message: "User location not found" });
        }

        const userLat = lResult.rows[0].latitude;
        const userLon = lResult.rows[0].longitude;
        const radiusKm = 10; // 5 km

        // Pantry donations within proximity and not accepted
        const pResult = await pool.query(`
    SELECT d.donation_id, p.name, d.amount, p.unitOfMeasure, p.photo,
           l.city, l.street, l.province, l.country, l.zipcode, fo.name AS fname, fo.email,
           (6371 * acos(
                cos(radians($1)) *
                cos(radians(l.latitude)) *
                cos(radians(l.longitude) - radians($2)) +
                sin(radians($1)) *
                sin(radians(l.latitude))
           )) AS distance_km
    FROM DONATION d
    JOIN PANTRY_FOOD p ON d.pantry_food_id = p.id
    JOIN DONATION_PICKUP l ON d.pickup_id = l.id
    JOIN FOODIE fo ON d.foodie_id = fo.id
    LEFT JOIN DONATION_REQUEST dr ON d.donation_id = dr.donation_id AND dr.status = 'Accepted'
    WHERE fo.id != $3
      AND dr.request_id IS NULL
      AND (6371 * acos(
                cos(radians($1)) *
                cos(radians(l.latitude)) *
                cos(radians(l.longitude) - radians($2)) +
                sin(radians($1)) *
                sin(radians(l.latitude))
           )) <= $4
`, [userLat, userLon, id, radiusKm]);

        // Fridge donations within proximity and not accepted
        const fResult = await pool.query(`
    SELECT d.donation_id, f.name, d.amount, f.unitOfMeasure, f.photo,
           l.city, l.street, l.province, l.country, l.zipcode, fo.name AS fname, fo.email,
           (6371 * acos(
                cos(radians($1)) *
                cos(radians(l.latitude)) *
                cos(radians(l.longitude) - radians($2)) +
                sin(radians($1)) *
                sin(radians(l.latitude))
           )) AS distance_km
    FROM DONATION d
    JOIN FRIDGE_FOOD f ON d.fridge_food_id = f.id
    JOIN DONATION_PICKUP l ON d.pickup_id = l.id
    JOIN FOODIE fo ON d.foodie_id = fo.id
    LEFT JOIN DONATION_REQUEST dr ON d.donation_id = dr.donation_id AND dr.status = 'Accepted'
    WHERE fo.id != $3
      AND dr.request_id IS NULL
      AND (6371 * acos(
                cos(radians($1)) *
                cos(radians(l.latitude)) *
                cos(radians(l.longitude) - radians($2)) +
                sin(radians($1)) *
                sin(radians(l.latitude))
           )) <= $4
`, [userLat, userLon, id, radiusKm]);

        const donations = [...pResult.rows, ...fResult.rows];

        res.send({ status: "ok", data: donations });
    } catch (err) {
        console.error("Error fetching donations:", err);
        res.status(500).send({ status: "error", message: "Server error" });
    }
});

//saving the user's location
app.post("/userLocation", async (req, res) => {
    try {
        const { latitude, longitude } = req.body.location;
        const userId = await getIdFromHeader(req);

        // Get reverse geocoded info
        const geoResult = await reverseGeocode({ latitude, longitude }, GOOGLE_MAPS_API_KEY);
        if (!geoResult) {
            console.warn("Reverse geocoding failed or returned null");
        } else {
            console.log("User is around:", geoResult.formattedAddress);
        }

        const street = geoResult?.street || null;
        const city = geoResult?.city || null;

        // Fetch existing location
        const result = await pool.query(
            "SELECT latitude, longitude FROM LOCATION WHERE foodie_id = $1",
            [userId]
        );

        let shouldUpdate = true;

        if (result.rows.length > 0) {
            const oldLat = parseFloat(result.rows[0].latitude);
            const oldLon = parseFloat(result.rows[0].longitude);

            const distance = getDistanceFromLatLonInMeters(oldLat, oldLon, latitude, longitude);
            console.log("Distance from previous location (meters):", distance);

            // Only update if moved more than 50 meters
            shouldUpdate = distance > 50;
        }

        if (shouldUpdate) {
            await pool.query(
                `INSERT INTO LOCATION (foodie_id, latitude, longitude, street, city, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())
                 ON CONFLICT (foodie_id)
                 DO UPDATE SET latitude = $2, longitude = $3, street = $4, city = $5, updated_at = NOW()`,
                [userId, latitude, longitude, street, city]
            );
            console.log("User location updated");
        } else {
            console.log("Location change too small, no update");
        }

        res.send({ status: "ok", data: "Location processed" });
    } catch (err) {
        console.error(err);
        res.status(500).send({ status: "error", data: "Something went wrong" });
    }
});

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
                p.city,
                p.street,
                p.province,
                p.country,
                p.zipcode,
                p.pickupTime,
                p.pickUpDate,
                donor.name AS donor_name,
                donor.email AS donor_email,
                donor.phone AS donor_phone
            FROM DONATION_REQUEST dr
            JOIN DONATION d ON dr.donation_id = d.donation_id
            LEFT JOIN FRIDGE_FOOD fr ON d.fridge_food_id = fr.id
            LEFT JOIN PANTRY_FOOD pa ON d.pantry_food_id = pa.id
            LEFT JOIN DONATION_PICKUP p ON d.pickup_id = p.id
            LEFT JOIN FOODIE donor ON dr.donor_id = donor.id
            WHERE dr.requester_id = $1
        `, [requester_id]);

        //result.rows.map(r => console.log(r))
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

        const requester_id = await getIdFromHeader(req);
        if (!requester_id) {
            return res.status(401).json({ status: "error", data: "Unauthorized" });
        }

        const donationCheck = await pool.query(
            `SELECT * FROM DONATION WHERE donation_id = $1`,
            [donation.donation_id]
        );

        if (donationCheck.rowCount === 0) {
            return res.status(404).json({ status: "error", data: "Donation not found" });
        }

        const donationRow = donationCheck.rows[0];
        const donor_id = donationRow.foodie_id; // donor of the donation

        const existingRequest = await pool.query(
            `SELECT * FROM DONATION_REQUEST WHERE donation_id = $1 AND requester_id = $2`,
            [donation.donation_id, requester_id]
        );

        if (existingRequest.rowCount > 0) {
            return res.status(400).json({ status: "error", data: "You have already requested this donation" });
        }

        // Insert the donation request
        await pool.query(
            `INSERT INTO DONATION_REQUEST(donation_id, requester_id, donor_id) VALUES($1, $2, $3)`,
            [donation.donation_id, requester_id, donor_id]
        );

        // 🔔 Fetch donor push tokens
        const donorTokensResult = await pool.query(
            `SELECT token FROM PUSH_TOKENS WHERE foodie_id = $1`,
            [donor_id]
        );

        const donorTokens = donorTokensResult.rows;
        console.log(donationRow)
        // Send notification to each token
        const message = `Someone requested your donation.`;
        for (const row of donorTokens) {
            await sendNotification(row.token, message);
        }

        res.json({ status: "ok", data: `You successfully requested ${donationRow.name}` });
    } catch (error) {
        console.error("Error requesting donation:", error);
        res.status(500).json({ status: "error", data: "Something went wrong" });
    }
});

// DELETING THE REJECTED REQUEST
app.post("/rejectRequest", async (req, res) => {
    const request_id = req.body.request_id
    const requester_id = req.body.requester_id

    console.log(req.body)

    const result = await pool.query(`
        DELETE 
        FROM DONATION_REQUEST
        WHERE request_id = $1    
    `, [request_id])

    const donorTokensResult = await pool.query(
        `SELECT token FROM PUSH_TOKENS WHERE foodie_id = $1`,
        [requester_id]
    );

    const donorTokens = donorTokensResult.rows;

    // Send notification to each token
    const message = ` Your request for a donation was rejected.`;
    for (const row of donorTokens) {
        await sendNotification(row.token, message);
    }

    res.send({ status: "ok", data: "Request Rejected" })
})

app.get("/getRequestsForMe", async (req, res) => {
    try {
        const donor_id = await getIdFromHeader(req);
        if (!donor_id) return res.json({ status: "error", data: "Unauthorized" });

        const result = await pool.query(`
            SELECT 
                dr.request_id, 
                dr.donation_id, 
                dr.requester_id, 
                dr.donor_id,
          
                -- Requester info
                f.name AS requester_name, 
                f.email AS requester_email,
                f.phone AS requester_phone,

                -- Donation table IDs
                d.fridge_food_id,
                d.pantry_food_id,
                COALESCE(d.fridge_food_id, d.pantry_food_id) AS food_id,
          
                -- Donation info
                d.amount, 
                d.quantity,
                d.sourceTable,
          
                -- Pantry and Fridge shared fields
                COALESCE(fr.name, pa.name) AS food_name,
                COALESCE(fr.photo, pa.photo) AS food_photo,
                COALESCE(fr.public_id, pa.public_id) AS photo_public_id,
                COALESCE(fr.amount, pa.amount) AS food_amount,
                COALESCE(fr.unitOfMeasure, pa.unitOfMeasure) AS unit_of_measure,
          
                -- Pantry-only fields
                pa.expirydate AS pantry_expiry_date,
          
                -- Fridge-only fields
                fr.estimatedshelflife AS estimatedshelflife,
          
                -- Extra data
                fr.foodie_id AS fridge_owner_id,
                pa.foodie_id AS pantry_owner_id,
          
                -- Donation pickup info
                p.street AS pickup_street,
                p.city AS pickup_city,
                p.province AS pickup_province,
                p.zipcode AS pickup_zipcode,
                p.country AS pickup_country,
                p.latitude AS pickup_latitude,
                p.longitude AS pickup_longitude,
                p.pickUpDate AS pickup_date,
                p.pickUpTime AS pickup_time,
          
                dr.status
          
            FROM DONATION_REQUEST dr
            JOIN FOODIE f ON dr.requester_id = f.id
            JOIN DONATION d ON dr.donation_id = d.donation_id
            LEFT JOIN FRIDGE_FOOD fr ON d.fridge_food_id = fr.id
            LEFT JOIN PANTRY_FOOD pa ON d.pantry_food_id = pa.id
            LEFT JOIN DONATION_PICKUP p ON d.pickup_id = p.id
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
        const { request_id, requester_id } = req.body;
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
        const donorTokensResult = await pool.query(
            `SELECT token FROM PUSH_TOKENS WHERE foodie_id = $1`,
            [requester_id]
        );

        const donorTokens = donorTokensResult.rows;

        // Send notification to each token
        const message = ` Your request for a donation was accepted.`;
        for (const row of donorTokens) {
            await sendNotification(row.token, message);
        }

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
          SELECT p.id, street, city, province, zipcode, country
          FROM DONATION_PICKUP p, FOODIE f
          WHERE p.foodie_id = f.id
          AND p.foodie_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `, [foodie_id]
        );
        if (result.rows.length <= 0) {
            return res.send({ status: "error", data: null });
        }

        res.send({ status: "ok", data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send({ status: "error", data: "Server error" });
    }
});

app.post("/finaliseDonation", async (req, res) => {
    const { donor_id, requester_id, donation_id, donation } = req.body; // requester_id is the user who received the donation
    console.log(donation)

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

        // REMOVING THE DONATION REQUEST
        await pool.query(
            `   
                DELETE FROM DONATION_REQUEST
                WHERE donation_id = $1
            `, [donation_id]
        ).then((res) => {
            if (res.rowCount >= 1) {
                console.log("Donation Request deleted")
            } else {
                console.error("Failed to delete donation request")
            }
        })


        // UPDATING THE FOOD QUANTITY AND CREATING A NEW FOOD ENTRY WITH THE DONATED AMOUNT
        if (donation.sourcetable === 'pantry') {
            await pool.query(
                `
                    INSERT INTO pantry_food(NAME, AMOUNT, EXPIRY_DATE, FOODIE_ID, UNITOFMEASURE, PHOTO, PUBLIC_ID)
                    VALUES($1, $2, $3, $4, $5, $6, $7)
                `, [donation.food_name, donation.amount, donation.pantry_expiry_date, requester_id, donation.unit_of_measure, donation.food_photo, donation.photo_public_id]
            ).then(async (res) => {
                if (res.rowCount >= 1) {
                    console.log("New Pantry Food Added")

                    const selR = await pool.query(`
                        select amount from pantry_food where id = $1    
                    `, [donation.pantry_food_id])

                    const prevAmount = selR.rows[0].amount
                    const newAmount = prevAmount - donation.amount
                    await pool.query(
                        `
                            UPDATE PANTRY_FOOD 
                            SET AMOUNT = $1
                            WHERE id = $2
                        `, [newAmount, donation.pantry_food_id]
                    ).then((res) => {
                        if (res.rowCount >= 1) {
                            console.log("New Pantry Food Updated")
                        } else {
                            console.error("Failed to update New pantry Food")
                        }
                    })
                } else {
                    console.error("Failed to add New Pantry Food")
                }
            })
        } else {
            await pool.query(
                `
                    INSERT INTO fridge_food(NAME, AMOUNT, UNITOFMEASURE, estimatedshelflife, FOODIE_ID, PHOTO, PUBLIC_ID)
                    VALUES($1, $2, $3, $4, $5, $6, $7)
                `, [donation.food_name, donation.amount, donation.unit_of_measure, donation.estimatedshelflife, requester_id, donation.food_photo, donation.photo_public_id]
            ).then(async (res) => {
                if (res.rowCount >= 1) {
                    console.log("New Fridge Food Added")

                    const selR = await pool.query(`
                        select amount from fridge_food where id = $1    
                    `, [donation.fridge_food_id])

                    const prevAmount = selR.rows[0].amount
                    const newAmount = prevAmount - donation.amount
                    await pool.query(
                        `
                            UPDATE FRIDGE_FOOD 
                            SET AMOUNT = $1
                            WHERE id = $2
                        `, [newAmount, donation.fridge_food_id]
                    ).then((res) => {
                        if (res.rowCount >= 1) {
                            console.log("New FRIDGE Food Updated")
                        } else {
                            console.error("Failed to update New fridge Food")
                        }
                    })
                } else {
                    console.error("Failed to add New Fridge Food")
                }
            })
        }

        //REMOVING THE DONATION FROM THE DONATION TABLE
        await pool.query(`
            DELETE FROM DONATION WHERE DONATION_ID = $1    
        `, [donation.donation_id]).then((res) => {
            if (res.rowCount >= 1) {
                console.log("Donation Deleted")
            } else {
                console.error("Failed to Donation")
            }
        })

        res.json({ status: "ok" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: "error", message: err.message });
    }
});
