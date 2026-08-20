import { ShopDialog } from "./ShopDialog";
import LeaderboardDialog from "./LeaderboardDialog";
import InviteFriendsFloatingButton from "./InviteFriendsFloatingButton";
import type { ShopOpenSource } from "@/game/shopOpenSource";

export interface WebOnlyDialogsProps {
  shopDialogOpen: boolean;
  setShopDialogOpen: (open: boolean, source?: ShopOpenSource) => void;
  leaderboardDialogOpen: boolean;
  setLeaderboardDialogOpen: (open: boolean) => void;
}

/** Shop, leaderboard, invite — bundled only in the web build. */
export default function WebOnlyDialogs({
  shopDialogOpen,
  setShopDialogOpen,
  leaderboardDialogOpen,
  setLeaderboardDialogOpen,
}: WebOnlyDialogsProps) {
  return (
    <>
      {shopDialogOpen && (
        <ShopDialog
          isOpen={shopDialogOpen}
          onClose={() => setShopDialogOpen(false)}
          onOpen={() => setShopDialogOpen(true)}
        />
      )}
      {leaderboardDialogOpen && (
        <LeaderboardDialog
          isOpen={leaderboardDialogOpen}
          onClose={() => setLeaderboardDialogOpen(false)}
        />
      )}
      <InviteFriendsFloatingButton />
    </>
  );
}
