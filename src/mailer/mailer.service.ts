import { createTransport, Transporter, TransportOptions } from "nodemailer";

import { getActivationTemplate } from "#mailer/activation.template.js";
import { getPasswordResetEmailTemplate } from "#mailer/reset.template.js";
import { getSignupEmailTemplate } from "#mailer/signup.template.js";
import { getSignupEmailTemplateEn } from "#mailer/signupEn.template.js";
import { ENV } from "#utils/envParser.js";
import { getPasswordResetEmailTemplateEn } from "./resetEn.template";

export class MailerService {
  private readonly fromAddress: string;
  private readonly isProduction = process.env.NODE_ENV === "production";
  private readonly smtpEnabled: boolean;

  private transporter!: Transporter;

  constructor() {
    this.smtpEnabled = !!(ENV.SMTP_HOST && ENV.SMTP_USER && ENV.SMTP_PASSWORD);
    this.fromAddress = process.env.SMTP_FROM ?? "bolao@omegafox.me";

    if (!this.smtpEnabled) {
      console.warn("SMTP not configured — emails will be skipped");
      return;
    }

    this.transporter = createTransport({
      auth: {
        pass: ENV.SMTP_PASSWORD ?? "",
        user: ENV.SMTP_USER ?? "",
      },
      host: ENV.SMTP_HOST ?? null,
      port: ENV.SMTP_PORT ?? 465,
      secure: true,
      tls: {
        rejectUnauthorized: true,
      },
    } as TransportOptions);

    // Add email template precompilation
    this.precompileTemplates();

    // Add connection testing
    void this.testConnection();
  }

  async sendActivationEmail(to: string, nickname: string) {
    if (!this.smtpEnabled) return;

    if (!process.env.BASE_URL) {
      throw new Error("BASE_URL is not defined in environment variables");
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        html: getActivationTemplate(nickname),
        subject: "[BolaoCopa2026] Conta ativada | Account activated",
        to,
      });
    } catch (error) {
      if (this.isProduction) throw error;
      console.warn("sendActivationEmail failed (non-production, skipping)", error);
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string, locale?: string) {
    if (!this.smtpEnabled) return;

    if (!process.env.BASE_URL) {
      throw new Error("BASE_URL is not defined in environment variables");
    }

    const resetUrl = `${process.env.BASE_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(to)}`;

    try {
      const isEn = locale?.toLowerCase().startsWith("en") ?? false;

      await this.transporter.sendMail({
        from: this.fromAddress,
        html: isEn ? getPasswordResetEmailTemplateEn(resetUrl) : getPasswordResetEmailTemplate(resetUrl),
        subject: isEn ? "[BolaoCopa2026] Reset your password" : "[BolaoCopa2026] Redefinir sua senha",
        to,
      });
    } catch (error) {
      if (this.isProduction) throw error;
      console.warn("sendPasswordResetEmail failed (non-production, skipping)", error);
    }
  }

  async sendSignupEmail(to: string, nickname: string, locale?: string) {
    if (!this.smtpEnabled) return;

    if (!process.env.BASE_URL) {
      throw new Error("BASE_URL is not defined in environment variables");
    }

    try {
      const isEn = locale?.toLowerCase().startsWith("en") ?? false;

      await this.transporter.sendMail({
        from: this.fromAddress,
        html: isEn ? getSignupEmailTemplateEn(nickname) : getSignupEmailTemplate(nickname),
        subject: isEn
          ? "[BolaoCopa2026] Welcome to the Bolão da Copa 2026"
          : "[BolaoCopa2026] Bem-vindo ao Bolão da Copa 2026",
        to,
      });
    } catch (error) {
      if (this.isProduction) throw error;
      console.warn("sendSignupEmail failed (non-production, skipping)", error);
    }
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
