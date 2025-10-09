import { Plugin, MarkdownRenderer, MarkdownPostProcessorContext, PluginSettingTab, Setting } from 'obsidian';
import { WidgetType, EditorView, Decoration, DecorationSet } from '@codemirror/view';
import { syntaxTree, LanguageSupport, Language } from '@codemirror/language'
import { RangeSetBuilder, Extension, StateField, Transaction, Prec } from '@codemirror/state'
import { parser, MarkdownParser, MarkdownConfig, InlineContext } from '@lezer/markdown'
import { tags } from '@lezer/highlight'
import { getTraitTranslationKey } from './translation'

// ============
// Helpers
// ============

const traitColorMap = new Map<string, string>([
		["tiny", "pf2e-statblock-trait-size"],
		["small", "pf2e-statblock-trait-size"],
		["medium", "pf2e-statblock-trait-size"],
		["large", "pf2e-statblock-trait-size"],
		["huge", "pf2e-statblock-trait-size"],
		["gargantuan", "pf2e-statblock-trait-size"],
		["lg", "pf2e-statblock-trait-alignment"],
		["ng", "pf2e-statblock-trait-alignment"],
		["cg", "pf2e-statblock-trait-alignment"],
		["ln", "pf2e-statblock-trait-alignment"],
		["n", "pf2e-statblock-trait-alignment"],
		["cn", "pf2e-statblock-trait-alignment"],
		["le", "pf2e-statblock-trait-alignment"],
		["ne", "pf2e-statblock-trait-alignment"],
		["ce", "pf2e-statblock-trait-alignment"],
		["village", "pf2e-statblock-trait-settlement"],
		["town", "pf2e-statblock-trait-settlement"],
		["city", "pf2e-statblock-trait-settlement"],
		["metropolis", "pf2e-statblock-trait-settlement"],
		["uncommon", "pf2e-statblock-trait-uncommon"],
		["rare", "pf2e-statblock-trait-rare"],
		["unique", "pf2e-statblock-trait-unique"]
	]);

function getClassForTraitTag(trait: string, isStarfinder: boolean, overrideLocale: string | null): string {
	const traitLower: string = trait.trim().toLowerCase();

	const traitKey: string = getTraitTranslationKey(traitLower, overrideLocale);
	if (traitColorMap.has(traitKey)) {
		return traitColorMap.get(traitKey);
	} else if (isStarfinder) {
		return "sf2e-statblock-trait-normal";
	} else {
		return "pf2e-statblock-trait-normal";
	}
}

function getIndentationLevel(element: Element): number {
	if (element == null) {
		return 0;
	}

	const startOfIndentationClass: number = element.className.indexOf("pf2e-statblock-indent-");
	if (startOfIndentationClass < 0) {
		// No indentation.
		return 0;
	}

	const levelAsString: string = element.className.charAt(startOfIndentationClass + "pf2e-statblock-indent-".length);
	const levelAsNum: number = Number.parseInt(levelAsString);
	return Number.isNaN(levelAsNum) ? 0 : levelAsNum;
}

