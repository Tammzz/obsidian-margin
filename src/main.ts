import { Plugin } from "obsidian";

/**
 * Margin routes a captured thought to the right note as it is written.
 *
 * This scaffold deliberately registers nothing. Commands, views, settings, and
 * the matcher each arrive with their own slice, so the plugin is loadable and
 * inert at every point in between.
 */
export default class MarginPlugin extends Plugin {
  onload(): void {
    // No commands, views, or settings yet — see prd/001-margin-v1-routing-first-release.md.
  }
}
