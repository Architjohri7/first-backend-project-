import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";


const registerUser = asyncHandler(async (req,res,next) => {


    // console.log("BODY RAW:", req.body);
    // console.log("FILES RAW:", req.files);

    const body = { ...req.body };

const fullName = body.fullName;
const email = body.email;
const username = body.username;
const password = body.password;

if (
  !fullName || !fullName.trim() ||
  !email || !email.trim() ||
  !username || !username.trim() ||
  !password || !password.trim()
) {
  throw new ApiError(400, "All fields are required");
}

    const existedUser = await User.findOne({
        $or:[
            {username},
            {email}
        ]
    })
    if(existedUser){
        throw new ApiError(400,"User already exists with this email or username");
    }

    const avtarLocalPath = req.files?.avatar?.[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    
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

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
        throw new ApiError(500,"Failed to create user");
    }

    return res.status(201).json(new ApiResponse(201,createdUser,"User registered successfully"));



})

export {registerUser};

