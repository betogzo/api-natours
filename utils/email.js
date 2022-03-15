const nodemailer = require('nodemailer');

const sendEmail = async options => {
  //1) create transporter
  const transport = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSW
    }
  });
  //2) set email options
  const mailOptions = {
    from: 'Beto Galeazzo <albertogaleazzo@msn.com>',
    to: options.email,
    subject: options.subject,
    text: options.message
  };

  //3) send email
  await transport.sendMail(mailOptions);
};

module.exports = sendEmail;
