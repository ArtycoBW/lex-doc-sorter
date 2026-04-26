import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');

    if (host) {
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
    if (!this.transporter) {
      throw new Error('SMTP is not configured');
    }

    const from =
      this.config.get<string>('EMAIL_FROM') ||
      this.config.get<string>('SMTP_USER') ||
      'Lex-Doc Sorter <noreply@lex-doc.local>';
    const subject =
      this.config.get<string>('EMAIL_SUBJECT') ||
      'Код доступа к Lex-Doc Sorter';

    await this.transporter.sendMail({
      from,
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto; padding: 32px; color: #0f172a;">
          <h2 style="margin: 0 0 16px; color: #1d4ed8;">Lex-Doc Sorter</h2>
          <p style="margin: 0 0 12px;">Код доступа к сервису Lex-Doc Sorter:</p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin: 16px 0;">
            ${code}
          </div>
          <p style="margin: 0; color: #64748b; font-size: 14px;">Код действует 5 минут.</p>
        </div>
      `,
    });
  }
}
