"use client";

import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface Props {
  inviteCode: string;
}

export function InviteButton({ inviteCode }: Props) {
  const { toast } = useToast();

  function copyInviteLink() {
    const link = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(link).then(() => {
      toast({ title: "Invite link copied!", description: link });
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={copyInviteLink}>
      <Link2 className="h-4 w-4" />
      Invite Members
    </Button>
  );
}
