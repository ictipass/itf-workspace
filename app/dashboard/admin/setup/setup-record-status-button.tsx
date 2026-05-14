import {
  activateSetupRecordAction,
  deactivateSetupRecordAction,
} from "./actions";
import { Button } from "@/components/ui/button";

type Entity = "office" | "department" | "division" | "unit" | "position";

export default function SetupRecordStatusButton({
  id,
  entity,
  isActive,
}: {
  id: string;
  entity: Entity;
  isActive: boolean;
}) {
  return (
    <form action={isActive ? deactivateSetupRecordAction : activateSetupRecordAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="entity" value={entity} />

      <Button
        type="submit"
        size="sm"
        variant={isActive ? "destructive" : "outline"}
      >
        {isActive ? "Deactivate" : "Activate"}
      </Button>
    </form>
  );
}