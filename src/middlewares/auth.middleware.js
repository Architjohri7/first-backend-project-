import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import JWT from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {

    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        if (!token) {
            return res.status(401).json({ message: "Unauthorized: No token provided" });
        }
    
        const decodedToken = JWT.verify(token, process.env.JWT_SECRET_KEY);
        
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
        if (!user) {
            throw new ApiError(401, "Unauthorized: Invalid token");
        }
    
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, "Unauthorized: Invalid token");
    }


})    