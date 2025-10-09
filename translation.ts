// German
// Specifically German German, since ß exists here.  I didn't see any materials specifically for other dialects.
const deTranslations = new Map<string, string>([
		["sehr klein", "tiny"],
		["klein", "small"],
		["mittelgroß", "medium"],
		["groß", "large"],
		["riesig", "huge"],
		["gigantisch", "gargantuan"],
		["rg", "lg"],
		["ng", "ng"],
		["cg", "cg"],
		["rn", "ln"],
		["n", "n"],
		["cn", "cn"],
		["rb", "le"],
		["nb", "ne"],
		["cb", "ce"],
		["dorf", "village"],
		["kleinstadt", "town"],
		["stadt", "city"],
		["großstadt", "metropolis"],
		["ungewöhnlich", "uncommon"],
		["selten", "rare"],
		["einzigartig", "unique"]
	]);

// Brazilian Portuguese
// Sorry folks from Portugal, but I couldn't find any PF2e material in your dialect
const ptBrTranslations = new Map<string, string>([
		["minúsculo", "tiny"],
		["pequeno", "small"],
		["médio", "medium"],
		["grande", "large"],
		["enorme", "huge"],
		["imenso", "gargantuan"],
		["ob", "lg"],
		["nb", "ng"],
		["cb", "cg"],
		["on", "ln"],
		["nv", "n"],
		["cn", "cn"],
		["om", "le"],
		["nm", "ne"],
		["cm", "ce"],
		["aldeia", "village"],
		["vila", "town"],
		["cidade", "city"],
		["metrópole", "metropolis"],
		["incomum", "uncommon"],
		["raro", "rare"],
		["único", "unique"]
	]);

// Spanish 
// honestly not sure whether Latin American or Castilian, or if there's even a difference with these terms
const esTranslations = new Map<string, string>([
		["diminuto", "tiny"],
		["pequeño", "small"],
		["medio", "medium"],
		["grande", "large"],
		["gigante", "huge"],
		["gargantuesco", "gargantuan"],
		["lb", "lg"],
		["nb", "ng"],
		["cb", "cg"],
		["ln", "ln"],
		["nv", "n"],
		["cn", "cn"],
		["lm", "le"],
		["nm", "ne"],
		["cm", "ce"],
		["aldea", "village"],
		["pueblo", "town"],
		["ciudad", "city"],
		["metrópoli", "metropolis"],
		["poco común", "uncommon"],
		["rara", "rare"],
		["única", "unique"]
	]);

// Russian
const ruTranslations = new Map<string, string>([
		["крошечный", "tiny"],
		["маленький", "small"],
		["средний", "medium"],
		["большой", "large"],
		["огромный", "huge"],
		["исполинский", "gargantuan"],
		["пд", "lg"],
		["нд", "ng"],
		["хд", "cg"],
		["пн", "ln"],
		["н", "n"],
		["хн", "cn"],
		["пз", "le"],
		["нз", "ne"],
		["хз", "ce"],
		["деревня", "village"],
		["город", "town"],
		["крупный город", "city"],
		["мегаполис", "metropolis"],
		["необычный", "uncommon"],
		["редкий", "rare"],
		["уникальный", "unique"]
	]);

// Japanese
const jaTranslations = new Map<string, string>([
		["超小型", "tiny"],
		["小型", "small"],
		["中型", "medium"],
		["大型", "large"],
		["超大型", "huge"],
		["巨大", "gargantuan"],
		["秩序にして善", "lg"],
		["中立にして善", "ng"],
		["混沌にして善", "cg"],
		["秩序にして中立", "ln"],
		["真なる中立", "n"],
		["混沌にして中立", "cn"],
		["秩序にして悪", "le"],
		["中立にして悪", "ne"],
		["混沌にして悪", "ce"],
		["村", "village"],
		["町", "town"],
		["市", "city"],
		["大都市", "metropolis"],
		["アンコモン", "uncommon"],
		["レア", "rare"],
		["ユニーク", "unique"]
	]);

