import jwt from "jsonwebtoken";

export function authUser(req,res,next){
    const token = req.cookies.token

    if(!token){
        return res.status(401).json({
            message:"Uauthorized",
            success:false,
            err:"No token provided"
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            message:"Invalid token",
            success:false,
            err:"Invalid token"
        })
    }
}