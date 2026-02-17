import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";

const PRODUCT_HUNT_URL = "https://www.producthunt.com/products/a-dark-cave?launch=a-dark-cave";
const PRODUCT_HUNT_LOGO_URL = "https://ph-static.imgix.net/logo_PH.svg";

interface ProductHuntDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductHuntDialog({
  isOpen,
  onClose,
}: ProductHuntDialogProps) {
  const { setProductHuntDialogOpen } = useGameStore();

  const handleProductHuntClick = () => {
    setProductHuntDialogOpen(false);
    window.open(PRODUCT_HUNT_URL, "_blank", "noopener,noreferrer");
  };

  const handleClose = () => {
    setProductHuntDialogOpen(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[95vw] sm:max-w-md z-[70]">
        <DialogHeader>
          <DialogTitle>I launched on Product Hunt!</DialogTitle>
          <DialogDescription className="py-2 space-y-3">
            <p>
              I just launched A Dark Cave on Product Hunt. If you&apos;re enjoying the game, I would be very happy about an upvote or a nice comment. Thanky you! : )
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleProductHuntClick}
            className="w-full font-medium bg-[#da552f] hover:bg-[#c44d2a] text-white"
          >
            <img
              src={PRODUCT_HUNT_LOGO_URL}
              alt=""
              className="w-5 h-5 mr-2 brightness-0 invert"
              aria-hidden
            />
            Product Hunt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
