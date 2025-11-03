import React from 'react'
import { Cloudinary } from '@cloudinary/url-gen';
import { auto } from '@cloudinary/url-gen/actions/resize';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';
import { AdvancedImage } from '@cloudinary/react';
import { CLOUD_NAME } from "@env"
import { CLOUDINARY_API_KEY } from "@env"
import { API_SECRET } from "@env"

const CloudinaryUpload = (image) => {
    const cld = new Cloudinary({ cloud: { cloudName: CLOUD_NAME } });

    // Use this sample image or upload your own via the Media Library
    const img = cld
        .image(image)
        .format('auto') // Optimize delivery by resizing and applying auto-format and auto-quality
        .quality('auto')
        .resize(auto().gravity(autoGravity()).width(500).height(500)); // Transform the image: auto-crop to square aspect_ratio

    return (<AdvancedImage cldImg={img} />);
};

export default App