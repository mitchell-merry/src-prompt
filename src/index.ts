import * as SRC from "src-ts";
import * as PromptSync from "prompt-sync";
const prompt = PromptSync();

function chooseFromList(list: { id: string; name: string; }[], itemName: string) {
    list.forEach((item, i) => {
        console.log(`${i+1}. ${item.name} (${item.id})`);
    });

    const index = Number(prompt(`Choose a(n) ${itemName} from the above list (index): `));
    console.log();
    if(isNaN(index) || index <= 0 || index > list.length) process.exit(1);

    return list[index-1].id;
}

export async function getLeaderboardFromUser(): Promise<SRC.LeaderboardPartial> {
    const game = prompt("Enter a game id or abbreviation: ") ?? "";

    const type = prompt("Full-game or level leaderboard? [f/l] ") ?? "";
    if(type != 'f' && type != 'l') process.exit(1);

    // get level if applicable
    let level: string | undefined = undefined;
    if(type == 'l') {
        const levels = await SRC.getGameLevels(game);

        level = chooseFromList(levels, "level");
    }

    // get category
    const categories: SRC.Category<"variables">[] = await (level 
		? SRC.getLevelCategories<"variables">(level, { embed: "variables" })
		: SRC.getFullGameCategories<"variables">(game, { embed: "variables" }));

    const category = chooseFromList(categories, "category");
	
    const variables = categories.find(c => c.id === category)?.variables.data ?? [];
	const subcategories = variables.filter(SRC.variableIsSubcategory);

    const subcatValues = Object.fromEntries(subcategories.map(subcat => {
        console.log(`For subcategory ${subcat.name}:`);

        let valueId = chooseFromList(Object.entries(subcat.values.values).map(([id, val]) => ({id, name: val.label})), "value");
        console.log();

        return [ subcat.id, valueId ];
    }));

    return { game, level, category, variables: subcatValues };    
}