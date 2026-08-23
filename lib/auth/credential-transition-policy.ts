export function canReplaceTemporaryPassword(input: {
  isTemporaryPassword: boolean;
  authenticationMethods: readonly string[];
}) {
  return (
    input.isTemporaryPassword && input.authenticationMethods.includes("pwd")
  );
}
