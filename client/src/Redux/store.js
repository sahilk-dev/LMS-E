import { configureStore } from '@reduxjs/toolkit';

import authSliceReducer from './Slices/AuthSlice';
import courseSliceReducer from './Slices/CourseSlice';
import razorpaySliceReducer from './Slices/RazorpaySlice';
import lectureSliceReducer from './Slices/LectureSlice';
import stateSliceReducer from './Slices/StatSlice';

const store = configureStore({
    reducer:{
        auth:authSliceReducer,
        course: courseSliceReducer,
        razorpay: razorpaySliceReducer,
        lecture: lectureSliceReducer,
        stat: stateSliceReducer
    },
    devTools:true
});

export default store;