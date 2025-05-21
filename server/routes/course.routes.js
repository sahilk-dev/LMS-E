import { Router } from 'express';
import multer from 'multer';
import { getAllCourses, getLecturesByCourseId, createCourse, updateCourse, removeCourse,removeLectureFromCourse } from '../controllers/course.controller.js';
import { isLoggedIn } from '../middlewares/auth.middleware.js';
import { authorizedRoles } from '../middlewares/auth.middleware.js';
import { authorizeSubscriber } from '../middlewares/auth.middleware.js';
import { addLectureToCourseById } from '../controllers/course.controller.js';
import upload from '../middlewares/multer.middleware.js';

const router = Router();
// const upload = multer({ dest: 'uploads/' });
router.route('/')
    .get(getAllCourses)
    .post(
        isLoggedIn,
        authorizedRoles('ADMIN'),
        upload.single('thumbnail'),
        createCourse
    )
    .delete(isLoggedIn, authorizedRoles('ADMIN'), removeLectureFromCourse);
    
router.route('/:id')
    .get(isLoggedIn, authorizeSubscriber, getLecturesByCourseId)
    .put(
        isLoggedIn,
        authorizedRoles('ADMIN'),
        updateCourse
    )
    .delete(
        isLoggedIn,
        authorizedRoles('ADMIN'),
        removeCourse
    )
    .post(
        isLoggedIn,
        authorizedRoles('ADMIN'),
        upload.single('lecture'),
        addLectureToCourseById
    );


export default router;