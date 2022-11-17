import * as SRC from "src-ts";

export interface SelectedLeaderboard {
	name: string;
	game: SRC.Game<"categories.variables,levels">;
	level?: SRC.Level;
	category: SRC.Category<"variables">;
	variables: [ SRC.Variable, SRC.VariableValue ][];
}