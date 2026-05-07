import { resend } from "@/lib/email/resend";

type Params = {
  to: string;
  fullName: string;
  temporaryPassword: string;
};

export async function sendWorkspaceWelcomeEmail({
  to,
  fullName,
  temporaryPassword,
}: Params) {
  const loginUrl = process.env.APP_LOGIN_URL ?? "http://localhost:3000/login";
  const from =
    process.env.RESEND_FROM_EMAIL ??
    "ITF Workspace <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: "Your ITF Workspace Login Details",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Welcome to ITF Workspace</h2>
        <p>Dear ${fullName},</p>
        <p>Your ITF Workspace account has been created.</p>
        <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
        <p><strong>Email:</strong> ${to}</p>
        <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
        <p>You will be required to change this password after your first login.</p>
        <p>Regards,<br/>ITF Workspace</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }
}