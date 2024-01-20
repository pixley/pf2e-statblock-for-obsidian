import { Plugin, MarkdownRenderer } from 'obsidian';
import { WidgetType, EditorView, Decoration, DecorationSet } from '@codemirror/view';
import { syntaxTree, LanguageSupport, Language } from '@codemirror/language'
import { RangeSetBuilder, Extension, StateField, Transaction, Prec } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { MarkdownConfig } from '@lezer/markdown'

function getColorForTraitTag(trait: string): string {
	const traitLower = trait.trim().toLowerCase();

	// all sizes get the same color
	if (traitLower === "tiny" || traitLower === "small" || traitLower === "medium" ||
		traitLower === "large" || traitLower === "huge" || traitLower === "gargantuan") {
		return "var(--size-trait)";
	} else if (traitLower === "uncommon") {
		return "var(--uncommon-trait)";
	} else if (traitLower === "rare") {
		return "var(--rare-trait)";
	} else if (traitLower === "unique") {
		return "var(--unique-trait)";
	}

	return "var(--normal-trait)";
}

// Helper class for the 
class StatBlockCodeBlock {
	codeText: string = "";
	locationInDoc: number = -1;		// offset from the beginning of the document that this block starts
}

// Punctuation is copied directly from @lezer/markdown/markdown.ts because the module doesn't export it
let Punctuation = /[!"#$%&'()*+,\-.\/:;<=>?@\[\\\]^_`{|}~\xA1\u2010-\u2027]/
try { Punctuation = new RegExp("[\\p{Pc}|\\p{Pd}|\\p{Pe}|\\p{Pf}|\\p{Pi}|\\p{Po}|\\p{Ps}]", "u") } catch (_) {}

// implements the "==XXX==" syntax for Markdown highlights (HTML <mark> tags)
const HighlightExtension: MarkdownConfig = {
	defineNodes: [{
		name: "Highlight"
	}, {
		name: "HighlightMark"
	}],
	parseInline: [{
		name: "Highlight",
		parse(cx, next, pos) {
			if (next != 61 /* '=' */ || cx.char(pos + 1) != 61 || cx.char(pos + 2) == 61) return -1;
			let before = cx.slice(pos - 1, pos), after = cx.slice(pos + 2, pos + 3);
			let sBefore = /\s|^$/.test(before), sAfter = /\s|^$/.test(after);
			let pBefore = Punctuation.test(before), pAfter = Punctuation.test(after);
			return cx.addDelimiter({resolve: "Highlight", mark: "HighlightMark"}, pos, pos + 2,
				!sAfter && (!pAfter || sBefore || pBefore),
				!sBefore && (!pBefore || sAfter || pAfter));
		}
	}]
}
const extendedMarkdown: LanguageSupport = markdown({
	base: markdownLanguage,
	extensions: HighlightExtension,
	addKeymap: false
})

// widget that adds in-line action icon for live update
class ActionWidget extends WidgetType {
	actionText: string;
	constructor(inText: string) {
		super();
		this.actionText = inText;
	}

	toDOM(view: EditorView): HTMLElement {
		const div = document.createElement("span");
		div.innerText = this.actionText;
		return div;
	}
}

// ================
// Handles syntax highlighting during writing mode
// ================
const statBlockLiveUpdateField = StateField.define<DecorationSet>({
	create(state): DecorationSet {
		return Decoration.none;
	},
	update(oldState: DecorationSet, transaction: Transaction): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();

		let insideStatBlock: boolean = false;
		let lastLineEnd: number = -1;
		let codeBlocks: Array<StatBlockCodeBlock> = new Array<StatBlockCodeBlock>();

		// Find any text inside a "pf2e-stats" codeblock and collect it
		syntaxTree(transaction.state).iterate({
			enter(node: any): boolean {
				if (node.type.name === "Document") {
					return true;
				}

				const nodeLine: string = transaction.newDoc.sliceString(node.from, node.to);

				if (node.type.name.startsWith("HyperMD-codeblock_HyperMD-codeblock-begin_HyperMD-codeblock-begin-bg_HyperMD-codeblock-bg")) {
					// This is the node that indicates the start of a codeblock
					if (insideStatBlock) {
						console.log("ERROR: code block starting inside a code block???");
						return false;
					} else if (nodeLine === "```pf2e-stats") {
						insideStatBlock = true;
						lastLineEnd = -1;
						const newBlock = new StatBlockCodeBlock();
						codeBlocks.push(newBlock);
						return false;	//the content of the code block isn't a child of this node, but rather siblings
					}
				}

				if (!insideStatBlock) {
					return false;
				}

				if (node.type.name.startsWith("HyperMD-codeblock_HyperMD-codeblock-bg_HyperMD-codeblock-end_HyperMD-codeblock-end-bg")) {
					// This is the node that indicates the end of a codeblock
					insideStatBlock = false;
				} else if (node.type.name.startsWith("hmd-codeblock")) {
					// This node is a line of text inside a codeblock
					let newLines = "";

					if (codeBlocks[codeBlocks.length - 1].locationInDoc < 0) {
						// if this a new codeblock, then we want to save where in the document it started
						codeBlocks[codeBlocks.length - 1].locationInDoc = node.from;
					} else if (lastLineEnd !== -1) {
						// newlines aren't tracked by the syntax tree, but they are in the document, so we need to inject the newlines back in
						newLines = "\n".repeat(node.from - lastLineEnd);
					}

					codeBlocks[codeBlocks.length - 1].codeText += newLines + nodeLine;
					lastLineEnd = node.to;
				}

				return insideStatBlock;
			},
		});

		for (let codeBlock of codeBlocks) {
			const blockStart: number = codeBlock.locationInDoc;
			const blockEnd: number = blockStart + codeBlock.codeText.length;

			// give the whole thing our live statblock class
			builder.add(blockStart, blockEnd, Decoration.mark({
				inclusiveStart: true,
				class: "pf2e-statblock.live"
			}));

			const codeBlockParseTree = extendedMarkdown.language.parser.parse(codeBlock.codeText);
			codeBlockParseTree.iterate({
				enter(node: any): boolean {
					let parsedTag: string = "";
					let allowChildParse: boolean = true;
					switch(node.type.name) {
						case "ATXHeading1": {
							parsedTag = "h1";
							allowChildParse = false;
							break;
						}
						case "ATXHeading2": {
							parsedTag = "h2";
							allowChildParse = false;
							break;
						}
						case "ATXHeading3": {
							parsedTag = "h3";
							allowChildParse = false;
							break;
						}
						case "Paragraph": {
							parsedTag = "p";
							break;
						}
						case "Emphasis": {
							parsedTag = "i";
							break;
						}
						case "StrongEmphasis": {
							parsedTag = "b";
							break;
						}
						case "InlineCode": {
							parsedTag = "code";
							allowChildParse = false;
							// in the context of the node, the actual action text is flanked by "`[" and "]`"
							const actionText = codeBlock.codeText.slice(node.from + 2, node.to - 2);
							builder.add(blockStart + node.to, blockStart + node.to, Decoration.widget({
								widget: new ActionWidget(actionText)
							}))
							break;
						}
						case "Highlight": {
							parsedTag = "mark";
							allowChildParse = false;
							// in the context of the node, the actual trait text is flanked by "=="s
							const traitText: string = codeBlock.codeText.slice(node.from + 2, node.to - 2);
							const traitColor: string = getColorForTraitTag(traitText);
							builder.add(blockStart + node.from, blockStart + node.to, Decoration.mark({
								attributes: {"color": traitColor}
							}));
							break;
						}
						default: {
							return false;
						}
					}
					builder.add(blockStart + node.from, blockStart + node.to, Decoration.mark({
						inclusiveStart: true,
						tagName: parsedTag,
					}));
					return allowChildParse;
				},
			});
		}

		return builder.finish();
	},
	provide(field: StateField<DecorationSet>): Extension {
		return EditorView.decorations.from(field);
	},
});

export default class PF2StatPlugin extends Plugin {
	override async onload() {
		// ============
		// Handles full rendering of the statblock in reading mode
		// ============
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
					const traitColor = getColorForTraitTag(traitTag.innerText);
					traitTag.style.backgroundColor = traitColor;
				}
				
				// overwrite the code block's <pre> parent
				codeblock.parentElement.replaceWith(statblockElement);
			}
		});

		// ensure that the live update applies its styling at highest precedence
		this.registerEditorExtension(Prec.highest(statBlockLiveUpdateField));
	}
}