async function initialiseTables(pool) {
    //FOODIE table creation
    await pool.query(`
        CREATE TABLE IF NOT EXISTS FOODIE
        ( 
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            EMAIL VARCHAR(100) UNIQUE, 
            NAME VARCHAR(50) NOT NULL, 
            PASSWORD VARCHAR(100) NOT NULL        )    
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
            expiry_date DATE,
            unitOfMeasure VARCHAR(10),
            foodie_id UUID REFERENCES FOODIE(id) ON DELETE CASCADE,
            photo VARCHAR(150),
            public_id VARCHAR(100) NOT NULL UNIQUE
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
            isFresh BOOLEAN, 
            foodie_id UUID REFERENCES FOODIE(id) ON DELETE CASCADE,
            photo VARCHAR(150),
            public_id VARCHAR(100) NOT NULL UNIQUE
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
            location_id UUID REFERENCES LOCATION(id),
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
            STATUS VARCHAR(50)
        )
    `).then((res) => {
        console.log("DONATION_REQUESTS Table Ready")
    }).catch(error => {
        console.error("Something went wrong when creating DONATION_REQUESTS table", error)
    });

    // LOCATION TABLE
    await pool.query(
        `
            CREATE TABLE IF NOT EXISTS LOCATION(
                ID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                LATITUDE VARCHAR(100), 
                LONGITUDE VARCHAR(100),
                CITY VARCHAR(100),
                PROVINCE VARCHAR(100),
                ZIPCODE VARCHAR(100),
                COUNTRY VARCHAR(100),
                STREET VARCHAR(100), 
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `
    ).then((res) => {
        console.log("Location Table Ready")
    }).catch(error => {
        console.error("Something went wrong when creating Location table", error)
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
            donor_id UUID REFERENCES FOODIE(id),
            donationsMade INT,
            donationsReceived INT
        );    
    `).then((res) => {
        console.log("DONATED ITEMS Table Ready")
    }).catch(error => {
        console.error("Something went wrong when creating DONATED ITEMS table", error)
    });
}

module.exports = { initialiseTables };