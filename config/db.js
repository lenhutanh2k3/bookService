import mongoose from "mongoose";

const dbconnect=async()=>{
    await mongoose.connect(process.env.MONGODB_URL)
    await console.log('da ket noi voi mongodb')

}
export default dbconnect;