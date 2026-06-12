import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { cloneProjectContent, type ProjectBlock } from "./blockTypes";
import { readObjectArray, readString, readStringArray } from "./blocks/blockUtils";
import { uploadMedia } from "../../lib/cmsAdmin";

type BlockEditorDrawerProps = {
  open: boolean;
  block: ProjectBlock | null;
  onClose: () => void;
  onSave: (nextBlock: ProjectBlock) => void;
};

export function BlockEditorDrawer({
  open,
  block,
  onClose,
  onSave,
}: BlockEditorDrawerProps) {
  const [draft, setDraft] = useState<ProjectBlock | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (open && block) {
      setDraft(cloneProjectContent(block));
    } else {
      setDraft(null);
    }
  }, [open, block]);

  const title = useMemo(() => {
    if (!draft) return "Edit Block";
    return `${draft.type} block`;
  }, [draft]);

  if (!open || !draft) {
    return null;
  }

  const setStringField = (key: string, value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        data: {
          ...prev.data,
          [key]: value,
        },
      };
    });
  };

  const save = () => {
    if (!draft) return;
    onSave(draft);
  };

  const handleUpload = async (
    key: string,
    file: File,
    onSuccess: (url: string) => void
  ) => {
    setUploadingKey(key);
    setUploadError(null);
    try {
      const result = await uploadMedia(file);
      onSuccess(result.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setUploadError(message);
    } finally {
      setUploadingKey(null);
    }
  };

  const renderTextInput = (label: string, key: string, multiline = false) => {
    const value = readString(draft.data[key]);
    return (
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest text-white/50">{label}</label>
        {multiline ? (
          <textarea
            rows={4}
            value={value}
            onChange={(event) => setStringField(key, event.target.value)}
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white placeholder:text-white/40 focus:border-white focus:outline-none"
          />
        ) : (
          <input
            value={value}
            onChange={(event) => setStringField(key, event.target.value)}
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white placeholder:text-white/40 focus:border-white focus:outline-none"
          />
        )}
      </div>
    );
  };

  const renderUploadInput = (key: string, accept: string) => (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="file"
        accept={accept}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          await handleUpload(key, file, (url) => setStringField(key, url));
          event.currentTarget.value = "";
        }}
        className="text-xs uppercase tracking-widest text-white/60"
      />
      {uploadingKey === key ? (
        <span className="text-xs uppercase tracking-widest text-white/40">
          Uploading...
        </span>
      ) : null}
    </div>
  );

  const renderGalleryEditor = () => {
    const images = readStringArray(draft.data.images);
    return (
      <div className="space-y-3">
        {renderTextInput("Caption", "caption", true)}
        <p className="text-xs uppercase tracking-widest text-white/50">Images</p>
        {images.map((url, index) => (
          <div key={`${index}`} className="flex items-center gap-2">
            <input
              value={url}
              onChange={(event) => {
                const next = [...images];
                next[index] = event.target.value;
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        data: { ...prev.data, images: next },
                      }
                    : prev
                );
              }}
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white placeholder:text-white/40 focus:border-white focus:outline-none"
              placeholder="https://..."
            />
            <input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                await handleUpload(`gallery-${index}`, file, (uploadUrl) => {
                  const next = [...images];
                  next[index] = uploadUrl;
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          data: { ...prev.data, images: next },
                        }
                      : prev
                  );
                });
                event.currentTarget.value = "";
              }}
              className="text-xs uppercase tracking-widest text-white/60"
            />
            <button
              type="button"
              onClick={() => {
                const next = images.filter((_, i) => i !== index);
                setDraft((prev) =>
                  prev ? { ...prev, data: { ...prev.data, images: next } } : prev
                );
              }}
              className="rounded-full border border-red-400/40 px-3 py-1 text-xs uppercase tracking-widest text-red-200"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            setDraft((prev) =>
              prev
                ? { ...prev, data: { ...prev.data, images: [...images, ""] } }
                : prev
            );
          }}
          className="text-xs uppercase tracking-widest text-white/70 hover:text-white"
        >
          + Add Image
        </button>
      </div>
    );
  };

  const renderStringListEditor = (label: string, key: string) => {
    const items = readStringArray(draft.data[key]);
    return (
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-white/50">{label}</p>
        {items.map((item, index) => (
          <div key={`${index}`} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(event) => {
                const next = [...items];
                next[index] = event.target.value;
                setDraft((prev) =>
                  prev ? { ...prev, data: { ...prev.data, [key]: next } } : prev
                );
              }}
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
            />
            <button
              type="button"
              onClick={() => {
                const next = items.filter((_, i) => i !== index);
                setDraft((prev) =>
                  prev ? { ...prev, data: { ...prev.data, [key]: next } } : prev
                );
              }}
              className="rounded-full border border-red-400/40 px-3 py-1 text-xs uppercase tracking-widest text-red-200"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            setDraft((prev) =>
              prev
                ? { ...prev, data: { ...prev.data, [key]: [...items, ""] } }
                : prev
            );
          }}
          className="text-xs uppercase tracking-widest text-white/70 hover:text-white"
        >
          + Add Item
        </button>
      </div>
    );
  };

  const renderStepsEditor = () => {
    const steps = readObjectArray<{
      number?: string;
      title?: string;
      description?: string;
      deliverables?: string[];
    }>(draft.data.steps);

    return (
      <div className="space-y-4">
        {renderTextInput("Heading", "heading")}
        <p className="text-xs uppercase tracking-widest text-white/50">Steps</p>
        {steps.map((step, index) => (
          <div key={`${index}`} className="space-y-3 rounded-xl border border-white/10 p-4">
            <div className="grid gap-2 md:grid-cols-3">
              <input
                value={readString(step.number)}
                onChange={(event) => {
                  const next = steps.map((entry, i) =>
                    i === index ? { ...entry, number: event.target.value } : entry
                  );
                  setDraft((prev) =>
                    prev ? { ...prev, data: { ...prev.data, steps: next } } : prev
                  );
                }}
                className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                placeholder="01"
              />
              <input
                value={readString(step.title)}
                onChange={(event) => {
                  const next = steps.map((entry, i) =>
                    i === index ? { ...entry, title: event.target.value } : entry
                  );
                  setDraft((prev) =>
                    prev ? { ...prev, data: { ...prev.data, steps: next } } : prev
                  );
                }}
                className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                placeholder="Step title"
              />
              <button
                type="button"
                onClick={() => {
                  const next = steps.filter((_, i) => i !== index);
                  setDraft((prev) =>
                    prev ? { ...prev, data: { ...prev.data, steps: next } } : prev
                  );
                }}
                className="rounded-full border border-red-400/40 px-3 py-1 text-xs uppercase tracking-widest text-red-200"
              >
                Remove
              </button>
            </div>
            <textarea
              rows={3}
              value={readString(step.description)}
              onChange={(event) => {
                const next = steps.map((entry, i) =>
                  i === index ? { ...entry, description: event.target.value } : entry
                );
                setDraft((prev) =>
                  prev ? { ...prev, data: { ...prev.data, steps: next } } : prev
                );
              }}
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
              placeholder="Description"
            />
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-white/50">Deliverables</p>
              {(readStringArray(step.deliverables) ?? []).map((deliverable, dIndex) => (
                <div key={`${index}-${dIndex}`} className="flex items-center gap-2">
                  <input
                    value={deliverable}
                    onChange={(event) => {
                      const deliverables = readStringArray(step.deliverables);
                      const nextDeliverables = [...deliverables];
                      nextDeliverables[dIndex] = event.target.value;
                      const next = steps.map((entry, i) =>
                        i === index ? { ...entry, deliverables: nextDeliverables } : entry
                      );
                      setDraft((prev) =>
                        prev ? { ...prev, data: { ...prev.data, steps: next } } : prev
                      );
                    }}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                    placeholder="Deliverable"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const deliverables = readStringArray(step.deliverables);
                      const nextDeliverables = deliverables.filter((_, i) => i !== dIndex);
                      const next = steps.map((entry, i) =>
                        i === index ? { ...entry, deliverables: nextDeliverables } : entry
                      );
                      setDraft((prev) =>
                        prev ? { ...prev, data: { ...prev.data, steps: next } } : prev
                      );
                    }}
                    className="rounded-full border border-red-400/40 px-3 py-1 text-xs uppercase tracking-widest text-red-200"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const deliverables = readStringArray(step.deliverables);
                  const nextDeliverables = [...deliverables, ""];
                  const next = steps.map((entry, i) =>
                    i === index ? { ...entry, deliverables: nextDeliverables } : entry
                  );
                  setDraft((prev) =>
                    prev ? { ...prev, data: { ...prev.data, steps: next } } : prev
                  );
                }}
                className="text-xs uppercase tracking-widest text-white/70 hover:text-white"
              >
                + Add Deliverable
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            setDraft((prev) =>
              prev
                ? {
                    ...prev,
                    data: {
                      ...prev.data,
                      steps: [
                        ...steps,
                        { number: "", title: "", description: "", deliverables: [] },
                      ],
                    },
                  }
                : prev
            );
          }}
          className="text-xs uppercase tracking-widest text-white/70 hover:text-white"
        >
          + Add Step
        </button>
      </div>
    );
  };

  const renderSlidesEditor = () => {
    const slides = readObjectArray<{
      title?: string;
      mainImageUrl?: string;
      peekImageUrl?: string;
    }>(draft.data.slides);

    return (
      <div className="space-y-4">
        {renderTextInput("Heading", "heading")}
        {renderTextInput("Description", "description", true)}
        <p className="text-xs uppercase tracking-widest text-white/50">Slides</p>
        {slides.map((slide, index) => (
          <div key={`${index}`} className="space-y-3 rounded-xl border border-white/10 p-4">
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input
                value={readString(slide.title)}
                onChange={(event) => {
                  const next = slides.map((entry, i) =>
                    i === index ? { ...entry, title: event.target.value } : entry
                  );
                  setDraft((prev) =>
                    prev ? { ...prev, data: { ...prev.data, slides: next } } : prev
                  );
                }}
                className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                placeholder="Slide title"
              />
              <button
                type="button"
                onClick={() => {
                  const next = slides.filter((_, i) => i !== index);
                  setDraft((prev) =>
                    prev ? { ...prev, data: { ...prev.data, slides: next } } : prev
                  );
                }}
                className="rounded-full border border-red-400/40 px-3 py-1 text-xs uppercase tracking-widest text-red-200"
              >
                Remove
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-white/50">
                Main image
              </label>
              <input
                value={readString(slide.mainImageUrl)}
                onChange={(event) => {
                  const next = slides.map((entry, i) =>
                    i === index ? { ...entry, mainImageUrl: event.target.value } : entry
                  );
                  setDraft((prev) =>
                    prev ? { ...prev, data: { ...prev.data, slides: next } } : prev
                  );
                }}
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                placeholder="https://..."
              />
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  await handleUpload(`main-${index}`, file, (url) => {
                    const next = slides.map((entry, i) =>
                      i === index ? { ...entry, mainImageUrl: url } : entry
                    );
                    setDraft((prev) =>
                      prev ? { ...prev, data: { ...prev.data, slides: next } } : prev
                    );
                  });
                  event.currentTarget.value = "";
                }}
                className="text-xs uppercase tracking-widest text-white/60"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-white/50">
                Peek image
              </label>
              <input
                value={readString(slide.peekImageUrl)}
                onChange={(event) => {
                  const next = slides.map((entry, i) =>
                    i === index ? { ...entry, peekImageUrl: event.target.value } : entry
                  );
                  setDraft((prev) =>
                    prev ? { ...prev, data: { ...prev.data, slides: next } } : prev
                  );
                }}
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                placeholder="https://..."
              />
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  await handleUpload(`peek-${index}`, file, (url) => {
                    const next = slides.map((entry, i) =>
                      i === index ? { ...entry, peekImageUrl: url } : entry
                    );
                    setDraft((prev) =>
                      prev ? { ...prev, data: { ...prev.data, slides: next } } : prev
                    );
                  });
                  event.currentTarget.value = "";
                }}
                className="text-xs uppercase tracking-widest text-white/60"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            setDraft((prev) =>
              prev
                ? {
                    ...prev,
                    data: {
                      ...prev.data,
                      slides: [...slides, { title: "", mainImageUrl: "", peekImageUrl: "" }],
                    },
                  }
                : prev
            );
          }}
          className="text-xs uppercase tracking-widest text-white/70 hover:text-white"
        >
          + Add Slide
        </button>
      </div>
    );
  };

  const renderMetricsEditor = () => {
    const items = readObjectArray<{ label?: string; value?: string }>(draft.data.items);
    return (
      <div className="space-y-3">
        {renderTextInput("Title", "title")}
        <p className="text-xs uppercase tracking-widest text-white/50">Metric Items</p>
        {items.map((item, index) => (
          <div key={`${index}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <input
              value={readString(item.label)}
              onChange={(event) => {
                const next = items.map((entry, i) =>
                  i === index ? { ...entry, label: event.target.value } : entry
                );
                setDraft((prev) =>
                  prev ? { ...prev, data: { ...prev.data, items: next } } : prev
                );
              }}
              className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
              placeholder="Label"
            />
            <input
              value={readString(item.value)}
              onChange={(event) => {
                const next = items.map((entry, i) =>
                  i === index ? { ...entry, value: event.target.value } : entry
                );
                setDraft((prev) =>
                  prev ? { ...prev, data: { ...prev.data, items: next } } : prev
                );
              }}
              className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
              placeholder="Value"
            />
            <button
              type="button"
              onClick={() => {
                const next = items.filter((_, i) => i !== index);
                setDraft((prev) =>
                  prev ? { ...prev, data: { ...prev.data, items: next } } : prev
                );
              }}
              className="rounded-full border border-red-400/40 px-3 py-1 text-xs uppercase tracking-widest text-red-200"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            setDraft((prev) =>
              prev
                ? {
                    ...prev,
                    data: {
                      ...prev.data,
                      items: [...items, { label: "", value: "" }],
                    },
                  }
                : prev
            );
          }}
          className="text-xs uppercase tracking-widest text-white/70 hover:text-white"
        >
          + Add Metric
        </button>
      </div>
    );
  };

  const renderTimelineEditor = () => {
    const items = readObjectArray<{ year?: string; title?: string; description?: string }>(
      draft.data.items
    );
    return (
      <div className="space-y-3">
        {renderTextInput("Title", "title")}
        <p className="text-xs uppercase tracking-widest text-white/50">Timeline Items</p>
        {items.map((item, index) => (
          <div key={`${index}`} className="space-y-2 rounded-xl border border-white/10 p-3">
            <input
              value={readString(item.year)}
              onChange={(event) => {
                const next = items.map((entry, i) =>
                  i === index ? { ...entry, year: event.target.value } : entry
                );
                setDraft((prev) =>
                  prev ? { ...prev, data: { ...prev.data, items: next } } : prev
                );
              }}
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
              placeholder="Stage / date"
            />
            <input
              value={readString(item.title)}
              onChange={(event) => {
                const next = items.map((entry, i) =>
                  i === index ? { ...entry, title: event.target.value } : entry
                );
                setDraft((prev) =>
                  prev ? { ...prev, data: { ...prev.data, items: next } } : prev
                );
              }}
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
              placeholder="Title"
            />
            <textarea
              rows={3}
              value={readString(item.description)}
              onChange={(event) => {
                const next = items.map((entry, i) =>
                  i === index ? { ...entry, description: event.target.value } : entry
                );
                setDraft((prev) =>
                  prev ? { ...prev, data: { ...prev.data, items: next } } : prev
                );
              }}
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
              placeholder="Description"
            />
            <button
              type="button"
              onClick={() => {
                const next = items.filter((_, i) => i !== index);
                setDraft((prev) =>
                  prev ? { ...prev, data: { ...prev.data, items: next } } : prev
                );
              }}
              className="rounded-full border border-red-400/40 px-3 py-1 text-xs uppercase tracking-widest text-red-200"
            >
              Remove Item
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            setDraft((prev) =>
              prev
                ? {
                    ...prev,
                    data: {
                      ...prev.data,
                      items: [...items, { year: "", title: "", description: "" }],
                    },
                  }
                : prev
            );
          }}
          className="text-xs uppercase tracking-widest text-white/70 hover:text-white"
        >
          + Add Timeline Item
        </button>
      </div>
    );
  };

  const body = (() => {
    switch (draft.type) {
      case "hero":
        return (
          <div className="space-y-3">
            {renderTextInput("Eyebrow", "eyebrow")}
            {renderTextInput("Headline", "headline", true)}
            {renderTextInput("Subheadline", "subheadline", true)}
            {renderTextInput("Background Image URL", "backgroundImage")}
            {renderUploadInput("backgroundImage", "image/*")}
          </div>
        );
      case "richText":
        return (
          <div className="space-y-3">
            {renderTextInput("Eyebrow", "eyebrow")}
            {renderTextInput("Title", "title")}
            {renderTextInput("Body", "body", true)}
          </div>
        );
      case "quote":
        return (
          <div className="space-y-3">
            {renderTextInput("Quote", "quote", true)}
            {renderTextInput("Author", "author")}
            {renderTextInput("Role", "role")}
          </div>
        );
      case "cta":
        return (
          <div className="space-y-3">
            {renderTextInput("Title", "title", true)}
            {renderTextInput("Description", "description", true)}
            {renderTextInput("Primary Label", "primaryLabel")}
            {renderTextInput("Primary Href", "primaryHref")}
            {renderTextInput("Secondary Label", "secondaryLabel")}
            {renderTextInput("Secondary Href", "secondaryHref")}
          </div>
        );
      case "processHeroAtticSalt":
        return (
          <div className="space-y-3">
            {renderTextInput("Title", "title", true)}
            {renderTextInput("Collage Image URL", "collageImageUrl")}
            {renderUploadInput("collageImageUrl", "image/*")}
            {renderTextInput("Collage Alt Text", "collageAlt")}
          </div>
        );
      case "processMethodIntro":
        return (
          <div className="space-y-3">
            {renderTextInput("Kicker", "kicker")}
            {renderStringListEditor("Paragraphs", "paragraphs")}
          </div>
        );
      case "processStepsAccordion":
        return renderStepsEditor();
      case "processMediaPeekCarousel":
        return renderSlidesEditor();
      case "processCtaOutline":
        return (
          <div className="space-y-3">
            {renderTextInput("Title", "title", true)}
            {renderTextInput("Link Label", "linkLabel")}
            {renderTextInput("Href", "href")}
          </div>
        );
      case "image":
        return (
          <div className="space-y-3">
            {renderTextInput("Image URL", "url")}
            {renderUploadInput("url", "image/*")}
            {renderTextInput("Caption", "caption", true)}
          </div>
        );
      case "video":
        return (
          <div className="space-y-3">
            {renderTextInput("Video URL", "url")}
            {renderUploadInput("url", "video/*")}
            {renderTextInput("Title", "title")}
            {renderTextInput("Caption", "caption", true)}
          </div>
        );
      case "gallery":
        return renderGalleryEditor();
      case "metrics":
        return renderMetricsEditor();
      case "timeline":
        return renderTimelineEditor();
      default:
        return <p className="text-sm text-white/60">No editor configured for this block type.</p>;
    }
  })();

  return (
    <div className="fixed inset-0 z-[130]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-black p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Block Editor</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/80 hover:text-white"
            aria-label="Close editor"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">{body}</div>
        {uploadError ? <p className="mt-4 text-xs text-red-300">{uploadError}</p> : null}

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            className="rounded-full bg-white px-5 py-2 text-xs uppercase tracking-widest text-black hover:bg-white/90"
          >
            Save Block
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-widest text-white hover:border-white"
          >
            Cancel
          </button>
        </div>
      </aside>
    </div>
  );
}

