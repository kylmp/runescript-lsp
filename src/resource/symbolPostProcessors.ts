import { PostProcessor, RunescriptSymbol } from "../types.js";
import { warn } from "../utils/logger.js";
import { SymbolType } from "./enum/symbolTypes.js";
import { Type } from "./enum/types.js";
import { getSymbolConfig, typeToSymbolType } from "./symbolConfig.js";

/** 
 * Post processors execute after a symbol has been built and define extra work that needs to be done
 * for creating symbols of a certain type
 */

export const coordPostProcessor: PostProcessor = function(symbol: RunescriptSymbol): void {
  const coordinates = symbol.name.split('_');
  const xCoord = (Number(coordinates[1]) << 6) + Number(coordinates[3]);
  const zCoord = (Number(coordinates[2]) << 6) + Number(coordinates[4]);
  symbol.value = `Absolute coordinates: (${xCoord}, ${zCoord})`;
};

export const enumPostProcessor: PostProcessor = function(symbol: RunescriptSymbol): void {
  const inputType = symbol.configLines?.get('inputtype') ?? [];
  const outputType = symbol.configLines?.get('outputtype') ?? [];
  if (inputType.length !== 1 || outputType.length !== 1) {
    warn(`Unable to resolve enum input and/or output type [enum=${symbol.name}, file=${symbol.declaration?.fsPath}`);
    inputType.push(Type.Int);
    outputType.push(Type.Int);
  }
  const outputSymbolType = typeToSymbolType(outputType[0] as Type); 
  symbol.dynamicConfigTypes = new Map<number, SymbolType>([
    [0, typeToSymbolType(inputType[0] as Type)],
    [1, outputSymbolType]
  ]);
  symbol.comparisonTypes = [outputSymbolType];
};

export const gameVarPostProcessor: PostProcessor = function(symbol: RunescriptSymbol): void {
  const type = ((symbol.configLines?.get('type') ?? ['int'])[0] ?? 'int') as Type; // default value is int if not defined
  symbol.comparisonTypes = [typeToSymbolType(type)];
};

export const paramPostProcessor: PostProcessor = function(symbol: RunescriptSymbol): void {
  const symbolType = typeToSymbolType(((symbol.configLines?.get('type') ?? ['int'])[0] ?? 'int') as Type); // default value is int if not defined
  symbol.dynamicConfigTypes = new Map<number, SymbolType>([
    [1, symbolType]
  ]);
  symbol.comparisonTypes = [symbolType];
};

export const categoryPostProcessor: PostProcessor = function(symbol: RunescriptSymbol): void {
  const extraData = symbol.extraData;
  if (extraData && extraData.symbolType) {
    symbol.value = `This script applies to all **${extraData.symbolType}**`;
    if (extraData.categoryName) symbol.value += ` with \`category=${extraData.categoryName}\``;
  }
};

export const componentPostProcessor: PostProcessor = function(symbol: RunescriptSymbol): void {
  symbol.info = `A component of the **${symbol.qualifier}** interface`;
};

export const columnPostProcessor: PostProcessor = function(symbol: RunescriptSymbol): void {
  symbol.info = `A column of the **${symbol.qualifier}** table`;

  let valueIndex = 1;
  const columnTypes: string[] = symbol.extraData?.columnTypes ?? [];
  const dynamicConfigTypes = new Map<number, SymbolType>();
  for (const ct of columnTypes) {
    dynamicConfigTypes.set(valueIndex++, typeToSymbolType(ct as Type));
  }
  symbol.dynamicConfigTypes = dynamicConfigTypes;
  symbol.block = `Column types: ${columnTypes.join(', ')}`;
  delete symbol.extraData;
};

export const fileNamePostProcessor: PostProcessor = function(symbol: RunescriptSymbol): void {
  symbol.info = `Refers to the file **${symbol.name}.${getSymbolConfig(symbol.symbolType).fileTypes![0] ?? 'rs2'}**`;
};
