import FullGamePurchaseDialog from "./FullGamePurchaseDialog";
import { ShopDialog } from "./ShopDialog";
import LeaderboardDialog from "./LeaderboardDialog";
import ShareDialog from "./ShareDialog";
import InviteFriendsFloatingButton from "./InviteFriendsFloatingButton";

export interface WebOnlyDialogsProps {
  shopDialogOpen: boolean;
  setShopDialogOpen: (open: boolean) => void;
  leaderboardDialogOpen: boolean;
  setLeaderboardDialogOpen: (open: boolean) => void;
  fullGamePurchaseDialogOpen: boolean;
  setFullGamePurchaseDialogOpen: (open: boolean) => void;
}

/** Shop, leaderboard, share, purchases, invite — bundled only in the web build. */
export default function WebOnlyDialogs({
  shopDialogOpen,
  setShopDialogOpen,
  leaderboardDialogOpen,
  setLeaderboardDialogOpen,
  fullGamePurchaseDialogOpen,
  setFullGamePurchaseDialogOpen,
}: WebOnlyDialogsProps) {
  return (
    <>
      <ShopDialog
        isOpen={shopDialogOpen}
        onClose={() => setShopDialogOpen(false)}
        onOpen={() => setShopDialogOpen(true)}
      />
      <LeaderboardDialog
        isOpen={leaderboardDialogOpen}
        onClose={() => setLeaderboardDialogOpen(false)}
      />
      <ShareDialog />
      <FullGamePurchaseDialog
        isOpen={fullGamePurchaseDialogOpen}
        onClose={() => setFullGamePurchaseDialogOpen(false)}
      />
      <InviteFriendsFloatingButton />
    </>
  );
}
