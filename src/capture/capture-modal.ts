import { App, Modal, Platform } from "obsidian";

/**
 * The capture box shell.
 *
 * v1 of this modal does one thing: take text and hand it to Quick Dump. Later
 * slices extend it with the suggestion rail and the routing verbs, so the
 * submit path is kept behind a callback rather than wired to the vault here.
 */
export class CaptureModal extends Modal {
  private textarea: HTMLTextAreaElement;
  private submitting = false;

  constructor(
    app: App,
    /** Resolves true when the text is safely written; false leaves the box open. */
    private readonly onDump: (text: string) => Promise<boolean>
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl, modalEl } = this;
    modalEl.addClass("margin-capture-modal");
    contentEl.empty();

    this.textarea = contentEl.createEl("textarea", {
      cls: "margin-capture-input",
      attr: {
        placeholder: "Capture a thought…",
        rows: "4",
        "aria-label": "Capture text"
      }
    });

    this.textarea.addEventListener("keydown", (event) => {
      // Shift+Enter is a line break. Enter dumps — except on mobile, where the
      // keyboard has no Shift so Enter must stay a line break (the Save button
      // submits), and mid-IME-composition, where Enter is committing a
      // character, not submitting.
      if (Platform.isMobile) return;
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
      event.preventDefault();
      void this.submit();
    });

    const footer = contentEl.createDiv({ cls: "margin-capture-footer" });
    footer.createSpan({
      cls: "margin-capture-hint",
      text: Platform.isMobile ? "" : "Enter to save · Shift+Enter for a new line"
    });

    const dumpButton = footer.createEl("button", {
      cls: "mod-cta",
      text: "Save"
    });
    dumpButton.addEventListener("click", () => void this.submit());

    this.textarea.focus();
  }

  private async submit(): Promise<void> {
    const text = this.textarea.value;
    if (this.submitting || !text.trim()) return;

    // Close only once the text is on disk. Closing optimistically would throw
    // the capture away on the exact failure the fallback exists to survive.
    this.submitting = true;
    try {
      if (await this.onDump(text)) this.close();
    } finally {
      this.submitting = false;
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
