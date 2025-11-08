import { Buffer } from 'buffer';
// Buffer to decode the base64 string
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
// import path from 'path';
// Set up the AWS S3 client
const s3Client = new S3Client({
    region: 'us-west-2', // Specify your AWS region
});

// The S3 Bucket name
const bucketName = 'your-bucket-name';
/* Create Folder*/
export async function createFolder(folderName: string) {
    try {
        // Ensure the folderName ends with '/'
        if (!folderName.endsWith('/')) {
            folderName += '/';
        }

        // Create an empty object with the folderName as the key (this simulates a folder in S3)
        const params = {
            Bucket: bucketName,
            Key: folderName, // The "folder" is just an object key with a trailing slash
        };

        // Upload the "empty" object
        const command = new PutObjectCommand(params);
        const data = await s3Client.send(command);

        return data; // You can handle any response data here if needed
    } catch (error) {
        console.error('Error creating folder:', error);
    }
}
/* Download File */
export async function downloadFileFrom(fileName: string, downloadPath: string) {
    try {
        // Prepare the parameters for the GetObjectCommand
        const params = {
            Bucket: bucketName,
            Key: fileName, // The key of the object you want to download
        };

        // Create the GetObject command
        const command = new GetObjectCommand(params);

        // Send the command to get the object from S3
        const data: any = await s3Client.send(command);

        if (data?.Body) {
            fs.writeFileSync('./uploads/' + downloadPath, data.Body);
            return true;
        }
    } catch (error) {
        console.error('Error downloading file:', error);
    }
}
/* Upload Image */
export async function uploadBase64Image(base64Data: string, fileName: string) {
    try {
        // Decode the base64 string into a buffer (without extracting MIME type)
        const buffer = Buffer.from(base64Data, 'base64');

        // Set upload parameters
        const uploadParams = {
            Bucket: bucketName,
            Key: fileName,  // File name in S3 (can be path/filename)
            Body: buffer,   // Base64 decoded content as the body of the object
            ContentType: 'image/jpeg', // Manually setting MIME type, adjust as needed
        };

        // Upload the image buffer to S3
        const data = await s3Client.send(new PutObjectCommand(uploadParams));
        console.log('Success', data);
    } catch (err) {
        console.error('Error uploading image:', err);
    }
}

// // Usage
// const bucketName = 'your-bucket-name'; // Replace with your S3 bucket name
// const folderName = 'my-new-folder'; // Replace with your desired folder name
// createS3Folder(bucketName, folderName);
// // Example usage
// const base64String = 'your_base64_encoded_image_string_here';  // Base64 string of the image
// uploadBase64Image(base64String, 'image.jpg');  // File name you want in S3


