import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../ui/sheet";

type TemplateGuidanceDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TemplateGuidanceDrawer({
  open,
  onOpenChange,
}: TemplateGuidanceDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-white/10 bg-[#0b0b0b] text-white sm:max-w-md">
        <SheetHeader className="border-b border-white/10 p-6">
          <SheetTitle className="text-2xl text-white">Template safety rules</SheetTitle>
          <SheetDescription className="text-white/55">
            How presets stay safe for multi-site operations.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-6 text-sm leading-relaxed text-white/62">
          <p>Starter templates are read-only and developer-owned.</p>
          <p>To modify a starter, create a custom copy first.</p>
          <p>Template changes affect future sites. Existing sites keep their current content until an explicit sync flow exists.</p>
          <p>Custom template edits should be reviewed and published as a version before broad reuse.</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
