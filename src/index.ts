import * as SRC from "src-ts";
import * as PromptSync from "prompt-sync";
import { SelectedLeaderboard } from "./types";
const prompt = PromptSync();

function chooseFromList(list: { id: string; name: string; }[], itemName: string)
{
    list.forEach((item, i) => {
        console.log(`${i+1}. ${item.name} (${item.id})`);
    });

    const index = Number(prompt(`Choose a(n) ${itemName} from the above list (index): `));
    console.log();
    if(isNaN(index) || index <= 0 || index > list.length) process.exit(1);

    return list[index-1].id;
}

function getBoardType(game: SRC.Game<"categories.variables,levels">): SRC.CategoryType
{
	const hasFGs = game.categories.data.length !== 0;
	const hasLVs = game.levels.data.length !== 0;

	// can't select a leaderboard if there are none to choose from
	if (!hasFGs && !hasLVs)
		throw new Error("This game has no leaderboards! Aborting.");
	
	// if there are no boards of one type, it must be the other
	if (!hasFGs) return "per-level";
	if (!hasLVs) return "per-game";

	// if there are boards of either type, ask for which, and repeat on invalid input
	while (true)
	{
		const type = prompt("Full-game or level leaderboard? [f/l] ");
		
		if (type !== "f" && type !== "l")
		{
			console.log("Please choose one of \"f\" or \"l\" for full-game or level respectively.");
			continue;
		}

		return type === "f" ? "per-game" : "per-level";
	}
}

export async function getLeaderboardFromUser(asPartial: false): Promise<SelectedLeaderboard>;
export async function getLeaderboardFromUser(asPartial: true): Promise<SRC.LeaderboardPartial>;
export async function getLeaderboardFromUser(asPartial: boolean = false): Promise<SRC.LeaderboardPartial | SelectedLeaderboard>
{
	// fetch game data
    const gameId = prompt("Enter a game id or abbreviation: ") ?? "";
	const game = await SRC.getGame(gameId, { embed: "categories.variables,levels"}, { log: false });

	// currently throws on empty game
	const type = getBoardType(game);

    // get level if applicable
    const levelId = type === "per-level" ? chooseFromList(game.levels.data, "level") : undefined;
	const level = game.levels.data.find(l => l.id === levelId)!;

    // get category
    const categories = SRC.filterCategoriesByType(game.categories.data, type);
    const categoryId = chooseFromList(categories, "category");
	const category = categories.find(c => c.id === categoryId)!;
	
	// get subcategories that are applicable to the chosen category
    const variables = categories.find(c => c.id === categoryId)!.variables.data;
	const subcategories = SRC.filterApplicableVariables(variables, categoryId, levelId).filter(SRC.variableIsSubcategory);

    const subcatValues = subcategories.map(subcat => {
        console.log(`For subcategory ${subcat.name}:`);

        let valueId = chooseFromList(Object.entries(subcat.values.values).map(([id, val]) => ({id, name: val.label})), "value");

        return [ subcat.id, valueId ];
    });

	const partial = {
		game: game.id,
		level: levelId,
		category: categoryId,
		variables: Object.fromEntries(subcatValues)
	};

	if (asPartial) return partial;

	const variableValues = subcatValues.map((sv): [ SRC.Variable, SRC.VariableValue ] => {
		const [ varId, valueId ] = sv;

		const variable = variables.find(v => v.id === varId)!;
		const value = Object.entries(variable.values.values).find(([ id, _ ]) => id === valueId)![1];

		return [ variable, value ];
	});

	const name = SRC.buildLeaderboardNameFromPartial(game, partial);

	return {
		name, game, level, category, variables: variableValues
	};
}