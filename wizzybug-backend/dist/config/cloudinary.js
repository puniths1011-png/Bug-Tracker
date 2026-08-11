"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromCloudinary = exports.uploadToCloudinary = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const cloudinary_1 = require("cloudinary");
dotenv_1.default.config();
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, } = process.env;
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.warn('Cloudinary environment variables are not fully configured. Image upload requests may fail.');
}
cloudinary_1.v2.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
});
const uploadToCloudinary = (buffer, filename) => {
    return new Promise((resolve, reject) => {
        const publicId = `${Date.now()}_${filename.replace(/\.[^/.]+$/, '')}`;
        const stream = cloudinary_1.v2.uploader.upload_stream({
            public_id: publicId,
            resource_type: 'auto',
            folder: 'wizzybug/bugs',
        }, (error, result) => {
            if (error) {
                reject(error);
                return;
            }
            if (!result) {
                reject(new Error('Cloudinary upload returned no result'));
                return;
            }
            resolve(result);
        });
        stream.end(buffer);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
const deleteFromCloudinary = (publicId) => {
    return new Promise((resolve, reject) => {
        cloudinary_1.v2.uploader.destroy(publicId, { resource_type: 'auto' }, (error, result) => {
            if (error) {
                reject(error);
                return;
            }
            if (!result) {
                reject(new Error('Cloudinary destroy returned no result'));
                return;
            }
            resolve(result);
        });
    });
};
exports.deleteFromCloudinary = deleteFromCloudinary;
