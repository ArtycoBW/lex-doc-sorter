import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;
  private readonly resendApiKey: string | null;

  constructor(private config: ConfigService) {
    this.resendApiKey = this.config.get<string>('RESEND_API_KEY')?.trim() || null;

    const host = this.config.get<string>('SMTP_HOST');
    if (!this.resendApiKey && host) {
      const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
      const user = this.config.get<string>('SMTP_USER');
      const pass = this.config.get<string>('SMTP_PASS');

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      });
    }
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const from =
      this.config.get<string>('EMAIL_FROM') ||
      this.config.get<string>('SMTP_USER') ||
      'Lex-Doc Sorter <noreply@lex-doc.local>';
    const subject =
      this.config.get<string>('EMAIL_SUBJECT') ||
      'Код доступа к Lex-Doc Sorter';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto; padding: 32px; color: #0f172a;">
        <h2 style="margin: 0 0 16px; color: #1d4ed8;">Lex-Doc Sorter</h2>
        <p style="margin: 0 0 12px;">Код доступа к сервису Lex-Doc Sorter:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin: 16px 0;">
          ${code}
        </div>
        <p style="margin: 0; color: #64748b; font-size: 14px;">Код действует 5 минут.</p>
      </div>
    `;

    if (this.resendApiKey) {
      await this.sendWithResend({ from, to: email, subject, html });
      return;
    }

    if (!this.transporter) {
      throw new Error('Email provider is not configured');
    }

    await this.transporter.sendMail({
      from,
      to: email,
      subject,
      html,
    });
  }

  private async sendWithResend(message: {
    from: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.resendApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'lex-doc-sorter/1.0',
      },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Resend API failed (${response.status}): ${details}`);
    }
  }
}
