import { revokeAppAccessAction } from "./actions";
import { Button } from "@/components/ui/button";

export default function RevokeAccessButton({
  accessId,
}: {
  accessId: string;
}) {
  return (
    <form action={revokeAppAccessAction}>
      <input type="hidden" name="accessId" value={accessId} />
      <Button type="submit" variant="destructive" size="sm">
        Revoke
      </Button>
    </form>
  );
}