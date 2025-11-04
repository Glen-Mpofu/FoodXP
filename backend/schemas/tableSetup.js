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
            foodie_id UUID REFERENCES FOODIE(id),
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
            foodie_id UUID REFERENCES FOODIE(id),
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
            photo VARCHAR(150),
            amount DOUBLE PRECISION DEFAULT 1,
            unitOfMeasure VARCHAR(10),
            isPerishable BOOLEAN,
            expiry_date DATE,
            foodie_id uuid REFERENCES FOODIE(id),
            Name varchar(20)
        )
    `).then((res) => {
        console.log("DONATION Table Ready")
    }).catch(error => {
        console.error("Something went wrong when creating DONATION table", error)
    });
}

module.exports = { initialiseTables };