async function initialiseTables(pool) {
    //FOODIE table creation
    await pool.query(`
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

    //PANTRY TABLE CREATION
    await pool.query(`
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

    //FRIDGE FOOD TABLE
    await pool.query(`
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

    // User_Push_Tokens SCHEMA
    await pool.query(
        `
            CREATE TABLE IF NOT EXISTS user_push_tokens 
            (
                foodie_id uuid REFERENCES FOODIE(id),
                push_token VARCHAR(250) PRIMARY KEY 
            )
        `
    ).then((res) => {
        console.log("User_Push_Tokens Table Ready")
    }).catch(error => {
        console.error("Something went wrong when creating User_Push_Tokens table", error)
    });
}

module.exports = { initialiseTables };