function applyIndentation(statblockElement: HTMLElement, rootElement: HTMLElement) {
	// Finds spans with the "pf2e-statblock-tab" class and replaces them with proper indentation
	// This works around the fact that Markdown normally uses indentation to encode code-blocks,
	// which we do not need here.

	const paragraphs: HTMLCollection = statblockElement.getElementsByTagName("p");
	let replacementParagraphs: Array<HTMLElement> = [];
	// Do NOT edit statblockElement inside this loop!  The paragraphs collection is LIVE.
	for (let i: number = 0; i < paragraphs.length; i++) {
		const paragraph: HTMLElement = paragraphs[i] as HTMLElement;
		const childNodes: NodeList = paragraph.childNodes;
		const newParagraph: HTMLElement = rootElement.createEl("div");
		let currentList: HTMLElement = null;

		let currentSubPara: HTMLElement = newParagraph.createEl("p");
		for (let j: number = 0; j < childNodes.length; j++) {
			const childNode: Node = childNodes[j];
			const childElement: Element = childNode as Element;

			if (childNode.nodeName === "#text" && currentSubPara.childNodes.length === 0 &&
				(childElement.textContent === null || childElement.textContent.trim().length === 0)) {
				// Somehow empty text nodes end up places.  I don't want those.
				continue;
			} else if (currentSubPara.childNodes.length === 0) {
				// find how indentation layers we need
				let tabCount: number = 0;
				for (let k: number = j; k < childNodes.length; k++) {
					const testElement: Element = childNodes[k] as Element;
					if (childNodes[k] instanceof Element && testElement.classList.contains("pf2e-statblock-tab")) {
						tabCount++;
					} else {
						// no more leading tabs
						break;
					}
				}

				if (tabCount > 0) {
					if (currentList !== null) {
						// check for indentation changes!
						const currentListIndent: number = getIndentationLevel(currentList);
						if (currentListIndent !== tabCount) {
							// we need a new list with the new indentation level
							currentList = newParagraph.createEl("ul", {cls: `pf2e-statblock-indent-${tabCount}`});
							// transfer the existing list element to the new list
							currentList.appendChild(currentSubPara);
						}
						// The list element controls the indentation, rather than each element having to do so,
						// so if the indentation is the same, then we don't have to do anything.
					} else {
						currentSubPara.classList.add(`pf2e-statblock-indent-${tabCount}`);
					}
					// Don't actually add the tab element to the sub-paragraph.
					// Just advance past the tabs
					j += tabCount - 1;	// the final advance past the tabs will be the loop's j++
					console.debug(`Applied indentation level ${tabCount}`);
					continue;
				}

				// Handle indented unordered lists
				if ((currentSubPara.className.includes("pf2e-statblock-indent") ||
					(currentList !== null && currentList.className.includes("pf2e-statblock-indent"))) &&
					childNode.nodeName === "#text" && childElement.textContent.startsWith("- ")) {
					// Check if we're already in a list
					if (currentSubPara.tagName !== "LI") {
						if (currentList === null) {
							// Create new unordered list and replace the subparagraph
							currentList = newParagraph.createEl("ul", {cls: currentSubPara.className});
							currentSubPara.replaceWith(currentList);
							console.debug("Starting list.")
						}

						currentSubPara = currentList.createEl("li");
					}

					// Bring the text that started the element, minus the dash and initial space
					const textClone: Node = currentSubPara.appendChild(childNode.cloneNode(false));
					textClone.textContent = textClone.textContent.substring(2);
					console.debug(`Cloned text "${textClone.textContent}"`);

					// Since we cloned above, we can proceed to the next node
					continue;
				} else if (currentSubPara.tagName === "LI") {
					// Leave the list
					let replacementPara = newParagraph.createEl("p");
					currentList.removeChild(currentSubPara);
					currentSubPara = replacementPara;
					if (!currentList.hasChildNodes()) {
						// Kill emptied list
						// this shouldn't actually happen, but just in case...
						newParagraph.removeChild(currentList);
					}
					currentList = null;
					console.debug("List terminated.");

					// Need to recover indentation if we had it
					let tabCount: number = 0;
					for (let k: number = j - 1; k >= 0; k--) {
						const testElement: Element = childNodes[k] as Element;
						if (childNodes[k] instanceof Element && testElement.classList.contains("pf2e-statblock-tab")) {
							tabCount++;
						} else {
							// no more leading tabs
							break;
						}
					}

					if (tabCount > 0) {
						currentSubPara.classList.add(`pf2e-statblock-indent-${tabCount}`);
					}
				}

				if (currentSubPara.tagName === "P") {
					if (childNode instanceof Element && childElement.tagName === "STRONG") {
						// Lines that start with bold text have special formatting in statblocks
						// with negative indentation
						currentSubPara.classList.add("pf2e-statblock-subentry");
						console.debug("Start-of-line is bold.");
					} else if (currentSubPara.previousElementSibling != null &&
						currentSubPara.previousElementSibling.tagName === "P" &&
						!currentSubPara.previousElementSibling.classList.contains("pf2e-statblock-subentry") &&
						getIndentationLevel(currentSubPara) === getIndentationLevel(currentSubPara.previousElementSibling)) {
						// Apply first-line indentation styling to consecutive paragraphs of the same level
						currentSubPara.classList.add("pf2e-statblock-2nd-paragraph");
						console.debug("Consecutive paragraph found.");
					}
				}
			} else if (childNode instanceof Element && childElement.tagName === "BR") {
				if (currentList === null) {
					currentSubPara = newParagraph.createEl("p");
					console.debug("Created paragraph from newline.");
				} else {
					currentSubPara = currentList.createEl("li");
					console.debug("Created list element from newline.");
				}
				// don't actually add the line break to either the previous or new sub-paragraph
				continue;
			}

			console.debug(`Cloning node ${childNode.nodeName} with contents: ${childNode.textContent}`);
			currentSubPara.appendChild(childNode.cloneNode(true));
		}

		replacementParagraphs.push(newParagraph);
	}

	// since the list is live, we have to do the replacement here, and we have to go backwards
	for (let i: number = paragraphs.length - 1; i >= 0; i--) {
		paragraphs[i].replaceWith(replacementParagraphs[i]);
	}
}

