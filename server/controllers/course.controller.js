import Course from '../models/course.model.js';
import AppError from '../utils/appError.js';
import fs from 'fs/promises';
// import cloudinary from 'cloudinary';
import { v2 as cloudinary } from 'cloudinary';

import asyncHandler from '../middlewares/asyncHandler.middleware.js';

import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  
//   console.log("Cloudinary Config:", cloudinary.v2.config());

const getAllCourses = async function(req, res, next) {
    try {
        const courses = await Course.find({}).select('-lectures');

        res.status(200).json({
        success: true,
        message: 'All courses',
        courses,
    });
    } catch (e) {
        return next(new AppError(e.message, 500));
    }
    
}

const getLecturesByCourseId = async function(req, res, next) {
    try {
        const { id } = req.params;

        const course = await Course.findById(id);
        if (!course) {
            return next(new AppError('Invalid course id', 400));
        }

        res.status(200).json({
            success: true,
            message: 'Course lectures fetched successfully',
            lectures: course.lectures,
        });
    } catch (e) {
        return next(new AppError(e.message, 500));
    }
}

const createCourse = async (req, res, next) => {
    const { title, description, category, createdBy } = req.body;

    if (!title || !description || !category || !createdBy) {
        return next(new AppError("All fields are required", 400));
    }

    let course;
    try {
        course = await Course.create({
            title,
            description,
            category,
            createdBy,
            thumbnail: {
                public_id: "Dummy",
                secure_url: "Dummy",
            },
        });
    } catch (e) {
        console.error("Error creating course:", e);
        return next(new AppError("Failed to create course", 500));
    }

    if (!course) {
        return next(new AppError("Failed to create course", 500));
    }

    console.log("File Received:", req.file); // Debugging
    

    if (req.file) {
        try {
            console.log("Uploading file to Cloudinary...");
            // const result = await cloudinary.uploader.upload(req.file.path, {
            //     folder: "lms",
            // });
            const uploadPromise = new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: "lms", resource_type: "auto" },
                    (error, result) => {
                        if (error) {
                            console.error("Cloudinary Upload Error:", error);
                            reject(error);
                        } else {
                            console.log("Cloudinary Upload Success:", result);
                            resolve(result);
                        }
                    }
                );
                uploadStream.end(req.file.buffer); // Use buffer instead of file path
            });

            const result = await uploadPromise;

            if (result) {
                course.thumbnail.public_id = result.public_id;
                course.thumbnail.secure_url = result.secure_url;
            }

            // Ensure file is removed after upload
            // await fs.rm(`uploads/${req.file.filename}`);
        } catch (e) {
            console.error("Error uploading file to Cloudinary:", e);
            return next(new AppError(e.message || "Failed to upload file", 500));
        }
    } else {
        console.log("No file uploaded, using default thumbnail.");
    }

    try {
        await course.save();
    } catch (e) {
        console.error("Error saving course:", e);
        return next(new AppError("Failed to save course", 500));
    }

    res.status(200).json({
        success: true,
        message: "Course created successfully",
        course,
    });
};

const updateCourse = async(req, res, next) => {
    try {
        const { id } = req.params;
        const course = await Course.findByIdAndUpdate(
            id,
            {
               $set: req.body 
            },
            {
                runValidators: true
            }
        );

        if (!course) {
            return next(
                new AppError('Course with given id does not exist', 500)
            )
        }

        res.status(200).json({
            success: true,
            message: 'Course updated successfully',
            course,
        });
    } catch (e) {
        return next(
            new AppError(e.message, 500)
        )
    }
}

const removeCourse = async(req, res, next) => {
    try {
        const { id } = req.params;
        const course = await Course.findById(id);

        if (!course) {
            return next(
                new AppError('Course with given id does not exist', 500)
            )
        }

        await Course.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Course deleted successfully',
        });
    } catch (e) {
        return next(
            new AppError(e.message, 500)
        ) 
    }
}

const addLectureToCourseById = async (req, res, next) => {
    try {
        const { title, description } = req.body;
        const { id } = req.params;

        if (!title || !description) {
            return next(new AppError("All fields are required", 400));
        }

        const course = await Course.findById(id);
        if (!course) {
            return next(new AppError("Course with given id does not exist", 500));
        }

        const lectureData = { title, description, lecture: {} };

        console.log("Request Body:", req.body);
        console.log("File Received:", req.file);

        if (req.file) {
            try {
                console.log("Cloudinary Upload Started...");
                // console.log("Using Cloudinary Config:", cloudinary.config());
                // console.log("File Received:", req.file);

                //  Upload file directly from memory buffer
                const uploadPromise = new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: "lms", resource_type: "auto" }, //  Auto-detect image/video
                        (error, result) => {
                            if (error) {
                                console.error("Cloudinary Upload Error:", error);
                                reject(error);
                            } else {
                                console.log("Cloudinary Upload Success:", result);
                                resolve(result);
                            }
                        }
                    );
                    uploadStream.end(req.file.buffer); //  Pass buffer instead of file path
                });

                const result = await uploadPromise;

                //  Store Cloudinary details in database
                lectureData.lecture.public_id = result.public_id;
                lectureData.lecture.secure_url = result.secure_url;
            } catch (e) {
                console.error("Error in addLectureToCourseById:", e); // added
                return next(new AppError(e.message || "Failed to upload file", 500));
            }
        } else {
            return next(new AppError("No file uploaded", 400));
        }

        course.lectures.push(lectureData);
        course.numberOfLectures = course.lectures.length;
        await course.save();

        res.status(200).json({
            success: true,
            message: "Lecture added successfully",
            course,
        });
    } catch (e) {
        console.error("Error in addLectureToCourseById:", e);
        return next(new AppError(e.message, 500));
    }
};

const removeLectureFromCourse = async (req, res, next) => {
  try {
    const { courseId, lectureId } = req.query;

    if (!courseId) {
      return next(new AppError('Course ID is required', 400));
    }

    if (!lectureId) {
      return next(new AppError('Lecture ID is required', 400));
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return next(new AppError('Invalid ID or Course does not exist.', 404));
    }

    const lectureIndex = course.lectures.findIndex(
      (lecture) => lecture._id.toString() === lectureId.toString()
    );

    if (lectureIndex === -1) {
      return next(new AppError('Lecture does not exist.', 404));
    }

    const lecture = course.lectures[lectureIndex];
    const publicId = lecture?.lecture?.public_id;

    // Log this to verify structure
    console.log('Lecture:', lecture);
    console.log('public_id to delete from Cloudinary:', publicId);

    if (publicId) {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'video',
      });
    }

    course.lectures.splice(lectureIndex, 1);
    course.numberOfLectures = course.lectures.length;
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Course lecture removed successfully',
    });
  } catch (err) {
    console.error('Error removing lecture:', err);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: err.message,
    });
  }
};




export {
    getAllCourses,
    getLecturesByCourseId,
    createCourse,
    updateCourse,
    removeCourse,
    addLectureToCourseById,
    removeLectureFromCourse
}