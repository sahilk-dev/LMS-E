import AppError from "../utils/appError.js";
import jwt from 'jsonwebtoken';
import User from "../models/user.model.js";

const isLoggedIn = async (req, res, next) => {
    let token;

    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return next(new AppError("Unauthenticated, please login again", 401));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded Token:", decoded);

        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return next(new AppError("User does not exist", 404));
        }

        req.user = user; // Attach user details to request
        console.log("Attached User to Request:", req.user);

        next();
    } catch (error) {
        return next(new AppError("Invalid or expired token, please login again", 401));
    }
};


const authorizedRoles = (...roles) => async (req, res, next) => {
    const currentUserRole = req.user.role;
    if (!roles.includes(currentUserRole)) {
        return next(
            new AppError('You are not authorized to access this route', 403)
        );
    }
    next();
}

const authorizeSubscriber = async(req, res, next) => {
    const subscription = req.user.subscription;
    const currentUserRole = req.user.role;
    if (currentUserRole !== 'ADMIN' && subscription.status !== 'active') {
        return next(
            new AppError('Please subscribe to access this route', 403)
        );
    }

    next();
}

export {
    isLoggedIn,
    authorizedRoles,
    authorizeSubscriber
}