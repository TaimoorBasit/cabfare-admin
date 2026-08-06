const nodemailer = require('nodemailer');

async function test() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'spotifyuser725@gmail.com',
      pass: 'uyvjwmpmliocrcgy'
    }
  });

  try {
    const info = await transporter.sendMail({
      from: { name: 'Carolean Coaches', address: 'spotifyuser725@gmail.com' },
      to: 'spotifyuser725@gmail.com',
      subject: 'SMTP Test - Carolean Coaches',
      text: 'If you receive this, SMTP is working correctly from Node.js!'
    });
    console.log('SUCCESS:', info.messageId);
  } catch (err) {
    console.error('FAILED:', err.message);
    console.error('Code:', err.code);
  }
}

test();
