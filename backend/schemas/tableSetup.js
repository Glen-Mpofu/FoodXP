async function initialiseTables(pool) {
    //FOODIE table creation
    await pool.query(`
        CREATE TABLE IF NOT EXISTS FOODIE
        ( 
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            EMAIL VARCHAR(100) UNIQUE, 
            NAME VARCHAR(50) NOT NULL, 
            PASSWORD VARCHAR(100) NOT NULL, 
            PHONE VARCHAR(100)       
        )    
        `).then((res) => {
        console.log("Foodie Table Ready")

    }).catch((e) => {
        console.log("Error creating table" + e)
    })

    //PANTRY TABLE CREATION
    await pool.query(`
        CREATE TABLE IF NOT EXISTS PANTRY_FOOD
        (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(20) NOT NULL,
            amount DOUBLE PRECISION DEFAULT 1,
            expiryDate DATE,
            unitOfMeasure VARCHAR(10),
            estimatedShelfLife INT, 
            foodie_id UUID REFERENCES FOODIE(id) ON DELETE CASCADE,
            photo VARCHAR(150),
            public_id VARCHAR(100) NOT NULL
        );
    `).then((res) => {
        console.log("Pantry_Food Table Ready")
    }).catch(error => {
        console.error("Something went wrong when creating Pantry_Food table", error)
    });

    //FRIDGE FOOD TABLE
    await pool.query(`
        CREATE TABLE IF NOT EXISTS FRIDGE_FOOD
        (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(20) NOT NULL,
            amount DOUBLE PRECISION DEFAULT 1,
            unitOfMeasure VARCHAR(10),
            estimatedShelfLife INT, 
            expiryDate DATE,
            foodie_id UUID REFERENCES FOODIE(id) ON DELETE CASCADE,
            photo VARCHAR(150),
            public_id VARCHAR(100) NOT NULL,
            date_entered TIMESTAMPTZ DEFAULT NOW()
        );
    `).then((res) => {
        console.log("Fridge_Food Table Ready")
    }).catch(error => {
        console.error("Something went wrong when creating Pantry_Food table", error)
    });

    // DONATION TABLE CREATION
    await pool.query(`
        CREATE TABLE IF NOT EXISTS DONATION(
            donation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            foodie_id uuid REFERENCES FOODIE(id) ON DELETE CASCADE,
            fridge_food_id UUID REFERENCES FRIDGE_FOOD(id) ON DELETE CASCADE,
            pantry_food_id UUID REFERENCES PANTRY_FOOD(id) ON DELETE CASCADE,
            pickup_id UUID REFERENCES DONATION_PICKUP(id) ON DELETE CASCADE,
            QUANTITY INT,
            AMOUNT INT,
            sourceTable VARCHAR(10)
        )
    `).then((res) => {
        console.log("DONATION Table Ready")
    }).catch(error => {
        console.error("Something went wrong when creating DONATION table", error)
    });

    // DONATION_REQUEST TABLE CREATION
    await pool.query(`
        CREATE TABLE IF NOT EXISTS DONATION_REQUEST(
            request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            donation_id uuid REFERENCES DONATION(donation_id) ON DELETE CASCADE,
            requester_id uuid REFERENCES FOODIE(id) ON DELETE CASCADE,
            donor_id uuid REFERENCES FOODIE(id) ON DELETE CASCADE,
            STATUS VARCHAR(50),
            qr_token UUID DEFAULT gen_random_uuid(),
            collected_at TIMESTAMPTZ
        )
    `).then((res) => {
        console.log("DONATION_REQUESTS Table Ready")
    }).catch(error => {
        console.error("Something went wrong when creating DONATION_REQUESTS table", error)
    });

    // DONATION_PICKUP TABLE
    await pool.query(
        `
            CREATE TABLE IF NOT EXISTS DONATION_PICKUP(
                ID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                FOODIE_ID UUID REFERENCES FOODIE(id) ON DELETE CASCADE ,
                LATITUDE double precision, 
                LONGITUDE double precision,
                CITY VARCHAR(100),
                PROVINCE VARCHAR(100),
                ZIPCODE VARCHAR(100),
                COUNTRY VARCHAR(100),
                STREET VARCHAR(100), 
                pickUpTime VARCHAR(100),
                pickUpDate VARCHAR(100),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `
    ).then((res) => {
        console.log("DONATION_PICKUP Table Ready")
    }).catch(error => {
        console.error("Something went wrong when creating DONATION_PICKUP table", error)
    });

    /*// DONATED ITEMS
    await pool.query(`
        CREATE TABLE IF NOT EXISTS DONATED_ITEMS(
            donated_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            donation_id UUID REFERENCES DONATION(donation_id) ON DELETE CASCADE,
            donor_id UUID REFERENCES FOODIE(id),
            requester_id UUID REFERENCES FOODIE(id),
            completed_at TIMESTAMPTZ DEFAULT NOW()
        );    
    `).then((res) => {
        console.log("DONATED ITEMS Table Ready")
    }).catch(error => {
        console.error("Something went wrong when creating DONATED ITEMS table", error)
    });*/
    await pool.query(`
        CREATE TABLE IF NOT EXISTS DONATED_ITEMS(
            donor_id UUID REFERENCES FOODIE(id) ON DELETE CASCADE,
            donationsMade INT,
            donationsReceived INT
        );    
    `).then((res) => {
        console.log("DONATED ITEMS Table Ready")
    }).catch(error => {
        console.error("Something went wrong when creating DONATED ITEMS table", error)
    });

    // LOCATION
    await pool.query(
        `
            CREATE TABLE IF NOT EXISTS LOCATION(
                latitude double precision,
                longitude double precision,
                street VARCHAR(100),
                CITY VARCHAR(100),
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                foodie_id UUID REFERENCES FOODIE(id) ON DELETE CASCADE UNIQUE,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `
    ).then((res) => {
        console.log("Location Table Ready")
    }).catch(error => {
        console.error("Something went wrong when creating Location table", error)
    });

    // NOTIFICATIONS TOKEN
    await pool.query(
        `
        CREATE TABLE IF NOT EXISTS PUSH_TOKENS (
            foodie_id UUID REFERENCES FOODIE(id) ON DELETE CASCADE,
            token TEXT,
            is_valid BOOLEAN DEFAULT TRUE,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (foodie_id, token)
        );

        `
    ).then((res) => {
        console.log("PUSH_TOKENS Table Ready")
    }).catch(error => {
        console.error("Something went wrong when creating PUSH_TOKENS table", error)
    });
}

module.exports = { initialiseTables };