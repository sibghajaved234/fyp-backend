const nodemailer = require('nodemailer');

const sendEmail = async ({ email, subject, template, data }) => {
  try {
    // Create transporter using Gmail service (like your first code)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let html = '';

    // Simple templates (in production, use a template engine like handlebars)
    if (template === 'emailVerification') {
      html = `
        <h1>Welcome to Smart Medical Box!</h1>
        <p>Hello ${data.name},</p>
        <p>Please verify your email by clicking the link below:</p>
        <a href="${data.verificationUrl}">Verify Email</a>
        <p>This link expires in 24 hours.</p>
      `;
    } 
    else if(template == 'newPrescription'){
      html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>New Prescription</title>
</head>

<body style="font-family: Arial, sans-serif; background:#f4f6f9; padding:20px;">

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        
        <table width="600" style="background:white; padding:30px; border-radius:8px;">
          
          <tr>
            <td align="center">
              <h2 style="color:#2c3e50;">New Prescription Created</h2>
            </td>
          </tr>

          <tr>
            <td style="padding-top:20px;">
              <p>Hello <strong>${data.name}</strong>,</p>

              <p>
                A new prescription has been created for you by 
                <strong>Dr. ${data.doctorName}</strong>.
              </p>

              <p>
                <strong>Prescribed Medicines:</strong>
              </p>

              <p style="background:#f7f7f7; padding:10px; border-radius:6px;">
                ${data.medicines}
              </p>

              <p>
                Please make sure to follow the prescribed instructions and take your medicines on time.
              </p>

              <p>
                If you have any questions, contact your doctor.
              </p>

              <br>

              <p>
                Stay Healthy ❤️<br>
                <strong>Smart Medicine Reminder System</strong>
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`
    }
    else if (template === 'passwordReset') {
      html = `
        <h1>Password Reset Request</h1>
        <p>Hello ${data.name},</p>
        <p>You requested to reset your password.</p>
        <a href="${data.resetUrl}">Reset Password</a>
        <p>This code expires in 5 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `;
    } 
    else if (template === 'welcomePatient') {
  html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #f4f4f4;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: auto;
          background: white;
          padding: 30px;
          border-radius: 10px;
        }
        .header {
          background: #4CAF50;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          padding: 20px;
        }
        .box {
          background: #f9f9f9;
          border: 1px solid #ddd;
          padding: 15px;
          margin-top: 15px;
          border-radius: 5px;
        }
        .otp {
          font-size: 28px;
          font-weight: bold;
          color: #4CAF50;
          letter-spacing: 5px;
        }
      </style>
    </head>

    <body>
      <div class="container">

        <div class="header">
          <h1>Welcome to Smart Medical Box</h1>
        </div>

        <div class="content">

          <p>Hello <b>${data.name}</b>,</p>

          <p>Your doctor <b>${data.doctorName}</b> has created your patient account.</p>

          <div class="box">
            <p><b>Login Email:</b> ${data.email}</p>
            <p><b>Password:</b> ${data.password}</p>
          </div>
          <p>Best Regards,<br>Smart Medical Box Team</p>

        </div>

      </div>
    </body>
    </html>
  `;
}
    else if (template === 'passwordResetOTP') {
  html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .header {
                background-color: #4CAF50;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 10px 10px 0 0;
            }
            .content {
                background-color: white;
                padding: 30px;
                border-radius: 0 0 10px 10px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .otp-box {
                background-color: #f8f9fa;
                border: 2px dashed #4CAF50;
                border-radius: 10px;
                padding: 20px;
                text-align: center;
                margin: 20px 0;
            }
            .otp-code {
                font-size: 36px;
                font-weight: bold;
                color: #4CAF50;
                letter-spacing: 5px;
                margin: 10px 0;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeeba;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                font-size: 14px;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 12px;
                color: #666;
            }
            .button {
                display: inline-block;
                padding: 10px 20px;
                background-color: #4CAF50;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 10px 0;
            }
            .expiry {
                font-weight: bold;
                color: #dc3545;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
                <h2>Hello ${data.name},</h2>
                <p>We received a request to reset your password for your Smart Medical Box account.</p>
                
                <div class="otp-box">
                    <p>Use the following OTP (One-Time Password) to reset your password:</p>
                    <div class="otp-code">${data.otp}</div>
                    <p>This is a 6-digit verification code</p>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Important Security Information:</strong>
                    <ul style="margin-top: 10px; margin-bottom: 0;">
                        <li>This OTP will expire in <span class="expiry">${data.expiryMinutes} minutes</span></li>
                        <li>Never share this code with anyone</li>
                        <li>Our team will never ask for this code</li>
                        <li>If you didn't request this, please secure your account immediately</li>
                    </ul>
                </div>
                
                <p><strong>Steps to reset your password:</strong></p>
                <ol>
                    <li>Enter the 4-digit OTP code shown above</li>
                    <li>Create a new strong password</li>
                    <li>Confirm your new password</li>
                    <li>You'll be redirected to login with your new password</li>
                </ol>
                
            
                <p>Didn't request this password reset?</p>
                <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns. Your account is still secure.</p>
                
                <div class="footer">
                    <p>This is an automated message, please do not reply to this email.</p>
                    <p>&copy; ${new Date().getFullYear()} Smart Medical Box. All rights reserved.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
}else if (template === 'passwordResetSuccess') {
      html = `
        <h1>Password Reset Successful</h1>
        <p>Hello ${data.name},</p>
        <p>Your password has been successfully reset.</p>
        <p>If you didn't perform this action, please contact support immediately.</p>
      `;
    } else if (template === 'healthAlert') {
      html = `
        <h1>Health Alert</h1>
        <p>Hello ${data.name},</p>
        <p>${data.message}</p>
        <p>Time: ${data.time}</p>
        <p>Please check your health dashboard for more details.</p>
      `;
    } else if (template === 'medicineReminder') {
      html = `
        <h1>Medicine Reminder</h1>
        <p>Hello ${data.name},</p>
        <p>It's time to take your medicine:</p>
        <p><strong>${data.medicine}</strong> - ${data.dosage}</p>
        <p>Time: ${data.time}</p>
      `;
    }

    const mailOptions = {
      from: `"Smart Medical Box" <${process.env.EMAIL_USER}>`, // Using EMAIL_USER from env
      to: email,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error };
  }
};

module.exports = { sendEmail };