// Helper class for accumulating the contents of each code block
class StatBlockCodeBlock {
	codeText: string = "";
	locationInDoc: number = -1;		// offset from the beginning of the document that this block starts
	isStarfinder: boolean = false;
	languageOverride: string | null = null;
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
					} else if (nodeLine === "```pf2e-stats" || nodeLine === "```sf2e-stats") {
						insideStatBlock = true;
						lastLineEnd = -1;
						const newBlock = new StatBlockCodeBlock();
						newBlock.isStarfinder = nodeLine === "```sf2e-stats";
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
						case "ATXHeading4": {
							// the actual language code is preceded by "#### ", 5 characters
							codeBlock.languageOverride = codeBlock.codeText.slice(node.from + 5, node.to);
							allowChildParse = false;
							elementClass += "-h4";
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
							const traitColorClass: string = getClassForTraitTag(traitText, codeBlock.isStarfinder, codeBlock.languageOverride);
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

function pf2eStatsCodeBlockProcessor(source: string, element: HTMLElement, context: MarkdownPostProcessorContext, isStarfinder: boolean) {
	// pre-process the string
	// encode tabs, full-width spaces, or substrings of four consecutive normal spaces
	// as proper HTML elements so that they don't get truncated.
	// this breaks indented code blocks inside statblocks, but we don't want/need those anyway
	const tabHtml: string = '<span class="pf2e-statblock-tab">INDENTATION PROCESSING ERROR</span>';
	source = source.replaceAll(/\n(\t| {4}|\u3000)+/ug, (matchingSubstring: string) => {
		return matchingSubstring.replaceAll(/\t| {4}|\u3000/ug, tabHtml);
	});

	const statblockElement: HTMLElement = element.createEl("div", { cls: "pf2e-statblock" });
	// parse the markdown inside this codeblock
	MarkdownRenderer.render(this.app, source, statblockElement, context.sourcePath, this);
	
	// apply language override, if present
	const languageOverrides: HTMLCollection = statblockElement.getElementsByTagName("h4");
	let languageOverride: string | null = null;
	if (languageOverrides.length > 0) {
		languageOverride = languageOverrides[0].innerText;
	}
	
	// apply special coloration to special trait tags
	// these colors are captured directly from official PDFs
	const traitTags: HTMLCollection = statblockElement.getElementsByTagName("mark");
	for (let i: number = 0; i < traitTags.length; i++) {
		const traitTag: HTMLElement = traitTags[i] as HTMLElement;
		const traitColorClass: string = getClassForTraitTag(traitTag.innerText, isStarfinder, languageOverride);
		traitTag.classList.add(traitColorClass);
		
		if (isStarfinder) {
			// Switch the trait color border
			traitTag.classList.add("starfinder-trait");
		}
	}

	// apply special indentation styling for <p> and <ul> elements
	applyIndentation(statblockElement, element);

	// In edit mode, prevent the code-edit button from messing with the layout
	if (element.parentElement != null && element.parentElement.classList.contains("cm-preview-code-block")) {
		statblockElement.classList.add("pf2e-statblock-edit");
	}
}

export default class PF2StatPlugin extends Plugin {
	override async onload() {
		// ============
		// Handles full rendering of the statblock in reading mode
		// ============
		this.registerMarkdownCodeBlockProcessor("pf2e-stats",
			(source: string, element: HTMLElement, context: MarkdownPostProcessorContext) => {
				pf2eStatsCodeBlockProcessor(source, element, context, false);
			}
		);
		
		this.registerMarkdownCodeBlockProcessor("sf2e-stats",
			(source: string, element: HTMLElement, context: MarkdownPostProcessorContext) => {
				pf2eStatsCodeBlockProcessor(source, element, context, true);
			}
		);

		// ensure that the live update applies its styling at highest precedence
		this.registerEditorExtension(Prec.highest(statBlockLiveUpdateField));
	}
}