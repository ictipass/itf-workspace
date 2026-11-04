"use client";

import Link from "next/link";
import { useRef } from "react";
import { EllipsisVertical, Power, TabletSmartphone, Waypoints } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { activateUserAction, deactivateUserAction } from "./actions";

export function UserActionsMenu({
  userId,
  active,
}: {
  userId: string;
  active: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="icon-sm" variant="outline" aria-label="Open user actions">
          <EllipsisVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/admin/users/${userId}/organization`}>
            <Waypoints className="size-4" />
            Edit organisation
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/admin/users/${userId}/sessions`}>
            <TabletSmartphone className="size-4" />
            Manage sessions
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant={active ? "destructive" : "default"}
          onSelect={(event) => {
            event.preventDefault();
            formRef.current?.requestSubmit();
          }}
        >
          <Power className="size-4" />
          {active ? "Deactivate user" : "Activate user"}
        </DropdownMenuItem>
      </DropdownMenuContent>
      <form ref={formRef} action={active ? deactivateUserAction : activateUserAction} className="hidden">
        <input type="hidden" name="id" value={userId} />
      </form>
    </DropdownMenu>
  );
}
