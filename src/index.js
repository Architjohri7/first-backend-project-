import dotenv from "dotenv";

// as mongoose and DB_NAME are not used here so they are not available because we connect from 
// indexedDB.js from db
import mongoose from "mongoose";
import {DB_NAME} from "./constants.js";
import connectDB from "./db/index.js";

dotenv.config({
    path: './.env'
});


connectDB();



// import express from "express";
// const app = express();


// ( async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//         app.on("error",(error)=>{
//             console.log("ERROR:",error);
//             throw error;
//         })

//         app.listen(process.env.PORT, () =>{
//             console.log(`App is on port ${process.env.PORT}`); 
//         })
//     } catch (error) {
//         console.log("ERROR:",error);
//         throw error;
//     }
// })()