import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/User.model.js";
import uploadOnCloudinary from "../utils/uploadOnCloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";


const registerUser = asyncHandler(async (req,res) => {
    
    const {fullName,email,username,password} = req.body;
    console.log("email:",email);
    
    if(!fullName || !email || !username || !password){
        throw new ApiError(400,"All fields are required");
    }

    const existedUser = User.findOne({
        $or:[
            {username},
            {email}
        ]
    })
    if(existedUser){
        throw new ApiError(400,"User already exists with this email or username");
    }

    const avtarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    
    if(!avtarLocalPath){
        throw new ApiError(400,"Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avtarLocalPath); 
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(500,"Failed to upload avatar");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username: username.toLowerCase(),
        password
    })

    const createdUser = await User.findbyId(user._id).select("-password -refreshToken");

    if(!createdUser){
        throw new ApiError(500,"Failed to create user");
    }

    return res.status(201).json(new ApiResponse(201,createdUser,"User registered successfully"));

    

})

export {registerUser};

