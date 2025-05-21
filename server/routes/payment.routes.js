import {  Router } from 'express';
import { getRazorpayApiKey, buySubscription, verifySubscription, cancelSubscription, allPayments, getPaymentDetails } from '../controllers/payment.controller.js';
import { authorizedRoles, isLoggedIn } from '../middlewares/auth.middleware.js';

const router = Router();

router
    .route('/razorpay-key')
    .get(
        isLoggedIn,
        getRazorpayApiKey
    );

router
    .route('/subscribe')
    .post(
        isLoggedIn,
        buySubscription
    );

router
    .route('/verify')
    .post(
        isLoggedIn,
        verifySubscription
    );

router
    .route('/unsubscribe')
    .post(
        isLoggedIn,
        cancelSubscription
    );

router.get('/', isLoggedIn, authorizedRoles('ADMIN'), allPayments);

router.get('/payment/:payment_id', isLoggedIn, getPaymentDetails);

export default router;