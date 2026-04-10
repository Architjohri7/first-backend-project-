import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";

const generateAccessAndRefreshToken = async(userId) => {

    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "Failed to generate tokens");
    }
}


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

const loginUser = asyncHandler(async (req,res) => {

    const{username,email,password} = req.body;

    if(!(username || email)){
        throw new ApiError(400,"Username or email is required");
    }

    const user = await User.findOne({
        $or:[
            {username},
            {email}
        ]
    })

    if(!user){
        throw new ApiError(404,"User not found with this email or username");
    }

    const isPasswordValid = await user.comparePassword(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials");
    }


    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200,{user: loggedInUser, accessToken, refreshToken},"User logged in successfully"));

})

const logoutUser = asyncHandler(async (req,res) => {

    User.findByIdAndUpdate(req.user._id, {
        $set: { 
            refreshToken: undefined
        }
    }, {new: true})

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("refreshToken", "", {...options, expires: new Date(0)})
    .json(new ApiResponse(200,null,"User logged out successfully"));
})


export {registerUser, loginUser, logoutUser};