// French
// I don't know whether this adequately covers Quebecois
const frTranslations = new Map<string, string>([
		["très petite", "tiny"],
		["petite", "small"],
		["moyenne", "medium"],
		["grande", "large"],
		["très grande", "huge"],
		["gigantesque", "gargantuan"],
		["lb", "lg"],
		["nb", "ng"],
		["cb", "cg"],
		["ln", "ln"],
		["n", "n"],
		["cn", "cn"],
		["lm", "le"],
		["nm", "ne"],
		["cm", "ce"],
		["village", "village"],
		["ville", "town"],
		["cité", "city"],
		["métropole", "metropolis"],
		["peu courant", "uncommon"],
		["rare", "rare"],
		["unique", "unique"]
	]);

// Polish
const plTranslations = new Map<string, string>([
		["malutki", "tiny"],
		["mały", "small"],
		["średni", "medium"],
		["duży", "large"],
		["wielki", "huge"],
		["ogromny", "gargantuan"],
		["pd", "lg"],
		["nd", "ng"],
		["cd", "cg"],
		["pn", "ln"],
		["n", "n"],
		["cn", "cn"],
		["pz", "le"],
		["nz", "ne"],
		["cz", "ce"],
		["wieś", "village"],
		["miasto", "town"],
		["duże miasto", "city"],
		["metropolia", "metropolis"],
		["niespotykany", "uncommon"],
		["rzadki", "rare"],
		["unikalny", "unique"]
	]);

// Korean
const koTranslations = new Map<string, string>([
		["매우 작은", "tiny"],
		["작은", "small"],
		["중간", "medium"],
		["큰", "large"],
		["거대한", "huge"],
		["매우 거대한", "gargantuan"],
		["질서 선", "lg"],
		["중립 선", "ng"],
		["혼돈 선", "cg"],
		["질서 중립", "ln"],
		["중립", "n"],
		["혼돈 중립", "cn"],
		["질서 악", "le"],
		["중립 악", "ne"],
		["혼돈 악", "ce"],
		["마을", "village"],
		["읍", "town"],
		["도시", "city"],
		["중심지", "metropolis"],
		["드문", "uncommon"],
		["희귀", "rare"],
		["고유", "unique"]
	]);

// Simplified Chinese
const zhTranslations = new Map<string, string>([
		["超小型", "tiny"],
		["小型", "small"],
		["中型", "medium"],
		["大型", "large"],
		["超大型", "huge"],
		["巨型", "gargantuan"],
		["守序 善良", "lg"],
		["中立 善良", "ng"],
		["守序 中立", "cg"],
		["守序 中立", "ln"],
		["中立", "n"],
		["混乱 中立", "cn"],
		["守序 邪恶", "le"],
		["中立 邪恶", "ne"],
		["混乱 邪恶", "ce"],
		["村庄", "village"],
		["镇子", "town"],
		["城市", "city"],
		["大都会", "metropolis"],
		["罕见", "uncommon"],
		["稀有", "rare"],
		["独特", "unique"]
	]);

// Ukrainian
const ukTranslations = new Map<string, string>([
		["крихітний", "tiny"],
		["маленький", "small"],
		["середній", "medium"],
		["великий", "large"],
		["величезний", "huge"],
		["гаргантюан", "gargantuan"],
		["зд", "lg"],
		["нд", "ng"],
		["хд", "cg"],
		["зн", "ln"],
		["н", "n"],
		["хн", "cn"],
		["зз", "le"],
		["нз", "ne"],
		["хз", "ce"],
		["село", "village"],
		["місто", "town"],
		["велике місто", "city"],
		["мегаполіс", "metropolis"],
		["нечастий", "uncommon"],
		["рідкісний", "rare"],
		["унікальний", "unique"]
	]);

const translationTable = new Map<string, Map<string, string> >([
		["de", deTranslations],
		["pt-br", ptBrTranslations],
		["es", esTranslations],
		["ru", ruTranslations],
		["ja", jaTranslations],
		["fr", frTranslations],
		["pl", plTranslations],
		["ko", koTranslations],
		["zh", zhTranslations],
		["uk", ukTranslations]
	]);

export function getTraitTranslationKey(originalTrait: string, overrideLocale: string | null): string {
	let locale: string | null = window.localStorage.getItem('language');
	
	if (overrideLocale != null) {
		if (overrideLocale === "en") {
			return originalTrait;
		}
		
		locale = overrideLocale;
	}
	
	if (locale == null || !translationTable.has(locale)) {
		return originalTrait;
	}

	const translationsForLocale = translationTable.get(locale);
	if (translationsForLocale.has(originalTrait)) {
		return translationsForLocale.get(originalTrait);
	} else {
		return "";
	}
}