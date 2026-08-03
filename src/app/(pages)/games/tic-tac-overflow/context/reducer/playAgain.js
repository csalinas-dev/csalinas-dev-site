import { cloneDeep } from "lodash";

import { defaultState } from "..";

export const playAgain = () => cloneDeep(defaultState);
