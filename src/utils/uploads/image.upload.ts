import path from "path";
import fs from "fs";
import { UploadedFile } from "express-fileupload";


export class Uploads {
    static async processFiles(files: UploadedFile[], folderPath: string, type: string, docName: string | undefined, oldFileName: string = ""): Promise<any[]> {
        console.log("Entered processFiles");

        let allowedExtensions: any = []
        if (type == 'img') {
            allowedExtensions = ['jpg', 'jpeg', 'png'];
        }
        if (type == 'doc') {
            allowedExtensions = ["doc", "docx", "pdf", "xlsx"];
        }

        const imageArray: any[] = [];

        for (const file of files) {
            const fileExtension = file.name.split(".").pop()?.toLowerCase();

            if (type != 'All' && (!fileExtension || !allowedExtensions.includes(fileExtension))) {
                throw new Error("Invalid file format");
            }

            const fileName = `${type}-${Date.now()}.${fileExtension}`;
            const result = await this.fileUpload(file, folderPath, fileName, "");

            console.log("File uploaded:", fileName);

            if (result) {
                imageArray.push({
                    docName: fileName,
                    docPath: folderPath,
                    originalName: file.name,
                });
            }
        }

        return imageArray;
    }


    static async fileUpload(file: any, folder: string, fileName: string, oldFileName: string): Promise<any> {

        try {
            const folderPath = path.join('public', folder);

            // Ensure the folder exists
            if (!fs.existsSync(folderPath)) {
                console.log("Creating directory:", folderPath);
                fs.mkdirSync(folderPath, { recursive: true });
            }

            /* Unlink Old File*/
            if (oldFileName) {
                const filePath = path.join(folderPath, oldFileName);

                if (fs.existsSync(filePath)) {
                    console.log(`Deleting old file: ${oldFileName}`);
                    fs.unlinkSync(filePath);
                } else {
                    console.log(`File ${oldFileName} not found, skipping deletion.`);
                }
            }

            if (!file || !file.data) {
                console.error("Invalid file data");
                return false;
            }
            const filePath = path.join(folderPath, fileName);
            await new Promise<void>((resolve, reject) => {
                file.mv(filePath, (err: any) => {
                    if (err) {
                        console.error("Error moving file:", err);
                        return reject(err);
                    }
                    console.log("File saved successfully:", filePath);
                    resolve();
                });
            });
            return true;
        } catch (error) {
            console.error("Error saving file:", error);
            return false;
        }
    }
}