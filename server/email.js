const nodemailer = require('nodemailer');
const fs = require('fs')
const { queryDb } = require('./misc');


// require('dotenv').config();

// Function to send email 
async function email_send(body) {
    console.log('email_send') // , { body })
    let { company_id, post_id, applicationUrl, emailApplicationTo, emailApplicationSubjectLine, newEmail } = body;
    if (applicationUrl) {
        console.log('email_send - applicationUrl', applicationUrl)
        // Apply through application url
    }
    if (!emailApplicationTo) { return { status: 'success' } }

    console.log('email_send', { body })
    company_id = parseInt(company_id)
    post_id = parseInt(post_id)

    // Get company
    let company = (await queryDb("SELECT * FROM companies WHERE id = ?", [company_id]))[0];
    // Get post
    let post = (await queryDb("SELECT * FROM posts WHERE id = ?", [post_id]))[0];

    // search all extracts at post_id for 'email'
    let extracts = (await queryDb("SELECT * FROM extracts WHERE post_id = ?", [post_id]));
    let extractContent = extracts.map(extract => {
        parsed = JSON.parse(extract.extract)
        let emails = parsed.email
        return parsed?.email?.length && parsed.email[0] || false
    }).filter(Boolean)

    let recipientEmail = extractContent[0]
    let companyName = company.companyName;
    let jobTitle = post.jobTitle;
    let subject = `Application for ${jobTitle}`;

    console.log({ company_id, post_id, recipientEmail, emailApplicationTo, companyName, jobTitle })

    try {
        // Create transporter using SMTP transport
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.YOUR_GMAIL_EMAIL,
                pass: process.env.YOUR_GMAIL_PASSWORD
            }
        });

        // Rename the files at attachmentPaths to postfix "-name-of-company-name-of-job-title"
        let newAttachmentPaths = ['./resume.pdf', './cover.pdf'].map(path => {
            let parts = path.split('.');
            let ext = parts.pop();
            let name = parts.join('.');
            let newName = `${name}-${jobTitle.replace(' ', '_')}-${defaultName.replace(' ', '_')}-${companyName.replace(' ', '_')}.pdf`;
            // copy not rename
            fs.copyFileSync(path, newName);
            return newName;
        })


        // Mail options
        const mailOptions = {
            from: process.env.YOUR_GMAIL_EMAIL,
            to: emailApplicationTo || recipientEmail,
            subject: emailApplicationSubjectLine || subject,
            text: newEmail,
            attachments: newAttachmentPaths.map(path => ({ path }))
        };

        console.log('mailOptions', mailOptions)

        // Send mail
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);

        newAttachmentPaths.map(path => fs.unlinkSync(path))
    } catch (error) {
        console.error('Error sending email:', error);
    }
    return { status: 'success' }

}


module.exports = { email_generate, email_send }