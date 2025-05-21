import AppError from "../utils/appError.js";
import { razorpay } from "../server.js";
import User from "../models/user.model.js";

import crypto from 'crypto';

import Payment from "../models/payment.model.js";

export const getRazorpayApiKey = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Razorpay API Key',
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch(e) {
        return next(
            new AppError(e.message, 404)
        );
    }
    
}

export const buySubscription = async (req, res, next) => {
    try {
        const { id } = req.user;
        const user = await User.findById(id);

    if (!user) {
        return next(
            new AppError('Unauthorized, please login', 404)
        );
    }

    if (user.role === 'ADMIN') {
        return next(
            new AppError(
                'Admin cannot purchase a subscription', 404
            )
        )

    }

    console.log("User found:", user); // Debugging log

    if (!process.env.RAZORPAY_PLAN_ID) {
        return next(new AppError("Razorpay plan id missing", 500));
    }

    console.log("Creating subscription with Plan ID:", process.env.RAZORPAY_PLAN_ID); // Debugging log


    let subscription;
    try {
         subscription = await razorpay.subscriptions.create({
        plan_id: process.env.RAZORPAY_PLAN_ID,
        customer_notify: 1,
        total_count: 12,
    });
    console.log("Subscription created:", subscription); // Debugging log
    } catch (razorpayError) {
        console.log("Razorpay error:", razorpayError); // Debugging log
        return next(new AppError(`Razorpay API Error: ${razorpayError.message}`, 500));
    }

    if (!subscription || !subscription.id) {
        return next(new AppError("Failed to create subscription", 500));
    }
    
    user.subscription.id = subscription.id;
    user.subscription.status = subscription.status;

    await user.save();

    res.status(200).json({
        success: true,
        message: 'Subscription purchased successfully',
        subscription_id: subscription.id
    });
    } catch (e) {
        console.log("Error in buySubscription:", e); // Debugging log
        return next(
            new AppError(e.message || "Something went wrong", 404)
        );
        
    }
}

export const verifySubscription = async (req, res, next) => {
    try {
        const { id } = req.user;
    const { razorpay_payment_id, razorpay_signature, razorpay_subscription_id } = req.body;

    const user = await User.findById(id);

    if (!user) {
        return next(
            new AppError('Unauthorized, please login', 404)
        );
    }

    const subscriptionId = user.subscription.id;

    const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_SECRET)
    .update(`${razorpay_payment_id}|${subscriptionId}`)
    .digest('hex');

    if (generatedSignature !== razorpay_signature) {
        return next(
            new AppError('Payment not verified, please try again', 404)
        );
    }

    await Payment.create({
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature,
    });

    user.subscription.status = 'active';
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Subscription verified successfully'
    });
    } catch (e) {
        return next(
            new AppError(e.message, 404)
        );
    }
    
}

export const cancelSubscription = async (req, res, next) => {
    try {
        const { id } = req.user;

        const user = await User.findById(id);

    if (!user) {
        return next(
            new AppError('Unauthorized, please login', 404)
        );
    }

    if (user.role === 'ADMIN') {
        return next(
            new AppError(
                'Admin cannot cancel a subscription', 404
            )
        )
    }

    const subscriptionId = user.subscription.id;

    const subscription = await razorpay.subscriptions.cancel(subscriptionId);

    user.subscription.status = subscription.status;

    await user.save();

    res.status(200).json({
        success: true,
        message: 'Subscription cancelled successfully'
    });

    } catch(e) {
        return next(
            new AppError(e.message, 404)
        );
    }
    
}

export const getPaymentDetails = async (req, res, next) => {
    try {
        const { payment_id} = req.params;
        console.log("Fetching Payment ID:", payment_id); // Debugging log

    const payment = await razorpay.payments.fetch(payment_id);

    if (!payment) {
        return res.status(404).json({
            success: false,
            message: 'Payment not found'
        });
    }

    res.status(200).json({
        success: true,
        payment: payment
    });

    } catch (error) {
        return next(
            new AppError(error.message, 500)
        );
    }
}

export const allPayments = async (req, res, next) => {
    try {
        const { count } = req.query;

    const payments = await razorpay.payments.all({
        count: count || 10,
    });

    res.status(200).json({
        success: true,
        message: 'All payments retrieved successfully',
        // subscriptions
        payments
    });
    } catch (error) {
        return next(
            new AppError(error.message, 500)
        );
    }
}