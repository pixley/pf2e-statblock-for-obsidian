import { Plugin, MarkdownRenderer, MarkdownPostProcessorContext } from 'obsidian';
import { WidgetType, EditorView, Decoration, DecorationSet } from '@codemirror/view';
import { syntaxTree, LanguageSupport, Language } from '@codemirror/language'
import { RangeSetBuilder, Extension, StateField, Transaction, Prec } from '@codemirror/state'
import { parser, MarkdownParser, MarkdownConfig, InlineContext } from '@lezer/markdown'
import { tags } from '@lezer/highlight'

function getClassForTraitTag(trait: string): string {
	const traitLower = trait.trim().toLowerCase();

	// all sizes get the same color
	if (traitLower === "tiny" || traitLower === "small" || traitLower === "medium" ||
		traitLower === "large" || traitLower === "huge" || traitLower === "gargantuan") {
		return "pf2e-statblock-trait-size";
	} else if (traitLower === "uncommon") {
		return "pf2e-statblock-trait-uncommon";
	} else if (traitLower === "rare") {
		return "pf2e-statblock-trait-rare";
	} else if (traitLower === "unique") {
		return "pf2e-statblock-trait-unique";
	}

	return "pf2e-statblock-trait-normal";
}

// Helper class for accumulating the contents of each code block
class StatBlockCodeBlock {
	codeText: string = "";
	locationInDoc: number = -1;		// offset from the beginning of the document that this block starts
}
// Helper class for accumulating decorations to be added to the builder
class DecorationInfo {
	decor: Decoration;
	start: number;
	end: number;

	constructor(inStart: number, inEnd: number, inDecor: Decoration) {
		this.decor = inDecor;
		this.start = inStart;
		this.end = inEnd;
	}
}

