import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'path';

export async function sendEmailWithEJS(toEmail: string, subjects: string, data: any) {
    try {
        // Create the Nodemailer transporter with custom SMTP settings (host & port)
        const transporter = nodemailer.createTransport({
            host: 'smtp.your-email-provider.com',
            port: 587,
            secure: false,
            auth: {
                user: 'your-email@example.com',
                pass: 'your-email-password',
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Define the path to the EJS template
        const templatePath = path.join(__dirname, 'email-template.ejs');

        // Render the EJS template with dynamic data
        const htmlContent = await ejs.renderFile(templatePath, data);

        // Define the email options
        const mailOptions: any = {
            from: 'your-email@example.com', // Sender address
            to: toEmail, // Recipient address
            subject: subjects, // Subject line
            html: htmlContent, // HTML body (rendered EJS content)
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.error('Error sending email: ', error);
    }
}

// // Usage example
// sendEmailWithEJS('recipient@example.com', 'Test Email Subject', { name: 'John Doe', companyName: 'Example Inc.' });
