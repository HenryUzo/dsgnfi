import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../ui/sheet";
import type { TemplateDetail, TemplateSummary } from "../../../services/adminSites";
import { SelectedTemplateInspector } from "./SelectedTemplateInspector";

type SelectedTemplateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: TemplateSummary | null;
  detail: TemplateDetail | null;
  loading: boolean;
  usageCount: number;
  onUseTemplate: (templateKey: string) => void;
  onCreateCustomCopy: (templateKey: string) => void;
  onViewUsage: () => void;
  onEditCustomTemplate: () => void;
};

export function SelectedTemplateDrawer({
  open,
  onOpenChange,
  summary,
  detail,
  loading,
  usageCount,
  onUseTemplate,
  onCreateCustomCopy,
  onViewUsage,
  onEditCustomTemplate,
}: SelectedTemplateDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-white/10 bg-[#0b0b0b] text-white sm:max-w-xl">
        <SheetHeader className="border-b border-white/10 p-6">
          <SheetTitle className="text-2xl text-white">
            {summary?.name ?? "Selected template"}
          </SheetTitle>
          <SheetDescription className="text-white/55">
            Inspect defaults, usage, and safe actions.
          </SheetDescription>
        </SheetHeader>
        <SelectedTemplateInspector
          summary={summary}
          detail={detail}
          loading={loading}
          usageCount={usageCount}
          onUseTemplate={onUseTemplate}
          onCreateCustomCopy={onCreateCustomCopy}
          onViewUsage={onViewUsage}
          onEditCustomTemplate={onEditCustomTemplate}
          variant="drawer"
        />
      </SheetContent>
    </Sheet>
  );
}
