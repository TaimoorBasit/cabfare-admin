import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

const escapeHtml = (value: unknown) => String(value || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function POST(request: Request) {
  try {
    const adminToken = request.headers.get('x-admin-token') || '';
    const apiBase = (process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:5000').replace(/\/+$/, '');
    const authResponse = await fetch(`${apiBase}/api/admin/staff`, { headers: { 'X-Admin-Token': adminToken }, cache: 'no-store' });
    if (!authResponse.ok) {
      const authPayload = await authResponse.json().catch(() => ({}));
      return NextResponse.json({ error: authPayload.error || `Staff access check failed (${authResponse.status})` }, { status: authResponse.status });
    }
    const { email, name, link, kind } = await request.json();
    const smtpEmail = (process.env.SMTP_EMAIL || process.env.SMTP_USER || '').replace(/"/g, '');
    const smtpPass = (process.env.SMTP_PASS || '').replace(/"/g, '');
    const smtpFrom = (process.env.SMTP_FROM || '').replace(/"/g, '');
    if (!smtpEmail || !smtpPass) return NextResponse.json({ error: 'Email configuration missing' }, { status: 500 });
    if (!/^\S+@\S+\.\S+$/.test(String(email || '')) || !/^https?:\/\//i.test(String(link || ''))) {
      return NextResponse.json({ error: 'A valid recipient and secure link are required' }, { status: 400 });
    }
    const isReset = kind === 'reset';
    const safeLink = String(link).trim();
    const actionLabel = isReset ? 'Create new password' : 'Set up account';
    const fromAddress = /^\S+@\S+\.\S+$/.test(smtpFrom) ? smtpFrom : smtpEmail;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: smtpEmail, pass: smtpPass }
    });
    await transporter.sendMail({
      from: { name: 'Carolean Coaches', address: fromAddress },
      to: String(email),
      subject: isReset ? 'Reset your Carolean Admin password' : 'Your Carolean Admin invitation',
      text: `Hello ${String(name || '')},\n\n${isReset ? 'An administrator requested a secure password reset for your account.' : 'You have been invited to the Carolean Coaches administration portal.'}\n\n${actionLabel}: ${safeLink}\n\nThis one-time link expires ${isReset ? 'in 1 hour' : 'in 48 hours'}.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;border:1px solid #e2e8f0;border-radius:12px"><h2 style="color:#0D0E48">${isReset ? 'Reset your password' : 'Welcome to Carolean Admin'}</h2><p>Hello ${escapeHtml(name)},</p><p>${isReset ? 'An administrator requested a secure password reset for your account.' : 'You have been invited to the Carolean Coaches administration portal.'}</p><table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0"><tr><td bgcolor="#0D0E48" style="border-radius:8px"><a href="${escapeHtml(safeLink)}" style="display:inline-block;background:#0D0E48;color:#ffffff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${actionLabel}</a></td></tr></table><p style="font-size:12px;color:#64748b">If the button does not open, use this link:<br><a href="${escapeHtml(safeLink)}" style="color:#0D0E48;word-break:break-all">${escapeHtml(safeLink)}</a></p><p style="font-size:12px;color:#64748b">This one-time link expires ${isReset ? 'in 1 hour' : 'in 48 hours'}. If you did not expect this email, you can ignore it.</p></div>`
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to send access email' }, { status: 500 });
  }
}
