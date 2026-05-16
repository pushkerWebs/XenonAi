import mongoose, { mongo } from "mongoose";

const connectDb = async()=>{
    const connection = await mongoose.connect(process.env.MONGODB_URI)
}

export default connectDb