// Punctuation is copied directly from @lezer/markdown/markdown.ts because the module doesn't export it, with the addition of \p{Sm} added to cover math symbols, like equals
let Punctuation = /[!"#$%&'()*+,\-.\/:;<=>?@\[\\\]^_`{|}~\xA1\u2010-\u2027]/;
try { Punctuation = new RegExp("[\\p{Pc}|\\p{Pd}|\\p{Pe}|\\p{Pf}|\\p{Pi}|\\p{Po}|\\p{Ps}]\\p{Sm}", "u") } catch (_) {}

// implements the "==XXX==" syntax for Markdown highlights (HTML <mark> tags)
const HighlightDelim = {resolve: "Highlight", mark: "HighlightMark"};
const HighlightExtension: MarkdownConfig = {
	defineNodes: [{
		name: "Highlight",
    	style: {"Highlight/...": tags.heading3}
	}, {
		name: "HighlightMark",
    	style: tags.processingInstruction
	}],
	parseInline: [{
		name: "Highlight",
		parse(cx: InlineContext, next: number, pos: number): number {
			if (next != 61 /* '=' */ || cx.char(pos + 1) != 61 || cx.char(pos + 2) == 61) return -1;
			let before = cx.slice(pos - 1, pos), after = cx.slice(pos + 2, pos + 3);
			let sBefore = /\s|^$/.test(before), sAfter = /\s|^$/.test(after);
			let pBefore = Punctuation.test(before), pAfter = Punctuation.test(after);
			return cx.addDelimiter(HighlightDelim, pos, pos + 2,
				!sAfter && (!pAfter || sBefore || pBefore),
				!sBefore && (!pBefore || sAfter || pAfter));
		},
		before: "Emphasis"
	}],
}
// Packages the highlight extension into a Lezer language
const extendedMarkdown: MarkdownParser = parser.configure(HighlightExtension);

// widget that adds in-line action icon for live update
class ActionWidget extends WidgetType {
	actionText: string;
	constructor(inText: string) {
		super();
		this.actionText = inText;
	}

	toDOM(view: EditorView): HTMLElement {
		const div = document.createElement("span");
		if (this.actionText === "[reaction]" || this.actionText === "[free-action]" || this.actionText == "[one-action]" || this.actionText === "[two-actions]" || this.actionText === "[three-actions]") {
			div.innerText = this.actionText;
			div.className = "pf2e-statblock-live-action";
		} else {
			div.innerText = "???"
			div.className = "pf2e-statblock-live-error";
		}
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
						console.debug("ERROR: code block starting inside a code block???");
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

		let decorationInfos: Array<DecorationInfo> = new Array<DecorationInfo>();

		for (let codeBlock of codeBlocks) {
			const blockStart: number = codeBlock.locationInDoc;
			const blockEnd: number = blockStart + codeBlock.codeText.length;

			/*
			// give the whole thing our live statblock class
			builder.add(blockStart, blockEnd, Decoration.mark({
				inclusiveStart: true,
				class: "pf2e-statblock-live",
				tagName: "div"
			}));
			*/

			const codeBlockParseTree = extendedMarkdown.parse(codeBlock.codeText);
			codeBlockParseTree.iterate({
				enter(node: any): boolean {
					const nodeStart: number = blockStart + node.from;
					const nodeEnd: number = blockStart + node.to;

					let allowChildParse: boolean = true;	// Some nodes really don't need to have styling applied inside, so we won't bother parsing their child nodes.
					let startBias: number = 0;	// Application priority for decorations starting at the same position
					let elementClass: string = "pf2e-statblock-live";
					// apply HTML tags depending on the Markdown syntax
					switch(node.type.name) {
						case "Document": {
							return true;
						}
						case "ATXHeading1": {
							elementClass += "-h1";
							// Allowing child parse here because we could have an action icon here
							break;
						}
						case "ATXHeading2": {
							elementClass += "-h2";
							allowChildParse = false;
							break;
						}
						case "ATXHeading3": {
							elementClass += "-h3";
							allowChildParse = false;
							break;
						}
						case "Paragraph": {
							elementClass += "-p";
							startBias = -1;
							break;
						}
						case "Emphasis": {
							elementClass += "-i";
							startBias = 1;
							break;
						}
						case "StrongEmphasis": {
							elementClass += "-b";
							startBias = 1;
							break;
						}
						case "InlineCode": {
							elementClass += "-actionSource"
							startBias = 2;
							allowChildParse = false;
							// if the code block is too small, then don't bother with it
							if (node.to - node.from < 4) {
								return false;
							}
							// in the context of the node, the actual action text is flanked by "`[" and "]`"
							const actionText = codeBlock.codeText.slice(node.from + 1, node.to - 1);
							// we want to inject an action icon after the code block
							decorationInfos.push(new DecorationInfo(nodeEnd, nodeEnd, Decoration.widget({
								widget: new ActionWidget(actionText)
							})));
							break;
						}
						case "Highlight": {
							elementClass += "-mark";
							startBias = 1;
							allowChildParse = false;
							// in the context of the node, the actual trait text is flanked by "=="s
							const traitText: string = codeBlock.codeText.slice(node.from + 2, node.to - 2);
							const traitColorClass: string = getClassForTraitTag(traitText);
							elementClass += " " + traitColorClass;
							break;
						}
						case "ListItem": {
							elementClass += "-li";
							startBias = -1;
							break;
						}
						case "BulletList": {
							elementClass += "-ul";
							break;
						}
						case "OrderedList": {
							elementClass += "-ol";
							break;
						}
						default: {
							return false;
						}
					}
					try {
						let markDecoration: Decoration = Decoration.mark({
							inclusiveStart: true,
							class: elementClass
						});
						markDecoration.startSide = startBias;
						decorationInfos.push(new DecorationInfo(nodeStart, nodeEnd, markDecoration));
					} catch (error) {
						console.debug("Error adding decoration for node type " + node.type.name);
						console.error(error);
					}
					return allowChildParse;
				},
			});
		}

		// RangeSetBuilder requires that Decorations be added in-order,
		// but ensuring that sorting happens ahead of time is too much of a hassle,
		// so that's why we used the decorationInfos array, and now we're sorting.
		decorationInfos.sort((a: DecorationInfo, b: DecorationInfo) => {
			if (a.start < b.start) {
				return -1;
			} else if (a.start > b.start) {
				return 1;
			} else if (a.decor.startSide <= b.decor.startSide) {
				return -1
			} else {
				return 1;
			}
		});

		const builder = new RangeSetBuilder<Decoration>();
		for (let decorationInfo of decorationInfos) {
			console.debug("Decoration for \"" + transaction.newDoc.sliceString(decorationInfo.start, decorationInfo.end) + "\" added: " + JSON.stringify(decorationInfo.decor.spec));
			builder.add(decorationInfo.start, decorationInfo.end, decorationInfo.decor);
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
		this.registerMarkdownCodeBlockProcessor("pf2e-stats",
			(source: string, element: HTMLElement, context: MarkdownPostProcessorContext) => {
				const statblockElement: HTMLElement = element.createEl("div", { cls: "pf2e-statblock" });
				// parse the markdown inside this codeblock
				MarkdownRenderer.render(this.app, source, statblockElement, context.sourcePath, this);
				
				// apply special coloration to special trait tags
				// these colors are captured directly from official PDFs
				const traitTags: HTMLCollection = statblockElement.getElementsByTagName("mark");
				for (let i = 0; i < traitTags.length; i++) {
					const traitTag: HTMLElement = traitTags[i] as HTMLElement;
					const traitColorClass: string = getClassForTraitTag(traitTag.innerText);
					traitTag.classList.add(traitColorClass, "pf2e-statblock")
				}

				// In edit mode, prevent the code-edit button from messing with the layout
				if (element.parentElement !== null && element.parentElement.classList.contains("cm-preview-code-block")) {
					statblockElement.classList.add("pf2e-statblock-edit");
				}
			}
		);

		// ensure that the live update applies its styling at highest precedence
		this.registerEditorExtension(Prec.highest(statBlockLiveUpdateField));
	}
}