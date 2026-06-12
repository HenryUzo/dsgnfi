import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import type { AdminSite } from "../../../services/adminSites";

type SwitchSiteConfirmDialogProps = {
  site: AdminSite | null;
  switching: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function SwitchSiteConfirmDialog({
  site,
  switching,
  onOpenChange,
  onConfirm,
}: SwitchSiteConfirmDialogProps) {
  return (
    <Dialog open={Boolean(site)} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#0b0b0b] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Switch working site?</DialogTitle>
          <DialogDescription className="text-white/55">
            You are about to make {site?.name ?? "this site"} the current working site.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer rounded-full border border-white/12 px-4 py-2.5 text-sm text-white/70 transition hover:border-white/35 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={switching}
            className="cursor-pointer rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {switching ? "Switching..." : "Switch site"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
