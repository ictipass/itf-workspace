import { createWorkspaceEmailClient } from "@/lib/email/resend";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]!);
}

export async function sendWorkspaceSecurityEmail(input: {
  to: string;
  fullName: string;
  subject: string;
  message: string;
}) {
  const { client, configuration } = createWorkspaceEmailClient();
  const { error } = await client.emails.send({
    from: configuration.from,
    to: [input.to],
    subject: input.subject,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>ITF Workspace security notice</h2>
      <p>Dear ${escapeHtml(input.fullName)},</p>
      <p>${escapeHtml(input.message)}</p>
      <p>If you did not initiate or authorize this activity, contact ICT Security immediately.</p>
      <p>Workspace will never ask you to send a password, authenticator code, QR code, setup key or recovery code.</p>
    </div>`,
  });
  if (error) throw new Error(error.message);
}
