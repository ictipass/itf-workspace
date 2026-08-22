import { createWorkspaceEmailClient } from "@/lib/email/resend";

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
  const { client, configuration } = createWorkspaceEmailClient();

  const { error } = await client.emails.send({
    from: configuration.from,
    to: [to],
    subject: "Your ITF Workspace Login Details",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Welcome to ITF Workspace</h2>
        <p>Dear ${fullName},</p>
        <p>Your ITF Workspace account has been created.</p>
        <p><strong>Login URL:</strong> <a href="${configuration.loginUrl}">${configuration.loginUrl}</a></p>
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
