import { createTransport, Transporter, TransportOptions } from "nodemailer";

import { getActivationTemplate } from "#mailer/activation.template.js";
import { getPasswordResetEmailTemplate } from "#mailer/reset.template.js";
import { getSignupEmailTemplate } from "#mailer/signup.template.js";
import { ENV } from "#utils/envParser.js";

export class MailerService {
  private readonly fromAddress: string;
  private transporter!: Transporter;

  constructor() {
    // Production SMTP setup
    this.transporter = createTransport({
      auth: {
        pass: ENV.SMTP_PASSWORD ?? "",
        user: ENV.SMTP_USER ?? "",
      },
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT ?? 465,
      secure: true,
      tls: {
        rejectUnauthorized: true,
      },
    } as TransportOptions);
    this.fromAddress = process.env.SMTP_FROM ?? "bolao@omegafox.me";

    // Add email template precompilation
    this.precompileTemplates();

    // Add connection testing
    void this.testConnection();
  }

  async sendActivationEmail(to: string, nickname: string) {
    if (!process.env.BASE_URL) {
      throw new Error("BASE_URL is not defined in environment variables");
    }

    await this.transporter.sendMail({
      from: this.fromAddress,
      html: getActivationTemplate(nickname),
      subject: "[BolaoCopa2026] Sua conta foi ativada!",
      to,
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string) {
    if (!process.env.BASE_URL) {
      throw new Error("BASE_URL is not defined in environment variables");
    }

    const resetUrl = `${process.env.BASE_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(to)}`;

    await this.transporter.sendMail({
      from: this.fromAddress,
      html: getPasswordResetEmailTemplate(resetUrl),
      subject: "[BolaoCopa2026] Redefinir sua senha",
      to,
    });
  }

  async sendSignupEmail(to: string, nickname: string) {
    if (!process.env.BASE_URL) {
      throw new Error("BASE_URL is not defined in environment variables");
    }

    await this.transporter.sendMail({
      from: this.fromAddress,
      html: getSignupEmailTemplate(nickname),
      subject: "[BolaoCopa2026] Bem-vindo ao Bolão da Copa 2026",
      to,
    });
  }

  private precompileTemplates() {
    try {
      // getVerificationEmailTemplate("test", "test"); // Pre-compile by running once
      getPasswordResetEmailTemplate("test"); // Pre-compile by running once
      console.info("Email templates precompiled successfully");
    } catch (error) {
      console.error("Failed to precompile email templates", { error });
    }
  }

  private async testConnection() {
    try {
      await this.transporter.verify();
      console.info("SMTP connection verified");
    } catch (error) {
      console.error("SMTP connection failed", { error });
    }
  }
}
