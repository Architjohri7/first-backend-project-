import mongoose, {Schema} from "mongoose";

const likeSchema = new Schema({
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video"
    },
    likedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    comment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
    }, 
    tweet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tweet"
    }
},
{
    timestamps: true
});

const Like = mongoose.model("Like", likeSchema);

export default Like;