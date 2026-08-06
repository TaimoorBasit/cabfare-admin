import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { booking } = await req.json();

    const smtpEmail = process.env.SMTP_EMAIL || process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    console.log('[send-customer-quote] SMTP_EMAIL present:', !!smtpEmail);
    console.log('[send-customer-quote] SMTP_PASS present:', !!smtpPass);
    console.log('[send-customer-quote] Booking ID:', booking?.id);
    console.log('[send-customer-quote] Customer email:', booking?.customer?.email);

    if (!smtpEmail || !smtpPass) {
      console.error('[send-customer-quote] SMTP credentials missing in environment variables.');
      return NextResponse.json({ error: 'Email configuration missing' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: smtpEmail.replace(/"/g, ''),
        pass: smtpPass.replace(/"/g, ''),
      },
    });

    const fromAddress = smtpEmail.replace(/"/g, '');
    const toEmail = booking?.customer?.email;

    if (!toEmail) {
      return NextResponse.json({ error: 'Customer email is missing' }, { status: 400 });
    }

    const fare = booking.quote?.result?.finalPrice || booking.quote?.result?.finalFare || 0;
    const currency = '£';

    const subject = `Your Quotation from Carolean Coaches (${booking.id})`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #1e293b;">Your Quotation Request</h2>
        <p>Dear ${booking.customer?.name},</p>
        <p>Thank you for requesting a quotation. Here are the details for your upcoming journey:</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 10px;"><strong>Reference:</strong> ${booking.id}</li>
            <li style="margin-bottom: 10px;"><strong>Pickup:</strong> ${booking.journey?.origin}</li>
            <li style="margin-bottom: 10px;"><strong>Drop-off:</strong> ${booking.journey?.destination}</li>
            <li style="margin-bottom: 10px;"><strong>Date:</strong> ${booking.journey?.departureDate}</li>
            <li style="margin-bottom: 10px;"><strong>Passengers:</strong> ${booking.journey?.passengers}</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Estimated Fare</span><br/>
          <span style="font-size: 32px; font-weight: bold; color: #dc2626;">${currency}${Number(fare).toFixed(2)}</span>
        </div>
        
        <p>If you have any questions or would like to proceed with this booking, please reply to this email or contact our support team.</p>
        <p>Best regards,<br/>Carolean Coaches Team</p>
      </div>
    `;

    await transporter.sendMail({
      from: {
        name: 'Carolean Coaches',
        address: fromAddress
      },
      to: toEmail,
      subject,
      html,
    });

    console.log('[send-customer-quote] Email sent successfully to:', toEmail);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to send customer quote:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
