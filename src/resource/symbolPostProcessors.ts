import { DynamicConfigType, PostProcessor, RunescriptSymbol } from "../types.js";
import { warn } from "../utils/logger.js";
import { Type } from "./enum/types.js";
import { typeToSymbolType } from "./symbolConfig.js";

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
  symbol.dynamicConfigTypes = [
    { symbolType: typeToSymbolType(inputType[0] as Type), valueIndex: 0 },
    { symbolType: outputSymbolType, valueIndex: 1 }
  ];
  symbol.comparisonTypes = [outputSymbolType];
};

export const localVarPostProcessor: PostProcessor = function(symbol: RunescriptSymbol): void {
  symbol.comparisonTypes = [typeToSymbolType(symbol.extraData!.type as Type)];
};

export const gameVarPostProcessor: PostProcessor = function(symbol: RunescriptSymbol): void {
  const type = ((symbol.configLines?.get('type') ?? ['int'])[0] ?? 'int') as Type; // default value is int if not defined
  symbol.comparisonTypes = [typeToSymbolType(type)];
};

export const paramPostProcessor: PostProcessor = function(symbol: RunescriptSymbol): void {
  const symbolType = typeToSymbolType(((symbol.configLines?.get('type') ?? ['int'])[0] ?? 'int') as Type); // default value is int if not defined
  symbol.dynamicConfigTypes = [
    { symbolType: symbolType, valueIndex: 1 }
  ];
  symbol.comparisonTypes = [symbolType];
};

export const configKeyPostProcessor: PostProcessor = function(symbol: RunescriptSymbol): void {
  // const info = matchConfigKeyInfo(symbol.name, symbol.fileType);
  // if (info) {
  //   symbol.info = info.replace(/\$TYPE/g, symbol.fileType);
  // } else {
  //   symbol.hideDisplay = true;
  // }
  symbol.hideDisplay = true;
};

export const triggerPostProcessor: PostProcessor = function(symbol: RunescriptSymbol): void {
  // if (identifier.extraData) {
  //   const info = matchTriggerInfo(identifier.name, identifier.extraData.triggerName);
  //   if (info) identifier.info = info;
  // }
};

export const categoryPostProcessor: PostProcessor = function(symbol: RunescriptSymbol): void {
  const extraData = symbol.extraData;
  if (extraData && extraData.matchId && extraData.categoryName) {
    symbol.value = `This script applies to all **${extraData.matchId}** with \`category=${extraData.categoryName}\``;
  }
};

export const componentPostProcessor: PostProcessor = function(symbol: RunescriptSymbol): void {
  const split = symbol.name.split(':');
  symbol.info = `A component of the **${split[0]}** interface`;
  symbol.name = split[1];
};

export const rowPostProcessor: PostProcessor = function(symbol: RunescriptSymbol): void {
  const tableName = (symbol.configLines?.get('table') ?? [''])[0] ?? '';
  if (tableName === '') {
    warn(`Unable to resolve table name for row ${symbol.name} in ${symbol.declaration?.fsPath}`);
  }
  // Could save all the column names from this if wanted:
  //const dataTypes = symbol.configLines?.get('data') ?? [];
  symbol.info = `A row in the **${tableName}<** table`;
  symbol.extraData = { table: tableName };
};

export const columnPostProcessor: PostProcessor = function(symbol: RunescriptSymbol): void {
  const split = symbol.name.split(':');
  symbol.info = `A column of the **${split[0]}** table`;
  symbol.name = split[1];

  let valueIndex = 1;
  const columnTypes: string[] = symbol.extraData?.columnTypes ?? [];
  const dynamicConfigTypes: DynamicConfigType[] = columnTypes.map(ct => ({ symbolType: typeToSymbolType(ct as Type), valueIndex: valueIndex++ }));

  symbol.dynamicConfigTypes = dynamicConfigTypes;
  symbol.block = `Column types: ${columnTypes.join(', ')}`;
  delete symbol.extraData;
};

export const fileNamePostProcessor: PostProcessor = function(symbol: RunescriptSymbol): void {
  symbol.info = `Refers to the file **${symbol.name}.${symbol.fileType}**`;
};
