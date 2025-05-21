import User from "../models/user.model.js";
import AppError from "../utils/appError.js";
import cloudinary from 'cloudinary';
import fs from 'fs/promises';
import sendEmail from "../utils/sendEmail.js";
import crypto from 'crypto';

const cookieOptions = {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure:true
}

const register = async (req, res, next) => {
    try {
        console.log("🔍 Incoming Request Body:", req.body);
        console.log("📸 Incoming File:", req.file);

        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            return next(new AppError('All fields are required', 400));
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return next(new AppError('Email already exists', 400));
        }

        const user = await User.create({
            fullName,
            email,
            password,
            avatar: {
                public_id: email,
                secure_url: 'https://res.cloudinary.com/du9jzqlpt/image/upload/v1674647316/avatar_drzgxv.jpg',
            },
        });

        if (!user) {
            return next(new AppError('User registration failed, please try again later', 400));
        }

        if (req.file) {
            console.log("✅ Uploading Image to Cloudinary...");
            
            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.v2.uploader.upload_stream(
                    { folder: 'lms', width: 250, height: 250, gravity: 'face', crop: 'fill' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer); // Upload from memory storage
            });

            user.avatar.public_id = uploadResult.public_id;
            user.avatar.secure_url = uploadResult.secure_url;
        }

        await user.save();
        user.password = undefined;

        const token = await user.generateJWTToken();
        res.cookie('token', token, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: true
        });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user,
        });

    } catch (e) {
        console.error("❌ Unexpected Server Error:", e);
        return next(new AppError(e.message, 500));
    }
};


const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

    if (!email || !password) {
        return next(new AppError('All fields are required', 400));
    }

    const user = await User.findOne({
        email
    }).select('+password');
    console.log("User Found:", user); // Debugging line
    

    if (!user) {
        return next(new AppError('Invalid email or password', 400));
    }

    const isPasswordValid = await user.comparePassword(password);
    console.log("Password Valid:", isPasswordValid); // Debugging line
    
    if(!isPasswordValid) {
        return next(new AppError('Invalid email or password', 400));
    }

    const token = await user.generateJWTToken();
    user.password = undefined;

    res.cookie('token', token, cookieOptions);

    res.status(200).json({
        success: true,
        message: 'User loggedin successfully',
        token,
        user,
    });
    } catch (e) {
        return next(new AppError(e.message, 500));
    }
    
};

const logout = (req, res) => {
    res.cookie('token', null, {
        secure: true,
        maxAge: 0,
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        message: 'User logged out successfully'
    })
};

const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
    const user = await User.findById(userId);

    res.status(200).json({
        success: true,
        message: 'User details',
        user
    });
    } catch (e) {
        return next(new AppError('failed to fetch profile details', 400));
    }
    
};

const forgotPassword = async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new AppError('Email is required', 400));
    }

    const user = await User.findOne({email});
    if (!user) {
        return next(new AppError('Email not resgistered', 400));
    }

    const resetToken = await user.generatePasswordResetToken();

    await user.save();

    const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    console.log(resetPasswordUrl);
    
    const subject = 'Reset Password';
    const message = `You can reset your password by clicking <a href=${resetPasswordUrl} target="_blank">Reset your password</a>\nIf the above link does not work for some reason then copy paste this link in new tab ${resetPasswordUrl}.\n If you have not requested this, kindly ignore.`;
    try {
        await sendEmail(email, subject, message);

        res.status(200).json({
            success: true,
            message: `Reset password token has been sent to ${email} successfully`
        });
    } catch (e) {

        user.forgetPasswordToken = undefined;
        user.forgetPasswordExpiry = undefined;

        await user.save();
        return next(new AppError(e.message, 500));
    }
}

const resetPassword = async (req, res,) => {
    const { resetToken } = req.params;

    const { password } = req.body;

    const forgetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    const user = await User.findOne({
        forgetPasswordToken,
        forgetPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
        return next(new AppError('Token is invalid or expired, please try again', 400));
    }

    user.password = password;
    user.forgetPasswordToken = undefined;
    user.forgetPasswordExpiry = undefined;

    user.save();

    res.status(200).json({
        success: true,
        message: 'Password reset successfully'
    });
}

const changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const { id } = req.user;

    if (!oldPassword || !newPassword) {
        return next(new AppError('All fields are mandatory', 400));
    }

    const user = await User.findById(id).select('+password');

    if(!user) {
        return next(new AppError('User does not exist', 400));
    }

    const isPasswordValid = await user.comparePassword(oldPassword);

    if (!isPasswordValid) {
        return next(new AppError('Invalid old password', 400));
    }

    user.password = newPassword;

    await user.save();

    user.password = undefined;

    res.status(200).json({
        success: true,
        message: 'Password changed successfully',
        user
    });
}

const updateUser = async (req, res, next) => {
    try {
        const { fullName } = req.body;
        const loggedInUserId = req.user.id;
        const { id } = req.params;

        console.log("🔍 Logged-in User ID:", loggedInUserId);
        console.log("🔍 Requested Update for ID:", id);

        if (loggedInUserId.toString() !== id.toString() && req.user.role !== 'ADMIN') {
            return next(new AppError('You are not authorized to update other users', 403));
        }

        const user = await User.findById(id);
        if (!user) {
            return next(new AppError('User does not exist', 400));
        }

        if (fullName) {
            user.fullName = fullName;
        }

        // Handle new avatar upload
        if (req.file) {
            try {
                console.log("✅ Uploading New Avatar to Cloudinary...");
                
                // Delete old avatar from Cloudinary if it exists
                if (user.avatar?.public_id) {
                    await cloudinary.v2.uploader.destroy(user.avatar.public_id);
                }

                // Upload new avatar
                const uploadResult = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.v2.uploader.upload_stream(
                        { folder: 'lms', width: 250, height: 250, gravity: 'face', crop: 'fill' },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );
                    uploadStream.end(req.file.buffer); // Upload from memory
                });

                user.avatar.public_id = uploadResult.public_id;
                user.avatar.secure_url = uploadResult.secure_url;

            } catch (e) {
                console.error("❌ Error Uploading Image:", e);
                return next(new AppError(e.message || 'File upload failed, please try again', 500));
            }
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'User details updated successfully',
            user
        });

    } catch (error) {
        console.error("❌ Error Updating Profile:", error);
        return next(new AppError('Internal Server Error', 500));
    }
};



export {
    register,
    login,
    logout,
    getProfile,
    forgotPassword,
    resetPassword,
    changePassword,
    updateUser
}