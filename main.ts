import { Plugin, MarkdownRenderer } from 'obsidian';

export default class PF2StatPlugin extends Plugin {
	async onload() {
		this.registerMarkdownPostProcessor((element, context) => {
			const codeblocks = element.getElementsByTagName("code");
			for (let codeblock of codeblocks) {
				if (codeblock.parentElement === null) {
					// TypeScript actually cares about null-checking.  Nice.
					continue;
				}
			
				if (codeblock.className !== "language-pf2e-stats") {
					// don't mess with codeblocks without our header
					continue;
				}
				
				// remove the code copy button
				if (codeblock.nextSibling !== null) {
					codeblock.nextSibling.remove();
				}
		
				const text = codeblock.innerText.trim();
				const statblockElement = element.createEl("div", { cls: "pf2e-statblock" });
				MarkdownRenderer.render(this.app, text, statblockElement, context.sourcePath, this);
				codeblock.parentElement.replaceWith(statblockElement);
			}
		});
	}
}