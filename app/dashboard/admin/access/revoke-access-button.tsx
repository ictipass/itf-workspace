import { revokeAppAccessAction } from "./actions";
import { Button } from "@/components/ui/button";

export default function RevokeAccessButton({
  accessId,
  returnTo,
}: {
  accessId: string;
  returnTo: string;
}) {
  return (
    <form action={revokeAppAccessAction}>
      <input type="hidden" name="accessId" value={accessId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button type="submit" variant="destructive" size="sm">
        Revoke
      </Button>
    </form>
  );
}
