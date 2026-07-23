import { App, SuggestModal } from "obsidian";
import { match } from "../matcher/matcher";
import { PreparedSnapshot } from "../matcher/prepare";
import { Candidate } from "../matcher/types";

/**
 * Disposable tuning harness for the resolver proof (I-003).
 *
 * This is not a shipped surface. It exists so ranking can be judged against a
 * real vault — every result shows the evidence that produced it, and every
 * query reports how long matching took. I-004 deletes this in favour of the
 * live capture rail.
 *
 * Choosing a result opens the note. It never routes, appends, or writes.
 */
export class ResolverProofModal extends SuggestModal<Candidate> {
  private readonly observations: { query: string; ms: number; top: string }[] = [];

  constructor(
    app: App,
    private readonly snapshot: PreparedSnapshot
  ) {
    super(app);
    this.setPlaceholder("Type a capture as you would write it…");
    this.reportTiming(null);
  }

  getSuggestions(query: string): Candidate[] {
    const started = performance.now();
    const results = match(query, this.snapshot);
    const elapsed = performance.now() - started;

    this.reportTiming(elapsed);
    if (query.trim()) {
      this.observations.push({
        query,
        ms: Number(elapsed.toFixed(2)),
        top: results[0] ? `${results[0].title} (${results[0].strength})` : "—"
      });
    }

    return results;
  }

  renderSuggestion(candidate: Candidate, el: HTMLElement): void {
    el.addClass("margin-proof-result");

    const header = el.createDiv({ cls: "margin-proof-header" });
    header.createSpan({ cls: "margin-proof-title", text: candidate.title });
    header.createSpan({
      cls: `margin-proof-strength margin-proof-strength-${candidate.strength}`,
      text: candidate.strength
    });
    header.createSpan({ cls: "margin-proof-score", text: candidate.score.toFixed(1) });

    const evidence = el.createDiv({ cls: "margin-proof-evidence" });
    for (const item of candidate.evidence) {
      evidence.createSpan({
        cls: "margin-proof-chip",
        text: `${item.detail} · ${item.score.toFixed(1)}`
      });
    }

    el.createDiv({ cls: "margin-proof-path", text: candidate.path });
  }

  onChooseSuggestion(candidate: Candidate): void {
    // Deliberately inert: this harness proves ranking, it does not route.
    void this.app.workspace.openLinkText(candidate.path, "", false);
  }

  onClose(): void {
    super.onClose();
    if (this.observations.length) {
      // The accuracy/latency record for this tuning session. Informal by
      // design — the PRD asks for observations, not a benchmark project.
      console.table(this.observations);
    }
  }

  private reportTiming(elapsed: number | null): void {
    this.setInstructions([
      { command: `${this.snapshot.notes.length} notes`, purpose: "indexed" },
      { command: elapsed === null ? "—" : `${elapsed.toFixed(1)} ms`, purpose: "last query" },
      { command: "Enter", purpose: "open note (never routes)" }
    ]);
  }
}
