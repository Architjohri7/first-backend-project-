import dotenv from "dotenv";

// as mongoose and DB_NAME are not used here so they are not available because we connect from 
// indexedDB.js from db
import mongoose from "mongoose";
import {DB_NAME} from "./constants.js";
import connectDB from "./db/index.js";
import app from "./app.js";

// dotenv.config({
//     path: './.env'
// });

dotenv.config();

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`App is on port ${process.env.PORT || 8000}`); 
    });
})
.catch((error)=>{
    console.log("MONGO db connection failed",error);
})



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