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
				// parse the markdown inside this codeblock
				MarkdownRenderer.render(this.app, text, statblockElement, context.sourcePath, this);
				
				// apply special coloration to special trait tags
				// these colors are captured directly from official PDFs
				const traitTags = statblockElement.getElementsByTagName("mark");
				for (let traitTag of traitTags) {
					const traitText = traitTag.innerText.trim().toLowerCase();
					// all sizes get the same color
					if (traitText === "tiny" || traitText === "small" || traitText === "medium" ||
						traitText === "large" || traitText === "huge" || traitText === "gargantuan") {
						traitTag.style.backgroundColor = "#3b7b59";
					} else if (traitText === "uncommon") {
						traitTag.style.backgroundColor = "#98513d";
					} else if (traitText === "rare") {
						traitTag.style.backgroundColor = "#002664";
					} else if (traitText === "unique") {
						traitTag.style.backgroundColor = "#54166e";
					}
				}
				
				// overwrite the code block's <pre> parent
				codeblock.parentElement.replaceWith(statblockElement);
			}
		});
	}
}