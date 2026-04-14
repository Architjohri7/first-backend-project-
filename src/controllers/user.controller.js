import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

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

    const isPasswordValid = await user.isPasswordCorrect(password);

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


const refreshAccessToken = asyncHandler(async (req,res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(400,"Refresh token is required");
    }

   try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    const user = await User.findById(decodedToken?._id);
 
    if(!user){
     throw new ApiError(404,"User not found");
    }
 
    if(user.refreshToken !== incomingRefreshToken){
     throw new ApiError(401,"Invalid refresh token");
    }
 
    const options = {
     httpOnly: true,
     secure: true
    }
 
    const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id);
 
    return res.status(200)
    .cookie("refreshToken", newRefreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(200,{accessToken, newRefreshToken},"Access token refreshed successfully"));
   } catch (error) {
    throw new ApiError(401,"Invalid refresh token");
   }

})

const changeCurrentPassword = asyncHandler(async (req,res) => {
    const{oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    
    if(!isPasswordCorrect){
        throw new ApiError(401,"Old password is incorrect");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: true});


    return res.status(200).json(new ApiResponse(200,null,"Password changed successfully"));



})

const getCurrentUser = asyncHandler(async (req,res) => {

    return res.status(200).json(new ApiResponse(200,req.user,"Current user fetched successfully"));

})

const updateAccount = asyncHandler(async (req,res) => {

    const{fullName,email} = req.body;

    if(!fullName || !fullName.trim() || !email || !email.trim()){
        throw new ApiError(400,"Full name and email are required");
    }
    
    const user = User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {new: true}
    ).select("-password");

    return res.status(200).json(new ApiResponse(200,user,"User account updated successfully"));



})

const updateUserAvatar = asyncHandler(async (req,res) => {

    const avtarLocalPath = req.files?.path;

    if(!avtarLocalPath){
        throw new ApiError(400,"Avatar image is required");
    }

    const avatar = await uploadOnCloudinary(avtarLocalPath);
    
    if(!avatar){
        throw new ApiError(500,"Failed to upload avatar");
    }

    const user = await User.findByIdAndUpdate(req.user._id, {
        $set: {
            avatar: avatar.url
        }
    }, {new: true});

    return res.status(200).json(new ApiResponse(200,avatar.url,"User avatar updated successfully"));
})

const updateUserCoverImage = asyncHandler(async (req,res) => {

    const coverImageLocalPath = req.files?.path;

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover image is required");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    
    if(!coverImage){
        throw new ApiError(500,"Failed to upload cover image");
    }

    const user = await User.findByIdAndUpdate(req.user._id, {
        $set: {
            coverImage: coverImage.url
        }
    }, {new: true});

    return res.status(200).json(new ApiResponse(200,coverImage.url,"User cover image updated successfully"));
})


const getUserChannelProfile = asyncHandler(async (req,res) => {

    const {username} = req.params;

    if(!username || !username.trim()){
        throw new ApiError(400,"Username is required");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: [
                        {
                            $in: [req.user._id, "$subscribers.subscriber"]
                        },
                        true,
                        false
                    ]
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ]);

    if(!channel || channel.length === 0){
        throw new ApiError(404,"Channel not found with this username");
    }

    return res.status(200).json(new ApiResponse(200,channel[0],"Channel profile fetched successfully"));

})    


   export {registerUser,
     loginUser,
      logoutUser,
       refreshAccessToken,
        changeCurrentPassword,
         getCurrentUser,
          updateAccount,
           updateUserAvatar};

